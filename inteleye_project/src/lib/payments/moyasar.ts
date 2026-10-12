import { timingSafeEqual } from "node:crypto";
import { isJsonObject } from "@/lib/json-object";

export class PaymentError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export function requireLivePayments(environment = process.env) {
  if (environment.PAYMENTS_MODE !== "live" || environment.VERCEL_ENV !== "production") {
    throw new PaymentError(503, "PAYMENTS_DISABLED", "الدفع غير مفعّل في هذه البيئة");
  }
  if (!environment.MOYASAR_SECRET_KEY?.startsWith("sk_live_") ||
      !environment.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY?.startsWith("pk_live_")) {
    throw new PaymentError(503, "LIVE_KEYS_REQUIRED", "مفاتيح الدفع الفعلي غير مكتملة");
  }
}

export const isPaymentId = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export type VerifiedPayment = {
  id: string; status: string; amount: number; currency: string; refunded: number;
  live?: true; metadata: Record<string, unknown>;
};

export async function fetchLivePayment(id: string, options: {
  environment?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch;
} = {}): Promise<VerifiedPayment> {
  const environment = options.environment ?? process.env;
  requireLivePayments(environment);
  if (!isPaymentId(id)) throw new PaymentError(400, "INVALID_PAYMENT_ID", "معرّف الدفع غير صالح");
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(`https://api.moyasar.com/v1/payments/${id}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${environment.MOYASAR_SECRET_KEY}:`).toString("base64")}` },
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new PaymentError(503, "PROVIDER_UNAVAILABLE", "تعذر التحقق من الدفع الآن. لا تدفع مرة أخرى");
  }
  if (!response.ok) {
    throw new PaymentError(response.status === 404 ? 404 : 503, "PROVIDER_REJECTED", "تعذر التحقق من عملية الدفع");
  }
  let data: unknown;
  try { data = await response.json(); } catch { data = null; }
  if (!isJsonObject(data) || data.id !== id || (data.live !== undefined && data.live !== true) ||
      !Number.isSafeInteger(data.amount) || Number(data.amount) < 0 ||
      !Number.isSafeInteger(data.refunded) || Number(data.refunded) < 0 || Number(data.refunded) > Number(data.amount) ||
      typeof data.status !== "string" || !["initiated", "paid", "failed", "authorized", "captured", "refunded", "voided", "verified", "expired"].includes(data.status) ||
      typeof data.currency !== "string" || !isJsonObject(data.metadata)) {
    throw new PaymentError(502, "INVALID_PROVIDER_RESPONSE", "استجابة الدفع غير صالحة للتفعيل");
  }
  return data as VerifiedPayment;
}

export function verifyWebhookToken(value: unknown, expected: string | undefined) {
  if (!expected || expected.length < 24 || typeof value !== "string") return false;
  const a = Buffer.from(value), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
