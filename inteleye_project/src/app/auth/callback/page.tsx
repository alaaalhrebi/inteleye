"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackHandler />
    </Suspense>
  );
}

function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") ?? "basic";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // بعد تأكيد البريد، Supabase يضع الجلسة تلقائياً في الرابط/الكوكيز
    // عند تحميل هذه الصفحة. نتحقق من وجودها فعلياً قبل التوجيه.
    supabase.auth.getUser().then(({ data, error: authError }) => {
      if (authError || !data.user) {
        setError("لم يتم تأكيد الحساب بشكل صحيح. حاول تسجيل الدخول يدوياً.");
        return;
      }

      // الجلسة فعّالة الآن — ننتقل مباشرة لإتمام الدفع بنفس الباقة الأصلية
      router.push(`/checkout?plan=${plan}`);
    });
  }, []);

  if (error) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-[#f5f4f0] px-4">
        <div className="bg-white rounded-2xl border border-[#eeede8] p-8 max-w-sm w-full text-center">
          <p className="text-red-600 mb-3">{error}</p>
          <a href="/login" className="text-[#1a1a2e] font-bold text-sm">
            تسجيل الدخول
          </a>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-[#f5f4f0] px-4">
      <p className="text-gray-500 text-sm">جاري تأكيد حسابك...</p>
    </div>
  );
}
