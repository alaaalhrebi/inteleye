"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function ResetPasswordPage() {
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setErrorMsg(null);

    const redirectTo = `${window.location.origin}/update-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    setMessage("تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك.");
    setLoading(false);
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#f5f4f0] flex items-center justify-center px-4"
    >
      <div className="w-full max-w-sm bg-white rounded-2xl border border-[#eeede8] p-8">
        <h1 className="text-2xl font-bold text-[#1a1a2e] mb-2">
          نسيت كلمة المرور؟
        </h1>

        <p className="text-sm text-gray-500 mb-6">
          أدخل بريدك الإلكتروني وسنرسل لك رابطًا لتعيين كلمة مرور جديدة.
        </p>

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              البريد الإلكتروني
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
            />
          </div>

          {message && (
            <p className="text-sm text-[#374375] bg-[#FFFCF5] rounded-lg px-3 py-2">
              {message}
            </p>
          )}

          {errorMsg && (
            <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1a1a2e] text-white rounded-lg py-2.5 text-sm font-bold disabled:opacity-60"
          >
            {loading ? "جاري الإرسال..." : "إرسال رابط إعادة التعيين"}
          </button>
        </form>

        <a
          href="/login"
          className="block text-center text-sm text-gray-500 mt-5"
        >
          الرجوع لتسجيل الدخول
        </a>
      </div>
    </main>
  );
}
