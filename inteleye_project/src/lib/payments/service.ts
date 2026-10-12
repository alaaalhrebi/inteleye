import { getCheckoutQuote, PLAN_IDS, type PlanId } from "@/lib/plans";
import { getSubscriptionPermissions } from "@/lib/subscription-permissions";
import { fetchLivePayment, PaymentError, type VerifiedPayment } from "./moyasar";

type Database = ReturnType<typeof import("@/lib/supabase-admin").createPaymentAdmin>;
export type PaymentClient = {
  id: number; plan: string | null; subscription_status: string | null;
  current_period_end: string | null; trial_ends_at: string | null;
};
export type PaymentOrder = {
  id: string; client_id: number; target_plan: PlanId; amount: number; currency: string;
  purchase_type: "subscription" | "upgrade"; status: string; expires_at: string;
  intent_generation: string | null; intent_reserved_at: string | null; intent_id: string | null;
  activated_at: string | null; subscription_period_end: string | null;
};

export function quotePayment(client: PaymentClient, plan: unknown) {
  if (typeof plan !== "string" || !PLAN_IDS.includes(plan as PlanId)) {
    throw new PaymentError(400, "INVALID_PLAN", "اختر باقة صحيحة");
  }
  const permissions = getSubscriptionPermissions(client);
  const quote = getCheckoutQuote({ currentPlan: client.plan, targetPlan: plan,
    hasActiveSubscription: permissions.hasActiveSubscription });
  if (quote.mode === "current" || quote.mode === "downgrade") {
    throw new PaymentError(409, "PLAN_NOT_PURCHASABLE", "شراء الباقة الحالية أو التخفيض غير متاح");
  }
  if (quote.mode === "upgrade" && !client.current_period_end) {
    throw new PaymentError(409, "PERIOD_REVIEW_REQUIRED", "تواصل مع الدعم لمراجعة تاريخ الاشتراك قبل الترقية");
  }
  return { target_plan: plan as PlanId, amount: quote.amountHalalas, purchase_type: quote.mode };
}

export async function readOrder(db: Database, id: string, clientId?: number): Promise<PaymentOrder> {
  let query = db.from("payment_orders").select("*").eq("id", id);
  if (clientId !== undefined) query = query.eq("client_id", clientId);
  const { data, error } = await query.maybeSingle();
  if (error) throw new PaymentError(503, "DATABASE_UNAVAILABLE", "تعذر قراءة طلب الدفع الآن");
  if (!data) throw new PaymentError(404, "ORDER_NOT_FOUND", "طلب الدفع غير موجود");
  return data;
}

