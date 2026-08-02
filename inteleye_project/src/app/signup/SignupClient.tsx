"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Lock,
  Mail,
  Sparkles,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type SignupClientProps = {
  selectedPlan?: string;
};

export default function SignupClient(_props: SignupClientProps) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | null>(
    null
  );

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const cleanCompanyName = companyName.trim();
    const cleanEmail = email.trim().toLowerCase();

    setLoading(true);
    setMessage("");
    setMessageType(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            // الدالة handle_new_client_signup تقرأ الحقل name.
            name: cleanCompanyName,
            company_name: cleanCompanyName,

            // جميع الحسابات الجديدة تبدأ بتجربة Basic.
            selected_plan: "basic",
          },
        },
      });

      if (error) {
        setMessage(error.message);
        setMessageType("error");
        return;
      }

      // إذا كان تأكيد البريد غير مطلوب، تكون الجلسة جاهزة مباشرة.
      if (data.session) {
        router.replace("/onboarding/platforms");
        router.refresh();
        return;
      }

      // عند تفعيل تأكيد البريد في Supabase.
      setSignupComplete(true);
      setMessage(
        "تم إنشاء حسابك. افتحي رسالة التأكيد المرسلة إلى بريدك، وبعد التأكيد ستنتقلين لإعداد المنصة وبدء التجربة المجانية."
      );
      setMessageType("success");
    } catch {
      setMessage("حدث خطأ غير متوقع أثناء إنشاء الحساب. حاولي مرة أخرى.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#FFFCF5] px-6 py-10 text-[#374375]"
    >
      <div className="absolute right-[-140px] top-[-140px] h-[360px] w-[360px] rounded-full bg-[#BABDE2]/50 blur-[120px]" />
      <div className="absolute bottom-[-120px] left-[-120px] h-[360px] w-[360px] rounded-full bg-[#DFAEA1]/40 blur-[120px]" />

      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid-cols-2">
        <motion.section
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="hidden lg:block"
        >
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-2 rounded-full border border-[#BABDE2]/60 bg-white px-5 py-3 text-sm font-bold text-[#374375] shadow-sm transition hover:bg-[#BABDE2]/20"
          >
            <ArrowLeft size={18} />
            العودة للرئيسية
          </Link>

          <div className="mb-7 inline-flex items-center gap-2 rounded-full bg-[#BABDE2]/35 px-5 py-2 text-sm font-bold text-[#374375]">
            <Sparkles size={16} />
            تجربة Basic مجانية لمدة 14 يومًا
          </div>

          <h1 className="max-w-xl text-5xl font-extrabold leading-[1.25] text-[#374375]">
            ابدأ بتحليل تقييمات عملائك خلال دقائق
          </h1>

          <p className="mt-6 max-w-xl text-xl leading-10 text-gray-600">
            أنشئ حسابك وابدأ تجربة Basic المجانية دون دفع. يمكنك الاشتراك في
            Basic أو الترقية إلى باقة أعلى في أي وقت أثناء التجربة.
          </p>

          <div className="mt-10 grid max-w-xl gap-4">
            {[
              "تحليل ذكي للتعليقات والمشاعر",
              "اكتشاف المشاكل المتكررة تلقائيًا",
              "اقتراح ردود مناسبة لتحسين السمعة",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#DFAEA1]/35 text-[#895159]">
                  <CheckCircle2 size={20} />
                </span>
                <span className="font-semibold text-[#374375]">{item}</span>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mx-auto w-full max-w-xl"
        >
          <div className="rounded-[2.2rem] border border-[#BABDE2]/40 bg-white/90 p-7 shadow-2xl backdrop-blur">
            <div className="mb-7 rounded-[1.5rem] bg-[#FFFCF5] px-5 py-5 text-center">
              <p className="mb-1 text-sm text-gray-400">تجربتك المجانية</p>
              <p className="text-lg font-extrabold text-[#374375]">
                باقة Basic مجانًا لمدة 14 يومًا
              </p>
              <p className="mt-2 text-sm text-gray-500">
                لا تحتاج إلى بطاقة دفع الآن
              </p>
            </div>

            <div className="mb-7 text-center">
              <h2 className="text-3xl font-extrabold text-[#374375]">
                إنشاء حساب جديد
              </h2>
              <p className="mt-3 text-gray-500">
                سجّل بياناتك لبدء التجربة المجانية
              </p>
            </div>

            <form onSubmit={handleSignup} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-[#374375]">
                  اسم المنشأة
                </label>
                <div className="relative">
                  <Building2
                    size={18}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    disabled={signupComplete}
                    className="w-full rounded-2xl border border-gray-200 bg-white py-4 pl-4 pr-11 text-right outline-none transition focus:border-[#374375] focus:ring-4 focus:ring-[#BABDE2]/30 disabled:bg-gray-100"
                    placeholder="مطعم الأصيل"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[#374375]">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={signupComplete}
                    type="email"
                    autoComplete="email"
                    className="w-full rounded-2xl border border-gray-200 bg-white py-4 pl-4 pr-11 text-right outline-none transition focus:border-[#374375] focus:ring-4 focus:ring-[#BABDE2]/30 disabled:bg-gray-100"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[#374375]">
                  كلمة المرور
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={signupComplete}
                    type="password"
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full rounded-2xl border border-gray-200 bg-white py-4 pl-4 pr-11 text-right outline-none transition focus:border-[#374375] focus:ring-4 focus:ring-[#BABDE2]/30 disabled:bg-gray-100"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-[#BABDE2]/20 p-4">
                <div className="mb-3 flex items-center gap-2 font-bold text-[#374375]">
                  <BadgeCheck size={18} />
                  ماذا تشمل التجربة؟
                </div>

                <div className="space-y-2">
                  {[
                    "خصائص باقة Basic لمدة 14 يومًا",
                    "ربط منصة واحدة",
                    "إمكانية الاشتراك أو الترقية في أي وقت",
                  ].map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 text-sm text-gray-600"
                    >
                      <CheckCircle2 size={16} className="text-[#895159]" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              {message && (
                <p
                  className={`rounded-2xl px-4 py-3 text-center text-sm font-bold ${
                    messageType === "success"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-[#DFAEA1]/30 text-[#895159]"
                  }`}
                >
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || signupComplete}
                className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-[#374375] px-6 py-4 text-lg font-extrabold text-white shadow-lg transition hover:bg-[#895159] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Sparkles size={20} />
                {loading
                  ? "جاري إنشاء الحساب..."
                  : signupComplete
                    ? "تم إنشاء الحساب"
                    : "ابدأ التجربة المجانية"}
              </button>
            </form>

            <p className="mt-6 text-center text-gray-500">
              لديك حساب بالفعل؟{" "}
              <Link href="/login" className="font-extrabold text-[#895159]">
                سجّل دخولك
              </Link>
            </p>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
