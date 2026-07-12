
"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import {
  Building2,
  CheckCircle2,
  Instagram,
  MapPin,
  MessageCircle,
  Music2,
  Plus,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type AddBranchFormProps = {
  clientId: number;
  plan?: string;
  canUseX?: boolean;
};

const platformOptions = [
  {
    key: "google_maps",
    name: "Google Maps",
    description: "تقييمات وتعليقات خرائط Google",
    icon: MapPin,
  },
  {
    key: "x",
    name: "X",
    description: "متابعة mentions والتعليقات في X",
    icon: MessageCircle,
  },
  {
    key: "tiktok",
    name: "TikTok",
    description: "تحليل تعليقات مقاطع TikTok",
    icon: Music2,
  },
  {
    key: "instagram",
    name: "Instagram",
    description: "تحليل تعليقات Instagram",
    icon: Instagram,
  },
];

function getPlatformLimit(plan: string) {
  const normalizedPlan = plan?.toLowerCase();

  if (normalizedPlan === "enterprise") return 20;
  if (normalizedPlan === "pro") return 2;

  return 1;
}

function getPlatformInputConfig(platform: string) {
  if (platform === "google_maps") {
    return {
      label: "رابط Google Maps",
      placeholder: "مثال: https://maps.app.goo.gl/xxxx",
      helpText: "ضعي رابط الفرع في Google Maps.",
      type: "url",
    };
  }

  if (platform === "x") {
    return {
      label: "اسم المستخدم في X",
      placeholder: "مثال: top_5 أو @top_5",
      helpText: "ضعي اسم الحساب بدون رابط.",
      type: "username",
    };
  }

  if (platform === "tiktok") {
    return {
      label: "رابط حساب TikTok",
      placeholder: "مثال: https://www.tiktok.com/@username",
      helpText: "ضعي رابط حساب TikTok الخاص بالفرع أو البراند.",
      type: "url",
    };
  }

  if (platform === "instagram") {
    return {
      label: "رابط حساب Instagram",
      placeholder: "مثال: https://www.instagram.com/username",
      helpText: "ضعي رابط حساب Instagram الخاص بالفرع أو البراند.",
      type: "url",
    };
  }

  return {
    label: "رابط المنصة",
    placeholder: "ضعي رابط المنصة",
    helpText: "",
    type: "url",
  };
}

function normalizeUsername(value: string) {
  return value.trim().replace(/^@/, "");
}

