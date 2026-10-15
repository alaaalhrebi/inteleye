import { isJsonObject } from "@/lib/json-object";
import { isPaymentId, PaymentError, requireLivePayments, type VerifiedPayment } from "./moyasar";

export type PaymentIntent = {
  id: string; amount: number; currency: string; callback_url: string;
  status: "created" | "fulfilled" | "canceled"; client_secret: string;
  expires_at: string; server_time: number | null;
};
type Options = { environment?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch };
type Diagnostic = { operation: "create" | "fetch" | "list"; started: number; http_status: number | null };
// Never log provider messages, request paths, payloads, headers or secrets.
const SAFE_PROVIDER_CODES = new Set([
  "authentication_error", "authorization_error", "validation_error",
  "invalid_request_error", "api_error", "rate_limit_error",
]);
function providerCode(data: unknown) {
  if (!isJsonObject(data)) return "UNKNOWN_PROVIDER_ERROR";
  for (const value of [data.code, data.type, typeof data.error === "string" ? data.error : undefined]) {
    if (typeof value === "string" && SAFE_PROVIDER_CODES.has(value)) return value;
  }
  return "UNKNOWN_PROVIDER_ERROR";
}
function logFailure(trace: Diagnostic, stage: "network" | "http" | "parse" | "validation", errorCode: string,
  providerErrorCode?: string) {
  console.error("payment_intent_provider_failure", {
    operation: trace.operation, stage, http_status: trace.http_status,
    error_code: errorCode, duration_ms: Math.max(0, Math.round(performance.now() - trace.started)),
    ...(providerErrorCode ? { provider_error_code: providerErrorCode } : {}),
  });
}
type ProviderResult = { data: unknown; serverTime: number; trace: Diagnostic; parsed: boolean };
function invalidResponse(result: ProviderResult, code: string, status: number, message: string): never {
  if (result.parsed) logFailure(result.trace, "validation", code);
  throw new PaymentError(status, code, message);
}
async function request(path: string, options: Options, body?: unknown) {
  const environment = options.environment ?? process.env;
  requireLivePayments(environment);
  const trace: Diagnostic = { operation: body !== undefined ? "create" : path.startsWith("payments?") ? "list" : "fetch",
    started: performance.now(), http_status: null };
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(`https://api.moyasar.com/v1/${path}`, {
      method: body === undefined ? "GET" : "POST", cache: "no-store", redirect: "error",
      signal: AbortSignal.timeout(10000),
      headers: { "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${environment.MOYASAR_SECRET_KEY}:`).toString("base64")}` },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    const name = error && typeof error === "object" && "name" in error ? error.name : "";
    logFailure(trace, "network", name === "TimeoutError" ? "TIMEOUT" : name === "AbortError" ? "ABORTED" : "NETWORK_ERROR");
    throw new PaymentError(503, "PROVIDER_UNAVAILABLE", "تعذر التحقق من الدفع الآن. لم نسمح بمحاولة جديدة");
  }
  trace.http_status = response.status;
  if (!response.ok) {
    let rejection: unknown;
    try { rejection = await response.json(); } catch { rejection = null; }
    logFailure(trace, "http", "PROVIDER_REJECTED", providerCode(rejection));
    throw new PaymentError(503, "PROVIDER_REJECTED", "تعذر حسم حالة الدفع لدى ميسر. أعد التحقق دون دفع جديد");
  }
  let data: unknown;
  let parsed = true;
  try { data = await response.json(); } catch {
    data = null; parsed = false; logFailure(trace, "parse", "INVALID_JSON_RESPONSE");
  }
  return { data, parsed, trace, serverTime: Date.parse(response.headers.get("date") ?? "") };
}
function parseIntent(result: ProviderResult): PaymentIntent {
  const { data, serverTime } = result;
  if (!isJsonObject(data) || !isPaymentId(data.id) || !Number.isSafeInteger(data.amount) || Number(data.amount) <= 0 ||
      typeof data.currency !== "string" || typeof data.callback_url !== "string" ||
      !["created", "fulfilled", "canceled"].includes(String(data.status)) ||
      typeof data.client_secret !== "string" || !data.client_secret.startsWith("pi_secret_") ||
      typeof data.expires_at !== "string" || !Number.isFinite(Date.parse(data.expires_at))) {
    invalidResponse(result, "INVALID_INTENT_RESPONSE", 502, "استجابة جلسة الدفع غير صالحة");
  }
  return { ...data, server_time: Number.isFinite(serverTime) ? serverTime : null } as PaymentIntent;
}
export async function createLiveIntent(input: {
  amount: number; currency: string; description: string; callback_url: string;
}, options: Options = {}) {
  const result = await request("payment_intents", options, input);
  const intent = parseIntent(result);
  if (intent.status !== "created" || intent.amount !== input.amount || intent.currency !== input.currency ||
      intent.callback_url !== input.callback_url) {
    invalidResponse(result, "INTENT_ORDER_MISMATCH", 502, "جلسة الدفع لا تطابق الطلب");
  }
  return intent;
}
export async function fetchLiveIntent(id: string, options: Options = {}) {
  if (!isPaymentId(id)) throw new PaymentError(400, "INVALID_INTENT_ID", "معرّف جلسة الدفع غير صالح");
  const result = await request(`payment_intents/${id}`, options);
  const intent = parseIntent(result);
  if (intent.id !== id) invalidResponse(result, "INVALID_INTENT_RESPONSE", 502, "استجابة جلسة الدفع غير صالحة");
  return intent;
}

// Recover a payment whose browser callback/on_completed was lost. Never infer
// failure from an empty list. Scan the provider's pagination before deciding.
export async function findAttemptPayment(orderId: string, attemptId: string, options: Options = {}) {
  if (!isPaymentId(orderId) || !isPaymentId(attemptId)) throw new PaymentError(400, "INVALID_ATTEMPT_ID", "معرّف المحاولة غير صالح");
  let found: string | null = null;
  for (let page = 1; page <= 20; page++) {
    const params = new URLSearchParams({ "metadata[order_id]": orderId, "metadata[attempt_id]": attemptId, page: String(page) });
    const result = await request(`payments?${params}`, options);
    const { data } = result;
    if (!isJsonObject(data) || !Array.isArray(data.payments) || !isJsonObject(data.meta)) {
      invalidResponse(result, "INVALID_PROVIDER_RESPONSE", 502, "تعذر استعادة عملية الدفع");
    }
    for (const item of data.payments) {
      if (!isJsonObject(item) || !isPaymentId(item.id) || !isJsonObject(item.metadata) ||
          item.metadata.order_id !== orderId || item.metadata.attempt_id !== attemptId) {
        invalidResponse(result, "INVALID_PROVIDER_RESPONSE", 502, "تعذر مطابقة عملية الدفع بالمحاولة");
      }
      if (found !== null && found !== item.id) invalidResponse(result, "MULTIPLE_ATTEMPT_PAYMENTS", 409, "توجد عمليات تحتاج مراجعة الدعم. لا تدفع مرة أخرى");
      found = item.id;
    }
    if (data.meta.next_page === null) return found;
    if (data.meta.next_page !== page + 1) invalidResponse(result, "INVALID_PROVIDER_RESPONSE", 502, "تعذر استعادة عملية الدفع");
  }
  throw new PaymentError(503, "RECOVERY_PENDING", "استعادة عملية الدفع قيد التحقق. لا تدفع مرة أخرى");
}

export function isTerminalFailure(payment: VerifiedPayment) {
  return payment.refunded === 0 && (payment.status === "failed" || payment.status === "voided");
}
