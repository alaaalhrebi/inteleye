"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  MapPin,
  MessageCircle,
  Music2,
  Sparkles,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const platforms = [
  {
    key: "google_maps",
    name: "Google Maps",
    description: "تحليل تقييمات وتعليقات خرائط Google",
    icon: MapPin,
  },
  {
    key: "x",
    name: "X",
    description: "تحليل mentions والتعليقات من منصة X",
    icon: MessageCircle,
  },
  {
    key: "tiktok",
    name: "TikTok",
    description: "تحليل تعليقات المقاطع من TikTok",
    icon: Music2,
  },
];

export default function PlatformsOnboardingPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [clientId, setClientId] = useState<number | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState("google_maps");
  const [platformUrl, setPlatformUrl] = useState("");
  const [username, setUsername] = useState("");
  const [businessActivity, setBusinessActivity] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadClient() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: client, error } = await supabase
        .from("clients")
        .select("id, subscription_status, plan")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !client) {
        router.push("/signup");
        return;
      }

      const status = client.subscription_status?.toLowerCase();

      if (status !== "active" && status !== "paid" && status !== "completed") {
        router.push(`/checkout?plan=${client.plan || "basic"}`);
        return;
      }

      setClientId(client.id);
      setLoading(false);
    }

    loadClient();
  }, [router, supabase]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!clientId) {
      setMessage("لم يتم العثور على بيانات العميل");
      return;
    }

    if (!platformUrl.trim()) {
      setMessage("الرجاء إدخال رابط المنصة");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("client_platforms").insert({
      client_id: clientId,
      platform_name: selectedPlatform,
      platform_url: platformUrl,
      username: username || null,
      business_activity: businessActivity || null,
    });

    setSaving(false);

    if (error) {
      setMessage("حدث خطأ أثناء حفظ المنصة");
      return;
    }

    router.push("/dashboard");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFFCF5] text-[#374375]">
        <p className="text-lg font-bold">جاري التحقق من الحساب...</p>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#FFFCF5] px-6 py-12 text-[#374375]"
    >
      <div className="absolute right-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-[#BABDE2]/50 blur-[120px]" />
      <div className="absolute bottom-[-120px] left-[-120px] h-[360px] w-[360px] rounded-full bg-[#DFAEA1]/40 blur-[120px]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full bg-[#BABDE2]/35 px-5 py-2 text-sm font-bold">
            <Sparkles size={16} />
            إعداد حسابك
          </div>

          <h1 className="text-4xl font-extrabold">
            اختر المنصة التي تريد تحليلها
          </h1>

          <p className="mt-4 text-lg text-gray-500">
            اختر المنصة الأولى التي تريد ربطها، ويمكنك إضافة منصات أخرى لاحقًا حسب باقتك.
          </p>
        </div>

        <form
          onSubmit={handleSave}
          className="mx-auto max-w-5xl rounded-[2rem] border border-[#BABDE2]/40 bg-white/90 p-8 shadow-2xl"
        >
          <div className="grid gap-5 md:grid-cols-3">
            {platforms.map((platform) => {
              const Icon = platform.icon;
              const active = selectedPlatform === platform.key;

              return (
                <button
                  key={platform.key}
                  type="button"
                  onClick={() => setSelectedPlatform(platform.key)}
                  className={`rounded-[1.5rem] border p-6 text-right transition ${
                    active
                      ? "border-[#374375] bg-[#374375] text-white shadow-xl"
                      : "border-gray-200 bg-white text-[#374375] hover:bg-[#BABDE2]/20"
                  }`}
                >
                  <div
                    className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${
                      active ? "bg-white/15" : "bg-[#BABDE2]/30"
                    }`}
                  >
                    <Icon size={24} />
                  </div>

                  <h2 className="text-xl font-extrabold">{platform.name}</h2>
                  <p
                    className={`mt-3 leading-7 ${
                      active ? "text-white/80" : "text-gray-500"
                    }`}
                  >
                    {platform.description}
                  </p>

                  {active && (
                    <div className="mt-5 flex items-center gap-2 text-sm font-bold">
                      <CheckCircle2 size={18} />
                      تم الاختيار
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold">
                رابط المنصة
              </label>
              <input
                value={platformUrl}
                onChange={(e) => setPlatformUrl(e.target.value)}
                placeholder="ضع رابط Google Maps أو X أو TikTok"
                className="w-full rounded-2xl border border-gray-200 px-4 py-4 text-right outline-none transition focus:border-[#374375] focus:ring-4 focus:ring-[#BABDE2]/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                اسم المستخدم أو اسم الحساب
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="@username"
                className="w-full rounded-2xl border border-gray-200 px-4 py-4 text-right outline-none transition focus:border-[#374375] focus:ring-4 focus:ring-[#BABDE2]/30"
              />
            </div>
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm font-bold">
              نشاط المنشأة
            </label>
            <input
              value={businessActivity}
              onChange={(e) => setBusinessActivity(e.target.value)}
              placeholder="مثال: مطعم، عيادة، مقهى، متجر"
              className="w-full rounded-2xl border border-gray-200 px-4 py-4 text-right outline-none transition focus:border-[#374375] focus:ring-4 focus:ring-[#BABDE2]/30"
            />
          </div>

          {message && (
            <p className="mt-5 rounded-2xl bg-[#DFAEA1]/30 px-4 py-3 text-center text-sm font-bold text-[#895159]">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-8 w-full rounded-2xl bg-[#374375] px-6 py-4 text-lg font-extrabold text-white shadow-lg transition hover:bg-[#895159] disabled:opacity-60"
          >
            {saving ? "جاري حفظ المنصة..." : "حفظ المنصة والانتقال للداشبورد"}
          </button>
        </form>
      </div>
    </main>
  );
}
