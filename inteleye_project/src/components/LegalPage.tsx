import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";

type LegalPageProps = {
  title: string;
  intro: string;
  children: React.ReactNode;
};

export default function LegalPage({ title, intro, children }: LegalPageProps) {
  return (
    <main dir="rtl" className="min-h-screen bg-[#F8F7F3] text-[#374375]">
      <header className="border-b border-[#BABDE2]/35 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="IntelEye الرئيسية">
            <Image src="/logo.png" alt="IntelEye" width={46} height={46} className="object-contain" />
            <span className="text-xl font-black tracking-tight">INTELEYE</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[#BABDE2]/60 bg-white px-4 py-2.5 text-sm font-bold transition hover:bg-[#BABDE2]/20"
          >
            <ArrowRight size={17} />
            العودة للرئيسية
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[#BABDE2]/30 bg-[#374375] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(223,174,161,0.28),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(186,189,226,0.25),transparent_50%)]" />
        <div className="relative mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="mb-3 text-sm font-bold text-white/65">آخر تحديث: 2 سبتمبر 2026</p>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-white/80 sm:text-lg">{intro}</p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <article className="space-y-6 rounded-[2rem] border border-[#BABDE2]/35 bg-white p-6 shadow-[0_20px_70px_rgba(55,67,117,0.08)] sm:p-10">
          {children}
        </article>

        <aside className="mt-7 rounded-3xl bg-[#BABDE2]/20 p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <h2 className="text-lg font-extrabold">لديك استفسار؟</h2>
            <p className="mt-1 text-sm leading-7 text-gray-600">تواصل معنا بشأن الخصوصية أو استخدام الخدمة.</p>
          </div>
          <a
            href="mailto:Info.inteleye@gmail.com"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#374375] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#2A3460] sm:mt-0"
          >
            <Mail size={17} />
            Info.inteleye@gmail.com
          </a>
        </aside>
      </div>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-[#BABDE2]/25 pb-6 last:border-0 last:pb-0">
      <h2 className="mb-3 text-xl font-extrabold text-[#374375]">{title}</h2>
      <div className="space-y-3 text-[15px] leading-8 text-gray-600 sm:text-base">{children}</div>
    </section>
  );
}

export function LegalList({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-1.5 pr-6 marker:text-[#895159]">{children}</ul>;
}
