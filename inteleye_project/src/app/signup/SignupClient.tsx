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
  CreditCard,
  Lock,
  Mail,
  Sparkles,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const plans = {
  basic: {
    name: "Basic",
    price: "199",
    label: "Basic - 199 ريال / شهر",
    description: "مناسبة للمنشآت الصغيرة التي تبدأ في تحليل تقييمات العملاء.",
    features: ["تحليل تقييمات العملاء", "اقتراح ردود ذكية", "تقرير شهري مبسط"],
  },
  pro: {
    name: "Pro",
    price: "499",
    label: "Pro - 499 ريال / شهر",
    description: "الخيار الأفضل للمنشآت التي تحتاج تحليلات أوسع وتنبيهات أسرع.",
    features: ["تحليل متقدم للمشاكل", "تقارير تنفيذية", "اقتراحات تحسين الخدمة"],
  },
  enterprise: {
    name: "Enterprise",
    price: "999",
    label: "Enterprise - 999 ريال / شهر",
    description: "حل مخصص للشركات والفروع المتعددة مع دعم وتكاملات متقدمة.",
    features: ["فروع متعددة", "دعم مخصص", "تقارير وتحليلات متقدمة"],
  },
} as const;

type PlanKey = keyof typeof plans;

function normalizePlan(plan?: string): PlanKey {
  if (plan === "basic" || plan === "pro" || plan === "enterprise") {
    return plan;
  }

  return "basic";
}

type SignupClientProps = {
  selectedPlan: string;
};

export default function SignupClient({ selectedPlan }: SignupClientProps) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [plan, setPlan] = useState<PlanKey>(normalizePlan(selectedPlan));
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          company_name: companyName,
          selected_plan: plan,
        },
      },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push(`/checkout?plan=${plan}`);
  }

  const selectedPlanData = plans[plan];

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
            منصة ذكاء اصطناعي لإدارة السمعة
          </div>

          <h1 className="max-w-xl text-5xl font-extrabold leading-[1.25] text-[#374375]">
            ابدأ بتحليل تقييمات عملائك خلال دقائق
          </h1>

          <p className="mt-6 max-w-xl text-xl leading-10 text-gray-600">
            أنشئ حسابك، اختر الباقة المناسبة، وابدأ في تحويل تقييمات العملاء
            إلى مؤشرات واضحة تساعدك على تحسين الخدمة ورفع رضا العملاء.
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
              <p className="mb-1 text-sm text-gray-400">الباقة المختارة</p>
              <p className="text-lg font-extrabold text-[#374375]">
                {selectedPlanData.label}
              </p>
            </div>

            <div className="mb-7 text-center">
              <h2 className="text-3xl font-extrabold text-[#374375]">
                إنشاء حساب جديد
              </h2>
              <p className="mt-3 text-gray-500">
                سجل بياناتك للمتابعة إلى الدفع
              </p>
            </div>

            <div className="mb-7 grid grid-cols-3 gap-3">
              {(Object.keys(plans) as PlanKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPlan(key)}
                  className={`rounded-2xl border px-3 py-4 text-center transition ${
                    plan === key
                      ? "border-[#374375] bg-[#374375] text-white shadow-lg"
                      : "border-[#BABDE2]/60 bg-white text-[#374375] hover:bg-[#BABDE2]/20"
                  }`}
                >
                  <span className="block text-sm font-extrabold">
                    {plans[key].name}
                  </span>
                  <span className="mt-1 block text-xs opacity-80">
                    {plans[key].price} ريال
                  </span>
                </button>
              ))}
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
                    className="w-full rounded-2xl border border-gray-200 bg-white py-4 pl-4 pr-11 text-right outline-none transition focus:border-[#374375] focus:ring-4 focus:ring-[#BABDE2]/30"
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
                    type="email"
                    className="w-full rounded-2xl border border-gray-200 bg-white py-4 pl-4 pr-11 text-right outline-none transition focus:border-[#374375] focus:ring-4 focus:ring-[#BABDE2]/30"
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
                    type="password"
                    minLength={6}
                    className="w-full rounded-2xl border border-gray-200 bg-white py-4 pl-4 pr-11 text-right outline-none transition focus:border-[#374375] focus:ring-4 focus:ring-[#BABDE2]/30"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-[#BABDE2]/20 p-4">
                <div className="mb-3 flex items-center gap-2 font-bold text-[#374375]">
                  <BadgeCheck size={18} />
                  ماذا تشمل الباقة؟
                </div>

                <div className="space-y-2">
                  {selectedPlanData.features.map((feature) => (
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
                <p className="rounded-2xl bg-[#DFAEA1]/30 px-4 py-3 text-center text-sm font-bold text-[#895159]">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-[#374375] px-6 py-4 text-lg font-extrabold text-white shadow-lg transition hover:bg-[#895159] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CreditCard size={20} />
                {loading ? "جاري إنشاء الحساب..." : "إنشاء الحساب والمتابعة للدفع"}
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