export default function AddBranchForm({
  clientId,
  plan = "basic",
}: AddBranchFormProps) {
  const supabase = createSupabaseBrowserClient();

  const [branchName, setBranchName] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("google_maps");
  const [platformValue, setPlatformValue] = useState("");
  const [businessActivity, setBusinessActivity] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const inputConfig = getPlatformInputConfig(selectedPlatform);

  function handlePlatformChange(platformKey: string) {
    setSelectedPlatform(platformKey);
    setPlatformValue("");
    setMessage("");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!branchName.trim()) {
      setMessage("الرجاء إدخال اسم الفرع");
      return;
    }

    if (!platformValue.trim()) {
      setMessage(`الرجاء إدخال ${inputConfig.label}`);
      return;
    }

    if (!businessActivity.trim()) {
      setMessage("الرجاء إدخال نشاط المنشأة");
      return;
    }

    setSaving(true);
    setMessage("");

    const { data: activePlatforms, error: activePlatformsError } =
      await supabase
        .from("client_platforms")
        .select("platform_name")
        .eq("client_id", clientId)
        .eq("is_active", true);

    if (activePlatformsError) {
      console.error("Active platforms error:", activePlatformsError);
      setMessage("حدث خطأ أثناء التحقق من المنصات الحالية");
      setSaving(false);
      return;
    }

    const usedPlatformNames = new Set(
      (activePlatforms ?? []).map((item) => item.platform_name)
    );

    const platformLimit = getPlatformLimit(plan);
    const isNewPlatformType = !usedPlatformNames.has(selectedPlatform);

    if (isNewPlatformType && usedPlatformNames.size >= platformLimit) {
      setMessage(
        `باقتك الحالية تسمح بعدد ${platformLimit} منصة فقط. للزيادة يمكنك الترقية إلى باقة أعلى.`
      );
      setSaving(false);
      return;
    }

    const cleanUsername =
      selectedPlatform === "x" ? normalizeUsername(platformValue) : "";

    const finalPlatformUrl =
      selectedPlatform === "x"
        ? `https://x.com/${cleanUsername}`
        : platformValue.trim();

    const finalUsername =
      selectedPlatform === "x" ? cleanUsername : null;

    const { data: branch, error: branchError } = await supabase
      .from("branches")
      .insert({
        client_id: clientId,
        name: branchName.trim(),
        google_maps_url:
          selectedPlatform === "google_maps" ? finalPlatformUrl : null,
        x_handle: selectedPlatform === "x" ? cleanUsername : null,
      })
      .select("id")
      .single();

    if (branchError || !branch) {
      console.error("Branch insert error:", branchError);
      setMessage("حدث خطأ أثناء حفظ الفرع");
      setSaving(false);
      return;
    }

    const { error: platformError } = await supabase
      .from("client_platforms")
      .insert({
        client_id: clientId,
        branch_id: branch.id,
        platform_name: selectedPlatform,
        platform_url: finalPlatformUrl,
        username: finalUsername,
        business_activity: businessActivity.trim(),
        is_active: true,
      });

    if (platformError) {
      console.error("Platform insert error:", platformError);

      if (platformError.code === "23505") {
        setMessage("هذه المنصة مضافة مسبقًا لهذا الفرع");
        setSaving(false);
        return;
      }

      setMessage(`تم حفظ الفرع، لكن حدث خطأ أثناء ربط المنصة: ${platformError.message}`);
      setSaving(false);
      return;
    }

    setMessage("تمت إضافة الفرع والمنصة بنجاح");

    setBranchName("");
    setPlatformValue("");
    setBusinessActivity("");
    setSelectedPlatform("google_maps");
    setSaving(false);

    window.location.reload();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[2rem] border border-[#BABDE2]/30 bg-white p-6"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#BABDE2]/30 text-[#374375]">
          <Building2 size={22} />
        </div>

        <div>
          <p className="text-xs font-bold text-gray-400">إضافة فرع جديد</p>
          <h3 className="text-xl font-extrabold text-[#374375]">
            بيانات الفرع والمنصة
          </h3>
        </div>
      </div>

      <div className="mb-6">
        <label className="mb-2 block text-sm font-bold text-[#374375]">
          اسم الفرع
        </label>

        <input
          value={branchName}
          onChange={(e) => setBranchName(e.target.value)}
          placeholder="مثال: فرع الرياض"
          className="w-full rounded-2xl border border-gray-200 px-4 py-4 text-right outline-none transition focus:border-[#374375] focus:ring-4 focus:ring-[#BABDE2]/30"
        />
      </div>

      <div className="mb-6">
        <label className="mb-3 block text-sm font-bold text-[#374375]">
          اختر المنصة المرتبطة بهذا الفرع
        </label>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {platformOptions.map((platform) => {
            const Icon = platform.icon;
            const active = selectedPlatform === platform.key;

            return (
              <button
                key={platform.key}
                type="button"
                onClick={() => handlePlatformChange(platform.key)}
                className={`rounded-[1.25rem] border p-4 text-right transition ${
                  active
                    ? "border-[#374375] bg-[#374375] text-white shadow-lg"
                    : "border-gray-200 bg-[#F8F7F3] text-[#374375] hover:bg-[#BABDE2]/20"
                }`}
              >
                <div
                  className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${
                    active ? "bg-white/15" : "bg-[#BABDE2]/30"
                  }`}
                >
                  <Icon size={22} />
                </div>

                <h4 className="text-base font-extrabold">{platform.name}</h4>

                <p
                  className={`mt-2 text-xs leading-6 ${
                    active ? "text-white/80" : "text-gray-500"
                  }`}
                >
                  {platform.description}
                </p>

                {active && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-bold">
                    <CheckCircle2 size={15} />
                    تم الاختيار
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-bold text-[#374375]">
            {inputConfig.label}
          </label>

          <input
            value={platformValue}
            onChange={(e) => setPlatformValue(e.target.value)}
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
          <label className="mb-2 block text-sm font-bold text-[#374375]">
            نشاط المنشأة
          </label>

          <input
            value={businessActivity}
            onChange={(e) => setBusinessActivity(e.target.value)}
            placeholder="مثال: مطعم، عيادة، مقهى، متجر"
            className="w-full rounded-2xl border border-gray-200 px-4 py-4 text-right outline-none transition focus:border-[#374375] focus:ring-4 focus:ring-[#BABDE2]/30"
          />

          <p className="mt-2 text-xs font-bold text-gray-400">
            يساعد النشاط في تحسين التحليل والردود المقترحة.
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
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#374375] px-6 py-4 text-lg font-extrabold text-white shadow-lg transition hover:bg-[#895159] disabled:opacity-60"
      >
        <Plus size={20} />
        {saving ? "جاري إضافة الفرع..." : "إضافة الفرع والمنصة"}
      </button>
    </form>
  );
}
