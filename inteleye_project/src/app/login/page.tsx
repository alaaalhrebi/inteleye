"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Lock,
  LogIn,
  Mail,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

 async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();

  setLoading(true);
  setMessage("");

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    setLoading(false);
    setMessage("البريد الإلكتروني أو كلمة المرور غير صحيحة");
    return;
  }

  const userId = data.user?.id;

  if (!userId) {
    setLoading(false);
    setMessage("لم يتم العثور على بيانات المستخدم");
    return;
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, subscription_status, plan")
    .eq("user_id", userId)
    .maybeSingle();

  if (clientError) {
    setLoading(false);
    setMessage("حدث خطأ أثناء التحقق من بيانات العميل");
    return;
  }

  if (!client) {
    setLoading(false);
    router.push("/signup");
    return;
  }

  const status = client.subscription_status?.toLowerCase();

  if (status !== "active" && status !== "paid" && status !== "completed") {
  setLoading(false);
  router.push(`/checkout?plan=${client.plan || "basic"}`);
  return;
  }

  const { data: platforms, error: platformsError } = await supabase
    .from("client_platforms")
    .select("id")
    .eq("client_id", client.id)
    .limit(1);

  setLoading(false);

  if (platformsError) {
    setMessage("حدث خطأ أثناء التحقق من المنصات");
    return;
  }

  if (!platforms || platforms.length === 0) {
    router.push("/onboarding/platforms");
    return;
    }

  router.push("/dashboard");
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
            لوحة تحكم ذكية لإدارة السمعة
          </div>

          <h1 className="max-w-xl text-5xl font-extrabold leading-[1.25] text-[#374375]">
            مرحبًا بعودتك إلى IntelEye
          </h1>

          <p className="mt-6 max-w-xl text-xl leading-10 text-gray-600">
            سجّل دخولك لمتابعة تقييمات العملاء، مراجعة التقارير، واكتشاف
            المشاكل المتكررة التي تؤثر على رضا العملاء وسمعة منشأتك.
          </p>

          <div className="mt-10 grid max-w-xl gap-4">
            <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DFAEA1]/35 text-[#895159]">
                <BarChart3 size={20} />
              </span>
              <span className="font-semibold text-[#374375]">
                متابعة مؤشرات الأداء والتقييمات
              </span>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#BABDE2]/40 text-[#374375]">
                <MessageSquareText size={20} />
              </span>
              <span className="font-semibold text-[#374375]">
                تحليل التعليقات واكتشاف المشاكل المتكررة
              </span>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DFAEA1]/35 text-[#895159]">
                <ShieldCheck size={20} />
              </span>
              <span className="font-semibold text-[#374375]">
                حماية سمعة منشأتك بتحليلات وتنبيهات ذكية
              </span>
            </div>
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
              <p className="mb-1 text-sm text-gray-400">
                تسجيل الدخول إلى حسابك
              </p>
              <p className="text-lg font-extrabold text-[#374375]">
                IntelEye Dashboard
              </p>
            </div>

            <div className="mb-8 text-center">
              <h1 className="text-3xl font-extrabold text-[#374375]">
                تسجيل الدخول
              </h1>
              <p className="mt-3 text-gray-500">
                أدخل بياناتك لمتابعة اشتراكك
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
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
                    className="w-full rounded-2xl border border-gray-200 bg-white py-4 pl-4 pr-11 text-right outline-none transition focus:border-[#374375] focus:ring-4 focus:ring-[#BABDE2]/30"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <Link
                  href="/reset-password"
                  className="font-bold text-[#895159] transition hover:text-[#374375]"
                >
                  نسيت كلمة المرور؟
                </Link>

                <span className="text-gray-400">حسابك محمي ومشفّر</span>
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
                <LogIn size={20} />
                {loading ? "جاري تسجيل الدخول..." : "دخول"}
              </button>
            </form>

            <p className="mt-6 text-center text-gray-500">
              ليس لديك حساب؟{" "}
              <Link href="/signup" className="font-extrabold text-[#895159]">
                شاهد الباقات وابدأ الآن
              </Link>
            </p>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
