import { paymentAccess, paymentFailure, paymentResponse } from "@/lib/payments/http";
import { isPaymentId } from "@/lib/payments/moyasar";
import { readOrder } from "@/lib/payments/service";

export async function GET(_request: Request, { params }: { params: { orderId: string } }) {
  try {
    const { db, client } = await paymentAccess();
    if (!isPaymentId(params.orderId)) return paymentResponse({ message: "طلب الدفع غير صالح" }, 400);
    const order = await readOrder(db, params.orderId, client.id);
    // GET reads only. Explicit verification POST performs retries.
    const fields = "id, provider_status, activation_status";
    const paid = await db.from("payments").select(fields).eq("order_id", order.id)
      .eq("provider_status", "paid").order("verified_at", { ascending: false }).limit(1).maybeSingle();
    if (paid.error) return paymentResponse({ message: "تعذر قراءة حالة الدفع" }, 503);
    const { data, error } = paid.data ? paid : await db.from("payments").select(fields)
      .eq("order_id", order.id).order("verified_at", { ascending: false }).limit(1).maybeSingle();
    if (error) return paymentResponse({ message: "تعذر قراءة حالة الدفع" }, 503);
    return paymentResponse({ order_id: order.id, status: order.status, plan: order.target_plan,
      payment_id: data?.id ?? null, payment_status: data?.provider_status ?? null,
      activation_status: data?.activation_status ?? null, period_end: order.subscription_period_end });
  } catch (error) { return paymentFailure(error); }
}
