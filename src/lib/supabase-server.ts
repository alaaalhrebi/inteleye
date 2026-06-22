// عميل Supabase للاستخدام في السيرفر (Server Components)
// يقرأ جلسة المستخدم من الكوكيز، يُستخدم لجلب بيانات محمية بـ RLS

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // يحدث هذا الخطأ عند الاستدعاء من Server Component فقط (وليس Route Handler)
            // ويمكن تجاهله بأمان لأن middleware يتولى تحديث الجلسة
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set(name, "", { ...options, maxAge: 0 });
          } catch {
            // نفس الملاحظة أعلاه
          }
        },
      },
    },
  );
}
