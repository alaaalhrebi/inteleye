// عميل Supabase للاستخدام في المتصفح (Client Components)
// يُستخدم لتسجيل الدخول، إنشاء حساب، وأي تفاعل من جهة العميل

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