export async function createOrder(db: Database, client: PaymentClient, plan: unknown,
  fetchPayment: typeof fetchLivePayment = fetchLivePayment) {
  const { data: held, error: holdError } = await db.from("payment_orders").select("*")
    .eq("client_id", client.id).eq("status", "review").limit(1).maybeSingle();
  if (holdError) throw new PaymentError(503, "DATABASE_UNAVAILABLE", "تعذر التحقق من الطلب السابق");
  if (held) return held as PaymentOrder;
  const quote = quotePayment(client, plan);
  const { data: existing, error: readError } = await db.from("payment_orders").select("*")
    .eq("client_id", client.id).eq("status", "pending").maybeSingle();
  if (readError) throw new PaymentError(503, "DATABASE_UNAVAILABLE", "تعذر تجهيز طلب الدفع");
  if (existing) {
    const { data: paid, error } = await db.from("payments").select("id").eq("order_id", existing.id)
      .eq("provider_status", "paid").limit(1).maybeSingle();
    if (error) throw new PaymentError(503, "DATABASE_UNAVAILABLE", "تعذر التحقق من الدفع السابق");
    if (paid) {
      // A stored paid result may predate a cancellation/refund during an
      // activation outage. Re-fetch before the first activation on return.
      await verifyPayment(db, existing, paid.id, fetchPayment);
      return readOrder(db, existing.id, client.id);
    }
    if (existing.baseline_plan !== client.plan || existing.baseline_status !== client.subscription_status ||
        (existing.baseline_period_end ? Date.parse(existing.baseline_period_end) : null) !==
        (client.current_period_end ? Date.parse(client.current_period_end) : null)) {
      throw new PaymentError(409, "ACCOUNT_CHANGED", "تغير الاشتراك منذ إنشاء الطلب. راجع الدعم قبل الدفع");
    }
    // A local timeout must never permit another charge. A different plan
    // can replace an order only before *any* attempt/reservation or payment.
    if (existing.target_plan === quote.target_plan) return existing as PaymentOrder;
    if (existing.intent_generation || existing.intent_id) {
      throw new PaymentError(409, "ORDER_IN_PROGRESS", "يوجد طلب دفع لباقة أخرى قيد المعالجة");
    }
    const previous = await db.from("payments").select("id").eq("order_id", existing.id).limit(1).maybeSingle();
    if (previous.error) throw new PaymentError(503, "DATABASE_UNAVAILABLE", "تعذر التحقق من الطلب السابق");
    if (previous.data) throw new PaymentError(409, "ORDER_IN_PROGRESS", "حسم الدفع السابق مطلوب قبل تغيير الباقة");
    const retired = await db.from("payment_orders").update({ status: "expired" }).eq("id", existing.id)
      .eq("status", "pending").is("intent_generation", null).is("intent_id", null).select("id").maybeSingle();
    if (retired.error || !retired.data) throw new PaymentError(409, "ORDER_IN_PROGRESS", "تغيرت حالة الطلب. أعد التحقق دون دفع");
  }

  const { data, error } = await db.from("payment_orders").insert({ ...quote, client_id: client.id,
    currency: "SAR", environment: "live", baseline_plan: client.plan,
    baseline_status: client.subscription_status, baseline_period_end: client.current_period_end,
  }).select("*").single();
  if (error || !data) throw new PaymentError(error?.code === "23505" ? 409 : 503,
    "ORDER_CREATE_FAILED", "تعذر تجهيز الطلب. أعد المحاولة دون دفع");
  return data as PaymentOrder;
}

export function paymentMatchesOrder(payment: VerifiedPayment, order: PaymentOrder) {
  return payment.metadata.order_id === order.id && payment.amount === order.amount &&
    payment.currency === order.currency && (payment.live === true || payment.live === undefined);
}

export async function applyPayment(db: Database, id: string) {
  const { data, error } = await db.rpc("apply_verified_payment", { p_id: id });
  if (error) throw new PaymentError(503, "ACTIVATION_PENDING", "الدفع محفوظ، والتفعيل قيد المحاولة. لا تدفع مرة أخرى");
  return data as "fulfilled" | "review" | "not_paid";
}

export async function verifyPayment(db: Database, order: PaymentOrder, paymentId: string,
  fetchPayment: typeof fetchLivePayment = fetchLivePayment) {
  const payment = await fetchPayment(paymentId);
  if (payment.metadata.order_id !== order.id) {
    throw new PaymentError(403, "PAYMENT_ORDER_MISMATCH", "عملية الدفع لا تخص هذا الطلب");
  }
  // Store the authoritative result even if the amount/currency is wrong. SQL
  // retains such paid attempts as review records instead of granting access.
  const { error } = await db.rpc("record_verified_payment", { p_id: payment.id,
    p_order_id: order.id, p_amount: payment.amount, p_currency: payment.currency, p_status: payment.refunded > 0 ? "refunded" : payment.status });
  if (error) throw new PaymentError(503, "PAYMENT_RECORD_PENDING", "تعذر حفظ التأكيد الآن. لا تدفع مرة أخرى");
  const status = await applyPayment(db, payment.id);
  return { order_id: order.id, status,
    message: status === "fulfilled" ? "تم تفعيل الاشتراك" : status === "review"
      ? "الدفعة محفوظة وتحتاج مراجعة الدعم. لا تدفع مرة أخرى" : "لم يُؤكد نجاح الدفع بعد" };
}
