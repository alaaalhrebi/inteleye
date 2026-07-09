
"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  MapPin,
  MessageCircle,
  Music2,
  Instagram,
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
  {
    key: "instagram",
    name: "Instagram",
    description: "تحليل تعليقات المقاطع من Instagram",
    icon: Instagram,
  },
];

function getPlatformLimit(plan: string) {
  const normalizedPlan = plan?.toLowerCase();

  if (normalizedPlan === "enterprise") return 20;
  if (normalizedPlan === "pro") return 2;

  return 1;
}

function getPlatformInputConfig(selectedPlatform: string) {
  if (selectedPlatform === "google_maps") {
    return {
      fieldName: "platformUrl",
      label: "رابط الموقع في Google Maps",
      placeholder: "مثال: https://maps.app.goo.gl/xxxx",
      helpText: "ضعي رابط موقع المنشأة أو الفرع من Google Maps.",
    };
  }

  if (selectedPlatform === "x") {
    return {
      fieldName: "username",
      label: "اسم المستخدم في X",
      placeholder: "مثال: @username",
      helpText: "ضعي اسم الحساب في منصة X بدون رابط.",
    };
  }

  if (selectedPlatform === "tiktok") {
    return {
      fieldName: "platformUrl",
      label: "رابط حساب TikTok",
      placeholder: "مثال: https://www.tiktok.com/@username",
      helpText: "ضعي رابط حساب TikTok الخاص بالمنشأة.",
    };
    if (selectedPlatform === "instagram") {
    return {
      fieldName: "platformUrl",
      label: "رابط حساب instagram",
      placeholder: "مثال: https://www.instagram.com/@username",
      helpText: "ضعي رابط حساب instagram الخاص بالمنشأة.",
    };
  }

  return {
    fieldName: "platformUrl",
    label: "رابط المنصة",
    placeholder: "ضع رابط المنصة",
    helpText: "",
  };
}
}
export default function PlatformsOnboardingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [clientId, setClientId] = useState<number | null>(null);
  const [clientPlan, setClientPlan] = useState("basic");
  const [existingPlatformsCount, setExistingPlatformsCount] = useState(0);

  const [selectedPlatform, setSelectedPlatform] = useState("google_maps");
  const [platformUrl, setPlatformUrl] = useState("");
  const [username, setUsername] = useState("");
  const [businessActivity, setBusinessActivity] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const inputConfig = getPlatformInputConfig(selectedPlatform);

  useEffect(() => {
    async function loadClient() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id, subscription_status, plan")
        .eq("user_id", user.id)
        .maybeSingle();

      if (clientError || !client) {
        router.push("/signup");
        return;
      }

      const status = client.subscription_status?.toLowerCase();

      if (status !== "active" && status !== "paid" && status !== "completed") {
        router.push(`/checkout?plan=${client.plan || "basic"}`);
        return;
      }

      const { data: currentPlatforms, error: platformsError } = await supabase
        .from("client_platforms")
        .select("id, platform_name")
        .eq("client_id", client.id)
        .eq("is_active", true);

      if (platformsError) {
        setMessage("حدث خطأ أثناء التحقق من المنصات الحالية");
        setLoading(false);
        return;
      }

      const plan = client.plan || "basic";
      const count = currentPlatforms?.length ?? 0;

      setClientId(client.id);
      setClientPlan(plan);
      setExistingPlatformsCount(count);


      setLoading(false);
    }

    loadClient();
  }, [router, supabase]);

  function handlePlatformChange(platformKey: string) {
    setSelectedPlatform(platformKey);
    setPlatformUrl("");
    setUsername("");
    setMessage("");
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!clientId) {
      setMessage("لم يتم العثور على بيانات العميل");
      return;
    }

    if (!businessActivity.trim()) {
      setMessage("الرجاء إدخال نشاط المنشأة");
      return;
    }

    if (selectedPlatform === "google_maps" && !platformUrl.trim()) {
      setMessage("الرجاء إدخال رابط الموقع في Google Maps");
      return;
    }

    if (selectedPlatform === "x" && !username.trim()) {
      setMessage("الرجاء إدخال اسم المستخدم في X");
      return;
    }

    if (selectedPlatform === "tiktok" && !platformUrl.trim()) {
      setMessage("الرجاء إدخال رابط حساب TikTok");
      return;
    }
    if (selectedPlatform === "instagram" && !platformUrl.trim()) {
      setMessage("الرجاء إدخال رابط حساب Instagram");
      return;
    }

    const limit = getPlatformLimit(clientPlan);

    if (existingPlatformsCount >= limit) {
      setMessage("وصلت للحد الأعلى من المنصات في باقتك الحالية");
      return;
    }

    setSaving(true);
    setMessage("");

    const { data: existingPlatform, error: existingError } = await supabase
      .from("client_platforms")
      .select("id")
      .eq("client_id", clientId)
      .eq("platform_name", selectedPlatform)
      .eq("is_active", true)
      .maybeSingle();

    if (existingError) {
      console.error("Check existing platform error:", existingError);
      setMessage("حدث خطأ أثناء التحقق من المنصة");
      setSaving(false);
      return;
    }

    if (existingPlatform) {
      setMessage("هذه المنصة مضافة مسبقًا لهذا الحساب");
      setSaving(false);
      return;
    }

    const finalPlatformUrl =
      selectedPlatform === "x" ? null : platformUrl.trim();

    const finalUsername =
      selectedPlatform === "x" ? username.trim() : username.trim() || null;

    const { error: insertError } = await supabase.from("client_platforms").insert({
      client_id: clientId,
      platform_name: selectedPlatform,
      platform_url: finalPlatformUrl,
      username: finalUsername,
      business_activity: businessActivity.trim(),
      is_active: true,
    });

    if (insertError) {
      console.error("Save platform error:", insertError);

      if (insertError.code === "23505") {
        setMessage("هذه المنصة مضافة مسبقًا لهذا الحساب");
        setSaving(false);
        return;
      }

      setMessage("حدث خطأ أثناء حفظ المنصة");
      setSaving(false);
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
            أدخلي بيانات المنصة حسب نوعها، وسيتم استخدامها في السحب والتحليل لاحقًا.
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
                  onClick={() => handlePlatformChange(platform.key)}
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
                {inputConfig.label}
              </label>

              <input
                value={
                  inputConfig.fieldName === "username" ? username : platformUrl
                }
                onChange={(e) => {
                  if (inputConfig.fieldName === "username") {
                    setUsername(e.target.value);
                  } else {
                    setPlatformUrl(e.target.value);
                  }
                }}
                placeholder={inputConfig.placeholder}
                className="w-full rounded-2xl border border-gray-200 px-4 py-4 text-right outline-none transition focus:border-[#374375] focus:ring-4 focus:ring-[#BABDE2]/30"
              />

              {inputConfig.helpText && (
                <p className="mt-2 text-xs font-bold text-gray-400">
                  {inputConfig.helpText}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                نشاط المنشأة
              </label>

              <input
                value={businessActivity}
                onChange={(e) => setBusinessActivity(e.target.value)}
                placeholder="مثال: مطعم، عيادة، مقهى، متجر"
                className="w-full rounded-2xl border border-gray-200 px-4 py-4 text-right outline-none transition focus:border-[#374375] focus:ring-4 focus:ring-[#BABDE2]/30"
              />

              <p className="mt-2 text-xs font-bold text-gray-400">
                يساعدنا النشاط في تحسين التحليل والردود المقترحة.
              </p>
            </div>
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
