import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createPaymentAdmin } from "@/lib/supabase-admin";
import { PaymentError } from "./moyasar";
import type { PaymentClient } from "./service";

export const paymentResponse = (data: unknown, status = 200) => NextResponse.json(data, {
  status, headers: { "Cache-Control": "private, no-store" },
});
export function paymentFailure(error: unknown) {
  return error instanceof PaymentError ? paymentResponse({ code: error.code, message: error.message }, error.status)
    : paymentResponse({ message: "تعذر معالجة الدفع الآن. لا تدفع مرة أخرى" }, 503);
}
export async function paymentAccess() {
  const auth = createSupabaseServerClient();
  const { data: { user }, error } = await auth.auth.getUser();
  if (error) {
    if (error.name === "AuthSessionMissingError" || error.status === 401 || error.status === 403) {
      throw new PaymentError(401, "LOGIN_REQUIRED", "يجب تسجيل الدخول أولًا");
    }
    throw new PaymentError(503, "AUTH_UNAVAILABLE", "تعذر التحقق من الجلسة");
  }
  if (!user) throw new PaymentError(401, "LOGIN_REQUIRED", "يجب تسجيل الدخول أولًا");
  const db = createPaymentAdmin();
  const { data: client, error: clientError } = await db.from("clients")
    .select("id, plan, subscription_status, current_period_end, trial_ends_at")
    .eq("user_id", user.id).maybeSingle();
  if (clientError) throw new PaymentError(503, "DATABASE_UNAVAILABLE", "تعذر قراءة بيانات الحساب");
  if (!client) throw new PaymentError(403, "CLIENT_NOT_FOUND", "حساب العميل غير موجود");
  return { db, client: client as PaymentClient };
}
