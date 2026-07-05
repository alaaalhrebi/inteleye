"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function UpdatePasswordPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("كلمتا المرور غير متطابقتين.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    setMessage("تم تحديث كلمة المرور بنجاح.");
    setLoading(false);

    setTimeout(() => {
      router.push("/login");
    }, 1200);
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#f5f4f0] flex items-center justify-center px-4"
    >
      <div className="w-full max-w-sm bg-white rounded-2xl border border-[#eeede8] p-8">
        <h1 className="text-2xl font-bold text-[#1a1a2e] mb-2">
          تعيين كلمة مرور جديدة
        </h1>

        <p className="text-sm text-gray-500 mb-6">
          اكتبي كلمة مرور جديدة لحسابك.
        </p>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              كلمة المرور الجديدة
            </label>

            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              تأكيد كلمة المرور
            </label>

            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
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
            {loading ? "جاري الحفظ..." : "تحديث كلمة المرور"}
          </button>
        </form>
      </div>
    </main>
  );
}