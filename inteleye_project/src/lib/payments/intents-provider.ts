import { isJsonObject } from "@/lib/json-object";
import { isPaymentId, PaymentError, requireLivePayments, type VerifiedPayment } from "./moyasar";

export type PaymentIntent = {
  id: string; amount: number; currency: string; callback_url: string;
  status: "created" | "fulfilled" | "canceled"; client_secret: string;
  expires_at: string; server_time: number | null;
};
type Options = { environment?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch };
async function request(path: string, options: Options, body?: unknown) {
  const environment = options.environment ?? process.env;
  requireLivePayments(environment);
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(`https://api.moyasar.com/v1/${path}`, {
      method: body === undefined ? "GET" : "POST", cache: "no-store", redirect: "error",
      signal: AbortSignal.timeout(10000),
      headers: { "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${environment.MOYASAR_SECRET_KEY}:`).toString("base64")}` },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch { throw new PaymentError(503, "PROVIDER_UNAVAILABLE", "تعذر التحقق من الدفع الآن. لم نسمح بمحاولة جديدة"); }
  if (!response.ok) throw new PaymentError(503, "PROVIDER_REJECTED", "تعذر حسم حالة الدفع لدى ميسر. أعد التحقق دون دفع جديد");
  let data: unknown;
  try { data = await response.json(); } catch { data = null; }
  return { data, serverTime: Date.parse(response.headers.get("date") ?? "") };
}
function parseIntent(data: unknown, serverTime: number): PaymentIntent {
  if (!isJsonObject(data) || !isPaymentId(data.id) || !Number.isSafeInteger(data.amount) || Number(data.amount) <= 0 ||
      typeof data.currency !== "string" || typeof data.callback_url !== "string" ||
      !["created", "fulfilled", "canceled"].includes(String(data.status)) ||
      typeof data.client_secret !== "string" || !data.client_secret.startsWith("pi_secret_") ||
      typeof data.expires_at !== "string" || !Number.isFinite(Date.parse(data.expires_at))) {
    throw new PaymentError(502, "INVALID_INTENT_RESPONSE", "استجابة جلسة الدفع غير صالحة");
  }
  return { ...data, server_time: Number.isFinite(serverTime) ? serverTime : null } as PaymentIntent;
}
export async function createLiveIntent(input: {
  amount: number; currency: string; description: string; callback_url: string;
}, options: Options = {}) {
  const result = await request("payment_intents", options, input);
  const intent = parseIntent(result.data, result.serverTime);
  if (intent.status !== "created" || intent.amount !== input.amount || intent.currency !== input.currency ||
      intent.callback_url !== input.callback_url) {
    throw new PaymentError(502, "INTENT_ORDER_MISMATCH", "جلسة الدفع لا تطابق الطلب");
  }
  return intent;
}
export async function fetchLiveIntent(id: string, options: Options = {}) {
  if (!isPaymentId(id)) throw new PaymentError(400, "INVALID_INTENT_ID", "معرّف جلسة الدفع غير صالح");
  const result = await request(`payment_intents/${id}`, options);
  const intent = parseIntent(result.data, result.serverTime);
  if (intent.id !== id) throw new PaymentError(502, "INVALID_INTENT_RESPONSE", "استجابة جلسة الدفع غير صالحة");
  return intent;
}

// Recover a payment whose browser callback/on_completed was lost. Never infer
// failure from an empty list. Scan the provider's pagination before deciding.
export async function findAttemptPayment(orderId: string, attemptId: string, options: Options = {}) {
  if (!isPaymentId(orderId) || !isPaymentId(attemptId)) throw new PaymentError(400, "INVALID_ATTEMPT_ID", "معرّف المحاولة غير صالح");
  let found: string | null = null;
  for (let page = 1; page <= 20; page++) {
    const params = new URLSearchParams({ "metadata[order_id]": orderId, "metadata[attempt_id]": attemptId, page: String(page) });
    const { data } = await request(`payments?${params}`, options);
    if (!isJsonObject(data) || !Array.isArray(data.payments) || !isJsonObject(data.meta)) {
      throw new PaymentError(502, "INVALID_PROVIDER_RESPONSE", "تعذر استعادة عملية الدفع");
    }
    for (const item of data.payments) {
      if (!isJsonObject(item) || !isPaymentId(item.id) || !isJsonObject(item.metadata) ||
          item.metadata.order_id !== orderId || item.metadata.attempt_id !== attemptId) {
        throw new PaymentError(502, "INVALID_PROVIDER_RESPONSE", "تعذر مطابقة عملية الدفع بالمحاولة");
      }
      if (found !== null && found !== item.id) throw new PaymentError(409, "MULTIPLE_ATTEMPT_PAYMENTS", "توجد عمليات تحتاج مراجعة الدعم. لا تدفع مرة أخرى");
      found = item.id;
    }
    if (data.meta.next_page === null) return found;
    if (data.meta.next_page !== page + 1) throw new PaymentError(502, "INVALID_PROVIDER_RESPONSE", "تعذر استعادة عملية الدفع");
  }
  throw new PaymentError(503, "RECOVERY_PENDING", "استعادة عملية الدفع قيد التحقق. لا تدفع مرة أخرى");
}

export function isTerminalFailure(payment: VerifiedPayment) {
  return payment.refunded === 0 && (payment.status === "failed" || payment.status === "voided");
}
