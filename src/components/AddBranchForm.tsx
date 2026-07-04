"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type AddBranchFormProps = {
  clientId: number;
  canUseX: boolean;
};

export default function AddBranchForm({ clientId, canUseX }: AddBranchFormProps) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [name, setName] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [xKeywords, setXKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    const keywordsArray = xKeywords
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const payload: any = {
      client_id: clientId,
      name,
      google_maps_url: googleMapsUrl || null,
    };

    if (canUseX) {
      payload.x_handle = xHandle ? xHandle.replace("@", "").trim() : null;
      payload.x_keywords = keywordsArray;
    }

    const { error } = await supabase.from("branches").insert(payload);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setName("");
    setGoogleMapsUrl("");
    setXHandle("");
    setXKeywords("");
    setMessage("تمت إضافة الفرع بنجاح.");
    setLoading(false);

    router.refresh();
  }

  return (
    <div className="bg-white rounded-2xl border border-[#eeede8] p-6 mb-8">
      <h2 className="text-lg font-bold text-[#1a1a2e] mb-1">إضافة فرع جديد</h2>
      <p className="text-sm text-gray-500 mb-5">
        أضيفي بيانات الفرع حتى يتم سحب التعليقات وتحليلها لاحقًا.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">اسم الفرع</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: فرع الرياض"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">رابط Google Maps</label>
          <input
            type="url"
            value={googleMapsUrl}
            onChange={(e) => setGoogleMapsUrl(e.target.value)}
            placeholder="https://maps.app.goo.gl/..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
          />
        </div>

        {canUseX ? (
          <div className="rounded-xl bg-[#f9f8f5] border border-[#eeede8] p-4 space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                حساب X للفرع أو البراند
              </label>
              <input
                type="text"
                value={xHandle}
                onChange={(e) => setXHandle(e.target.value)}
                placeholder="@brandname"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">
                كلمات البحث في X
              </label>
              <input
                type="text"
                value={xKeywords}
                onChange={(e) => setXKeywords(e.target.value)}
                placeholder="مطعمك, اسم الفرع, اسم البراند"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
              />
              <p className="text-xs text-gray-400 mt-1">
                افصلي الكلمات بفاصلة.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-800">
            تحليل منصة X متاح في باقة Pro و Enterprise فقط.
          </div>
        )}

        {message && (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
            {message}
          </p>
        )}

        {error && (
          <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1a1a2e] text-white rounded-lg py-2.5 text-sm font-bold disabled:opacity-60"
        >
          {loading ? "جاري الحفظ..." : "إضافة الفرع"}
        </button>
      </form>
    </div>
  );
}
