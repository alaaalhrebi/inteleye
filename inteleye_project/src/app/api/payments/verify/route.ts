import { isJsonObject } from "@/lib/json-object";
import { paymentAccess, paymentFailure, paymentResponse } from "@/lib/payments/http";
import { isPaymentId } from "@/lib/payments/moyasar";
import { readOrder, verifyPayment } from "@/lib/payments/service";

export async function POST(request: Request) {
  try {
    const { db, client } = await paymentAccess();
    let body: unknown;
    try { body = await request.json(); } catch { return paymentResponse({ message: "بيانات الطلب غير صالحة" }, 400); }
    if (!isJsonObject(body) || !isPaymentId(body.order_id) || !isPaymentId(body.payment_id)) {
      return paymentResponse({ message: "معرّف الطلب أو الدفع غير صالح" }, 400);
    }
    const order = await readOrder(db, body.order_id, client.id);
    return paymentResponse(await verifyPayment(db, order, body.payment_id));
  } catch (error) { return paymentFailure(error); }
}
