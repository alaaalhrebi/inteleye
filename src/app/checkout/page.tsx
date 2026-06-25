"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Script from "next/script";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const PLAN_PRICES_HALALAS: Record<string, number> = {
  basic: 19900, // 199.00 ريال
  pro: 44900, // 449.00 ريال
  enterprise: 99900, // 999.00 ريال
};

const PLAN_LABELS: Record<string, string> = {
  basic: "Basic",
  pro: "Pro",
  enterprise: "Enterprise",
};

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutForm />
    </Suspense>
  );
}

function CheckoutForm() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") ?? "basic";

  const [userId, setUserId] = useState<string | null>(null);
  const [formReady, setFormReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const supabase = createSupabaseBrowserClient();
  const price = PLAN_PRICES_HALALAS[plan] ?? PLAN_PRICES_HALALAS.basic;

  useEffect(() => {
    async function resolveSession() {
      // حالة معروفة بـ Supabase: قد يتجاوز رابط تأكيد البريد صفحة
      // /auth/callback المخصصة ويوصل مباشرة هنا مع ?code= بالرابط
      // (خصوصاً لو القالب الافتراضي للإيميل يستخدم Site URL).
      // نتعامل مع الحالتين: بوجود code نحتاج نستبدله بجلسة فعلية،
      // وبدونه نفحص الجلسة الحالية مباشرة كما كان الكود يفعل سابقاً.
      const code = searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("Failed to exchange code for session:", error);
        }
      }

      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
      setCheckingSession(false);
    }

    resolveSession();
  }, []);

  function initMoyasarForm() {
    if (!userId || formReady) return;

    // @ts-ignore — Moyasar يُحمَّل من سكربت خارجي عبر next/script
    window.Moyasar.init({
      element: ".mysr-form",
      amount: price,
      currency: "SAR",
      description: `اشتراك Inteleye — باقة ${PLAN_LABELS[plan] ?? plan}`,

      // هذا الحقل الأهم: يصل ضمن webhook payload عند نجاح الدفع
      metadata: {
        client_user_id: userId,
        plan: plan,
      },

      publishable_api_key: process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY,
      callback_url: `${window.location.origin}/checkout/success`,

      methods: ["creditcard", "applepay"],

      on_completed: function () {
        // هذا للتجربة البصرية فقط (مثل عرض "جاري التأكيد")
        // التفعيل الحقيقي للحساب يحدث من webhook في السيرفر، لا من هنا
      },
    });

    setFormReady(true);
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f4f0] flex items-center justify-center px-4 py-10">
      <link rel="stylesheet" href="https://cdn.moyasar.com/mpf/1.16.0/moyasar.css" />
      <Script
        src="https://cdn.moyasar.com/mpf/1.16.0/moyasar.js"
        onLoad={initMoyasarForm}
        strategy="afterInteractive"
      />

      <div className="bg-white rounded-2xl border border-[#eeede8] p-8 max-w-sm w-full">
        <div className="bg-[#f9f8f5] rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">الباقة</p>
            <p className="font-bold text-[#1a1a2e]">{PLAN_LABELS[plan] ?? plan}</p>
          </div>
          <p className="text-lg font-bold text-[#1a1a2e]">{price / 100} ريال</p>
        </div>

        {checkingSession ? (
          <p className="text-sm text-gray-400 text-center py-6">جاري التحقق من حسابك...</p>
        ) : !userId ? (
          <p className="text-sm text-gray-500 text-center py-6">
            يجب تسجيل الدخول أولاً لإتمام الدفع.{" "}
            <a href={`/signup?plan=${plan}`} className="text-[#1a1a2e] font-bold">
              سجّل حسابك
            </a>
          </p>
        ) : (
          <div className="mysr-form"></div>
        )}
      </div>
    </div>
  );
}
