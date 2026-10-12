import { isJsonObject } from "@/lib/json-object";
import { paymentAccess, paymentFailure, paymentResponse } from "@/lib/payments/http";
import { createOrder } from "@/lib/payments/service";

export async function POST(request: Request) {
  try {
    const { db, client } = await paymentAccess();
    let body: unknown;
    try { body = await request.json(); } catch { return paymentResponse({ message: "بيانات الطلب غير صالحة" }, 400); }
    if (!isJsonObject(body)) return paymentResponse({ message: "بيانات الطلب غير صالحة" }, 400);
    const order = await createOrder(db, client, body.plan);
    return paymentResponse({ order_id: order.id, amount: order.amount, currency: order.currency,
      plan: order.target_plan, mode: order.purchase_type, status: order.status }, 201);
  } catch (error) { return paymentFailure(error); }
}
