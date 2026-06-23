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

  const supabase = createSupabaseBrowserClient();
  const price = PLAN_PRICES_HALALAS[plan] ?? PLAN_PRICES_HALALAS.basic;

  useEffect(() => {
    // نحتاج هوية المستخدم الحالي لتمريرها ضمن metadata الدفع
    // حتى تستطيع الدالة (webhook) معرفة لأي عميل تنتمي هذه الدفعة
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
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

        {!userId ? (
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
