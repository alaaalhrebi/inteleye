import { isJsonObject } from "@/lib/json-object";
import { createPaymentAdmin } from "@/lib/supabase-admin";
import { paymentFailure, paymentResponse } from "@/lib/payments/http";
import { isPaymentId, verifyWebhookToken } from "@/lib/payments/moyasar";
import { readOrder, verifyPayment } from "@/lib/payments/service";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return paymentResponse({ message: "إشعار غير صالح" }, 400); }
    if (!isJsonObject(body) || !verifyWebhookToken(body.secret_token, process.env.MOYASAR_WEBHOOK_SECRET)) {
      return paymentResponse({ message: "غير مصرح" }, 401);
    }
    if (body.live !== true) return paymentResponse({ message: "إشعارات الدفع الفعلي فقط" }, 400);
    if (typeof body.type !== "string" || !body.type.startsWith("payment_")) {
      return paymentResponse({ received: true, ignored: true });
    }
    if (!isJsonObject(body.data) || !isPaymentId(body.data.id) ||
        !isJsonObject(body.data.metadata) || !isPaymentId(body.data.metadata.order_id)) {
      return paymentResponse({ message: "إشعار غير صالح" }, 400);
    }
    const db = createPaymentAdmin();
    const order = await readOrder(db, body.data.metadata.order_id);
    // The notification supplies only a lookup hint; API GET supplies the facts.
    return paymentResponse(await verifyPayment(db, order, body.data.id));
  } catch (error) { return paymentFailure(error); }
}
