"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const PLAN_NAMES: Record<string, string> = {
  basic: "Basic — 199 ريال/شهر",
  pro: "Pro — 449 ريال/شهر",
  enterprise: "Enterprise — 999 ريال/شهر",
};

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") ?? "basic";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const supabase = createSupabaseBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        // بعد ضغط رابط التأكيد بالإيميل، Supabase يرجّع المستخدم لهذا الرابط
        // بجلسة فعّالة — نحمّل الباقة هنا حتى /auth/callback يعرف يوجّهه لها
        emailRedirectTo: `${window.location.origin}/auth/callback?plan=${plan}`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // الـ trigger في قاعدة البيانات ينشئ صف clients تلقائياً بحالة pending.
    // لكن لا توجد جلسة فعّالة بعد — Confirm email مفعّل، فلا بد من
    // الانتظار لحين تأكيد البريد قبل أي توجيه لصفحة الدفع.
    setEmailSent(true);
    setLoading(false);
  }

  if (emailSent) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-[#f5f4f0] px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-[#eeede8] p-8 text-center">
          <p className="text-lg font-bold text-[#1a1a2e] mb-2">تحقق من بريدك الإلكتروني ✓</p>
          <p className="text-sm text-gray-500 leading-relaxed">
            أرسلنا رابط تأكيد إلى <span className="font-bold">{email}</span>. اضغط الرابط
            لتأكيد حسابك، وستنتقل تلقائياً لصفحة الدفع لإتمام اشتراكك.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-[#f5f4f0] px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-[#eeede8] p-8">
        <div className="bg-[#f9f8f5] rounded-lg px-3 py-2 mb-5 text-center">
          <p className="text-xs text-gray-400">الباقة المختارة</p>
          <p className="text-sm font-bold text-[#1a1a2e]">{PLAN_NAMES[plan] ?? plan}</p>
        </div>

        <h1 className="text-xl font-bold text-[#1a1a2e] mb-1">إنشاء حساب جديد</h1>
        <p className="text-sm text-gray-500 mb-6">سجّل بياناتك للمتابعة إلى الدفع</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">اسم المنشأة</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
              placeholder="مطعم الأصيل"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">كلمة المرور</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1a1a2e] text-white rounded-lg py-2.5 text-sm font-bold disabled:opacity-60"
          >
            {loading ? "جاري التحميل..." : "إنشاء الحساب والمتابعة للدفع"}
          </button>
        </form>

        <a href={`/login?plan=${plan}`} className="block text-center text-sm text-gray-500 mt-5">
  لديك حساب بالفعل؟ سجّل دخولك
        </a>
      </div>
    </div>
  );
}
