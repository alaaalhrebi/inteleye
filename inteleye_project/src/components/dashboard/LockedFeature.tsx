import Link from "next/link";
import { Lock } from "lucide-react";

export default function LockedFeature() {
  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-[#F8F7F3] px-6 py-12 text-[#374375]"
    >
      <section className="w-full max-w-2xl rounded-[2.5rem] border border-[#BABDE2]/40 bg-white p-8 text-center shadow-sm md:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#BABDE2]/30">
          <Lock size={30} />
        </div>
        <h1 className="mt-6 text-3xl font-extrabold">
          اشترك للتمتع بالمزايا
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-gray-500">
          إدارة الفروع والتقارير المخصصة متاحة ضمن الاشتراكات المدفوعة.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/pricing"
            className="rounded-full bg-[#374375] px-7 py-3 font-bold text-white transition hover:bg-[#895159]"
          >
            عرض الباقات
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-[#374375] bg-white px-7 py-3 font-bold text-[#374375] transition hover:bg-[#F8F7F3]"
          >
            الرجوع للوحة التحكم
          </Link>
        </div>
      </section>
    </main>
  );
}
