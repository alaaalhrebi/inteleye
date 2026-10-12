import "server-only";
import { createClient } from "@supabase/supabase-js";
import { PaymentError, requireLivePayments } from "@/lib/payments/moyasar";

// Server-only service-role access. Payment routes derive the client from Auth,
// never from request-provided client IDs. Live remains disabled unless explicitly enabled.
export function createPaymentAdmin() {
  requireLivePayments();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new PaymentError(503, "PAYMENT_DATABASE_REQUIRED", "إعدادات خادم الدفع غير مكتملة");
  if (new URL(url).protocol !== "https:") {
    throw new PaymentError(503, "INVALID_DATABASE_URL", "إعدادات قاعدة الدفع غير صالحة");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
