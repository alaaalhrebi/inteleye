"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") ?? "basic";

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#f5f4f0] flex items-center justify-center px-4"
    >
      <div className="bg-white rounded-2xl border border-[#eeede8] p-8 max-w-sm w-full text-center">
        <p className="text-sm text-gray-400 mb-1">الباقة المختارة</p>

        <p className="text-xl font-bold text-[#1a1a2e] mb-6">
          {plan}
        </p>

        <p className="text-sm text-gray-500">
          هنا تُدمج نموذج الدفع Moyasar Checkout — راجع ملف
          payment_page_example.html لمثال التكامل الكامل.
        </p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div
          dir="rtl"
          className="min-h-screen bg-[#f5f4f0] flex items-center justify-center px-4"
        >
          <div className="bg-white rounded-2xl border border-[#eeede8] p-8 max-w-sm w-full text-center">
            <p className="text-sm text-gray-500">جاري تحميل صفحة الدفع...</p>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
