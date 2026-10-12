import { isJsonObject } from "@/lib/json-object";
import { paymentAccess, paymentFailure, paymentResponse } from "@/lib/payments/http";
import { isPaymentId } from "@/lib/payments/moyasar";
import { readOrder } from "@/lib/payments/service";
import { resolveIntent } from "@/lib/payments/intents";

export async function POST(request: Request, { params }: { params: { orderId: string } }) {
  try {
    const { db, client } = await paymentAccess();
    if (!isPaymentId(params.orderId)) return paymentResponse({ message: "طلب الدفع غير صالح" }, 400);
    let body: unknown;
    try { body = await request.json(); } catch { return paymentResponse({ message: "بيانات الطلب غير صالحة" }, 400); }
    if (!isJsonObject(body) || (body.mode !== "prepare" && body.mode !== "inspect")) {
      return paymentResponse({ message: "بيانات الطلب غير صالحة" }, 400);
    }
    const order = await readOrder(db, params.orderId, client.id);
    return paymentResponse(await resolveIntent(db, order, client, new URL(request.url).origin, body.mode === "prepare"));
  } catch (error) { return paymentFailure(error); }
}
