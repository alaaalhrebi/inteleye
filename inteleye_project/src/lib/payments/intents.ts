import { randomUUID } from "node:crypto";
import { PaymentError, fetchLivePayment } from "./moyasar";
import { createLiveIntent, fetchLiveIntent, findAttemptPayment, isTerminalFailure } from "./intents-provider";
import { readOrder, verifyPayment, type PaymentClient, type PaymentOrder } from "./service";

type Database = ReturnType<typeof import("@/lib/supabase-admin").createPaymentAdmin>;
export type IntentDecision = {
  status: "ready" | "waiting" | "fulfilled" | "review"; message?: string;
  payment_intent?: { id: string; client_secret: string };
  attempt_id?: string;
};
const waiting = (message = "المحاولة السابقة قيد التحقق. لا تبدأ دفعًا جديدًا؛ أعد التحقق بعد قليل"): IntentDecision =>
  ({ status: "waiting", message });
const dependencies = { create: createLiveIntent, fetch: fetchLiveIntent, find: findAttemptPayment, payment: fetchLivePayment };

// A short lease permits recovery of an abandoned *creation*. Its expiration is
// not evidence of payment failure. The CAS below fences old workers, and a
// secret can only be returned after the provider ID has been committed.
export async function resolveIntent(db: Database, original: PaymentOrder, client: PaymentClient,
  origin: string, prepare: boolean, provider = dependencies, now = Date.now()): Promise<IntentDecision> {
  const order = await readOrder(db, original.id, client.id);
  if (order.status === "fulfilled") return { status: "fulfilled" };
  if (order.status !== "pending") return { status: "review", message: "طلب الدفع يحتاج مراجعة الدعم. لا تدفع مرة أخرى" };
  if (order.client_id !== client.id) throw new PaymentError(404, "ORDER_NOT_FOUND", "طلب الدفع غير موجود");
  const snapshot = order as PaymentOrder & { baseline_plan: string | null; baseline_status: string | null; baseline_period_end: string | null };
  if (snapshot.baseline_plan !== client.plan || snapshot.baseline_status !== client.subscription_status ||
      (snapshot.baseline_period_end ? Date.parse(snapshot.baseline_period_end) : null) !==
      (client.current_period_end ? Date.parse(client.current_period_end) : null)) {
    throw new PaymentError(409, "ACCOUNT_CHANGED", "تغير الاشتراك منذ إنشاء الطلب. راجع الدعم قبل الدفع");
  }

  if (order.intent_id) {
    const intent = await provider.fetch(order.intent_id);
    if (intent.amount !== order.amount || intent.currency !== order.currency) {
      throw new PaymentError(409, "INTENT_ORDER_MISMATCH", "جلسة الدفع لا تطابق الطلب. راجع الدعم قبل الدفع");
    }
    if (intent.status === "created") {
      // Provider time + authoritative unused state, not the local clock alone.
      const expired = intent.server_time !== null && intent.server_time >= Date.parse(intent.expires_at);
      if (!expired) return prepare
        ? { status: "ready", payment_intent: { id: intent.id, client_secret: intent.client_secret }, attempt_id: order.intent_generation! }
        : { status: "ready" };
    } else if (intent.status === "fulfilled") {
      const id = await provider.find(order.id, order.intent_generation!);
      if (!id) return waiting("ميسر استقبل المحاولة، ولم يصل معرّف العملية بعد. أعد التحقق دون دفع جديد");
      const payment = await provider.payment(id);
      if (payment.metadata.order_id !== order.id || payment.metadata.attempt_id !== order.intent_generation) {
        throw new PaymentError(403, "PAYMENT_ORDER_MISMATCH", "عملية الدفع لا تخص هذه المحاولة");
      }
      const result = await verifyPayment(db, order, id, async () => payment);
      if (result.status === "fulfilled" || result.status === "review") return { status: result.status, message: result.message };
      if (!isTerminalFailure(payment)) return waiting();
      // A failed/voided payment consumed this single-use intent. All secrets
      // for that intent are now unusable, including those in other tabs.
    }
    if (!prepare) return { status: "ready" };
  } else if (order.intent_generation && order.intent_reserved_at &&
             now - Date.parse(order.intent_reserved_at) < 30000) {
    return waiting("جلسة الدفع قيد التجهيز. أعد التحقق بعد قليل؛ لم نسمح بمحاولة دفع جديدة");
  } else if (!prepare) return { status: "ready" };

  const generation = randomUUID();
  let claim = db.from("payment_orders").update({ intent_generation: generation,
    intent_reserved_at: new Date(now).toISOString(), intent_id: null }).eq("id", order.id).eq("status", "pending");
  claim = order.intent_generation ? claim.eq("intent_generation", order.intent_generation) : claim.is("intent_generation", null);
  claim = order.intent_id ? claim.eq("intent_id", order.intent_id) : claim.is("intent_id", null);
  const { data: claimed, error: claimError } = await claim.select("*").maybeSingle();
  if (claimError) throw new PaymentError(503, "DATABASE_UNAVAILABLE", "تعذر حجز جلسة الدفع. لم نسمح بالتحصيل");
  if (!claimed) return waiting();

  const callback = new URL("/checkout/success", origin);
  callback.search = new URLSearchParams({ order_id: order.id, plan: order.target_plan, mode: order.purchase_type }).toString();
  const intent = await provider.create({ amount: order.amount, currency: order.currency,
    description: `IntelEye ${order.target_plan}`, callback_url: callback.toString() });
  const { data: published, error: publishError } = await db.from("payment_orders").update({ intent_id: intent.id })
    .eq("id", order.id).eq("status", "pending").eq("intent_generation", generation).is("intent_id", null)
    .select("id").maybeSingle();
  if (publishError) throw new PaymentError(503, "INTENT_SAVE_PENDING", "تعذر حفظ جلسة الدفع. لم نرسل إذن التحصيل للمتصفح");
  if (!published) return waiting(); // NEVER expose the secret of an obsolete generation.
  return { status: "ready", payment_intent: { id: intent.id, client_secret: intent.client_secret }, attempt_id: generation };
}
