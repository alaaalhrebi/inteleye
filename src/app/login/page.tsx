"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // نتحقق من حالة الاشتراك لنعرف وين نوجّهه:
    // - active → عنده اشتراك فعّال، يذهب للوحة التحكم
    // - pending → سجّل قبل لكن لم يكمل الدفع، يذهب للباقات ليكمل المسار
    const { data: client } = await supabase
      .from("clients")
      .select("subscription_status")
      .eq("user_id", data.user.id)
      .single();

    if (client?.subscription_status === "active") {
      router.push("/dashboard");
    } else {
      router.push("/pricing");
    }
  }

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-[#f5f4f0] px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-[#eeede8] p-8">
        <h1 className="text-xl font-bold text-[#1a1a2e] mb-1">تسجيل الدخول</h1>
        <p className="text-sm text-gray-500 mb-6">أدخل بياناتك لمتابعة تقاريرك</p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            {loading ? "جاري التحميل..." : "دخول"}
          </button>
        </form>

        <a href="/pricing" className="block text-center text-sm text-gray-500 mt-5">
          ليس لديك حساب؟ شاهد الباقات وابدأ الآن
        </a>
      </div>
    </div>
  );
}
