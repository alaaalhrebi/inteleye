"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import AppHeader from "@/components/AppHeader";

const PLANS = [
  { id: "basic", name: "Basic", price: 199, features: ["فرع واحد", "تقرير أسبوعي بالبريد"] },
  {
    id: "pro",
    name: "Pro",
    price: 449,
    featured: true,
    features: ["حتى 5 فروع", "تقرير مفصّل بالمواضيع", "تنبيهات واتساب فورية"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 999,
    features: ["فروع غير محدودة", "تقرير مفصّل بالمواضيع", "دعم مخصص"],
  },
];

export default function PricingPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    // نتحقق هل فيه جلسة نشطة، حتى نعرف وين نوجّه الزر بعد اختيار الباقة
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
    });
  }, []);

  // لو عنده حساب من قبل (سجّل لكن لم يدفع)، نختصر له المسار ونوديه للدفع مباشرة.
  // لو زائر جديد، نوديه أولاً لإنشاء حساب.
  function handleSelectPlan(planId: string) {
    if (isLoggedIn) {
      router.push(`/checkout?plan=${planId}`);
    } else {
      router.push(`/signup?plan=${planId}`);
    }
  }

  return (
     <div dir="rtl" className="min-h-screen bg-[#f5f4f0]">
    {isLoggedIn && <AppHeader rightLabel="حسابك مسجل" />}
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-[#1a1a2e] text-center mb-2">اختر باقتك</h1>
        <p className="text-sm text-gray-500 text-center mb-10">
          تتبّع تقييمات Google Maps واستلم تقريراً أسبوعياً واضحاً
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl p-6 flex flex-col ${
                plan.featured ? "border-2 border-[#1a1a2e]" : "border border-[#eeede8]"
              }`}
            >
              <p className="font-bold text-lg text-[#1a1a2e]">{plan.name}</p>
              <p className="text-3xl font-bold mt-2 mb-4">
                {plan.price}
                <span className="text-sm text-gray-400 font-normal"> ريال / شهر</span>
              </p>
              <ul className="text-sm text-gray-600 space-y-2 flex-1 mb-5">
                {plan.features.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
              <button
                onClick={() => handleSelectPlan(plan.id)}
                className={`rounded-lg py-2.5 text-sm font-bold ${
                  plan.featured ? "bg-[#1a1a2e] text-white" : "bg-[#f1efe8] text-[#1a1a2e]"
                }`}
              >
                ابدأ بـ {plan.name}
              </button>
            </div>
          ))}
        </div>

        {!isLoggedIn && (
          <p className="text-center text-sm text-gray-400 mt-8">
            لديك حساب بالفعل؟{" "}
            <a href="/login" className="text-[#1a1a2e] font-bold">
              سجّل دخولك
            </a>
          </p>
        )}
      </div>
    </div>
   </div>
  );
}
