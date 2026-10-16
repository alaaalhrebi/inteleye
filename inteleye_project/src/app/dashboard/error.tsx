"use client";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main dir="rtl" className="min-h-screen bg-[#F8F7F3] px-4 py-12 text-[#374375]">
      <section role="alert" className="mx-auto max-w-xl rounded-2xl border border-[#BABDE2]/40 bg-white p-6 text-center shadow-sm">
        <h2 className="text-xl font-extrabold">تعذر تحديث لوحة التحكم</h2>
        <p className="mt-3 text-sm leading-7 text-gray-500">لم يكتمل تحميل النتائج. حاول مرة أخرى؛ لم تتغير بيانات حسابك.</p>
        <button type="button" onClick={reset} className="mt-5 rounded-full bg-[#374375] px-5 py-2.5 text-sm font-bold text-white">إعادة المحاولة</button>
        <a href="/dashboard" className="mt-3 block text-sm font-bold underline underline-offset-4">العودة إلى العرض الافتراضي</a>
      </section>
    </main>
  );
}
