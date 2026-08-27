"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  Globe2,
  MapPin,
  MessageCircle,
  Music2,
  Instagram,
  Plus,
  Sparkles,
} from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { getSubscriptionPermissions } from "@/lib/subscription-permissions";

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
  }
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
type BranchOption = { id: number; name: string };
type PlatformScope = "" | "global" | "existing_branch" | "new_branch";

export default function PlatformsOnboardingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [platformLimit, setPlatformLimit] = useState(1);
  const [existingPlatformsCount, setExistingPlatformsCount] = useState(0);
  const [existingPlatformNames, setExistingPlatformNames] = useState<string[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [canCreateBranch, setCanCreateBranch] = useState(false);
  const [scope, setScope] = useState<PlatformScope>("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [newBranchName, setNewBranchName] = useState("");

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
        .select(
          "id, subscription_status, plan, trial_ends_at, current_period_end, allowed_platforms_count"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (clientError || !client) {
        router.push("/signup");
        return;
      }

      const permissions = getSubscriptionPermissions(client);

      if (!permissions.canAccessDashboard || !permissions.canUsePlatform) {
        router.replace("/pricing?reason=subscription_required");
        return;
      }

      const [platformsResult, branchesResult] = await Promise.all([
        supabase
          .from("client_platforms")
          .select("id, platform_name, branch_id")
          .eq("client_id", client.id)
          .eq("is_active", true),
        supabase
          .from("branches")
          .select("id, name")
          .eq("client_id", client.id)
          .eq("is_active", true)
          .order("created_at", { ascending: true }),
      ]);

      if (platformsResult.error || branchesResult.error) {
        setMessage("حدث خطأ أثناء التحقق من المنصات والفروع الحالية");
        setLoading(false);
        return;
      }

      const currentBranches = (branchesResult.data ?? []) as BranchOption[];
      const uniquePlatformNames = new Set(
        (platformsResult.data ?? []).map((platform) => platform.platform_name)
      );
      const permissionsWithUsage = getSubscriptionPermissions(client, {
        currentBranchesCount: currentBranches.length,
        currentPlatformsCount: uniquePlatformNames.size,
      });

      setPlatformLimit(permissions.platformLimit);
      setExistingPlatformsCount(uniquePlatformNames.size);
      setExistingPlatformNames(Array.from(uniquePlatformNames));
      setBranches(currentBranches);
      setCanCreateBranch(permissionsWithUsage.canAddBranch);

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

    if (!scope) {
      setMessage("الرجاء تحديد ما إذا كانت المنصة شاملة أو مرتبطة بفرع");
      return;
    }

    if (scope === "existing_branch" && !selectedBranchId) {
      setMessage("الرجاء اختيار الفرع المطلوب");
      return;
    }

    if (scope === "new_branch" && !newBranchName.trim()) {
      setMessage("الرجاء إدخال اسم الفرع الجديد");
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

    const isNewPlatformType = !existingPlatformNames.includes(selectedPlatform);
    if (isNewPlatformType && existingPlatformsCount >= platformLimit) {
      setMessage("وصلت إلى حد أنواع المنصات في باقتك الحالية");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/platforms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformName: selectedPlatform,
          platformValue: selectedPlatform === "x" ? username : platformUrl,
          businessActivity: businessActivity.trim(),
          scope,
          branchId: scope === "existing_branch" ? selectedBranchId : null,
          branchName: scope === "new_branch" ? newBranchName.trim() : null,
        }),
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(result.message || "حدث خطأ أثناء حفظ المنصة");
        setSaving(false);
        return;
      }
    } catch {
      setMessage("تعذر الاتصال بالخادم. حاول مرة أخرى");
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
      className="relative min-h-screen overflow-hidden bg-[#FFFCF5] px-4 py-8 sm:px-6 sm:py-12 text-[#374375]"
    >
      <div className="absolute right-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-[#BABDE2]/50 blur-[120px]" />
      <div className="absolute bottom-[-120px] left-[-120px] h-[360px] w-[360px] rounded-full bg-[#DFAEA1]/40 blur-[120px]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-6 flex justify-start">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-full border border-[#374375] bg-white px-5 py-3 text-sm font-bold text-[#374375] transition hover:bg-[#374375] hover:text-white"
            >
              الرجوع للداشبورد
            </Link>
          </div>
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full bg-[#BABDE2]/35 px-5 py-2 text-sm font-bold">
            <Sparkles size={16} />
            إعداد حسابك
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold">
            اختر المنصة التي تريد تحليلها
          </h1>

          <p className="mt-4 text-base sm:text-lg text-gray-500">
            أدخلي بيانات المنصة حسب نوعها، وسيتم استخدامها في السحب والتحليل لاحقًا.
          </p>
        </div>

        <form
          onSubmit={handleSave}
          className="mx-auto max-w-5xl rounded-[2rem] border border-[#BABDE2]/40 bg-white/90 p-4 sm:p-6 lg:p-8 shadow-2xl"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {platforms.map((platform) => {
              const Icon = platform.icon;
              const active = selectedPlatform === platform.key;

              return (
                <button
                  key={platform.key}
                  type="button"
                  onClick={() => handlePlatformChange(platform.key)}
                  className={`rounded-[1.5rem] border p-4 text-right transition ${
                    active
                      ? "border-[#374375] bg-[#374375] text-white shadow-xl"
                      : "border-gray-200 bg-white text-[#374375] hover:bg-[#BABDE2]/20"
                  }`}
                >
                  <div
                    className={`mb-5 flex h-10 w-10 items-center justify-center rounded-2xl ${
                      active ? "bg-white/15" : "bg-[#BABDE2]/30"
                    }`}
                  >
                    <Icon size={24} />
                  </div>

                  <h2 className="text-lg font-extrabold">{platform.name}</h2>

                  <p
                    className={`mt-2 text-sm leading-6 ${
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

          <section className="mt-8 rounded-[1.75rem] border border-[#BABDE2]/40 bg-[#F8F7F3] p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-lg font-extrabold">حدد نطاق المنصة</h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                اختر ربط المنصة بجميع الفروع أو بفرع محدد. يجب تحديد النطاق قبل الحفظ.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <ScopeButton
                active={scope === "global"}
                icon={<Globe2 size={21} />}
                title="شاملة لجميع الفروع"
                description="تظهر بيانات المنصة على مستوى الحساب كاملًا."
                onClick={() => {
                  setScope("global");
                  setMessage("");
                }}
              />
              <ScopeButton
                active={scope === "existing_branch"}
                disabled={branches.length === 0}
                icon={<Building2 size={21} />}
                title="فرع موجود"
                description={
                  branches.length > 0
                    ? "اربط المنصة بأحد فروعك الحالية."
                    : "لا توجد فروع حالية للاختيار منها."
                }
                onClick={() => {
                  setScope("existing_branch");
                  setMessage("");
                }}
              />
              <ScopeButton
                active={scope === "new_branch"}
                disabled={!canCreateBranch}
                icon={<Plus size={21} />}
                title="إنشاء فرع"
                description={
                  canCreateBranch
                    ? "أنشئ فرعًا جديدًا واربط المنصة به مباشرة."
                    : "إنشاء فرع جديد غير متاح حسب باقتك الحالية."
                }
                onClick={() => {
                  setScope("new_branch");
                  setMessage("");
                }}
              />
            </div>

            {scope === "existing_branch" && (
              <div className="mt-4">
                <label className="mb-2 block text-sm font-bold">اختر الفرع</label>
                <select
                  value={selectedBranchId}
                  onChange={(event) => setSelectedBranchId(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 text-right outline-none transition focus:border-[#374375] focus:ring-4 focus:ring-[#BABDE2]/30"
                >
                  <option value="">اختر فرعًا</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {scope === "new_branch" && (
              <div className="mt-4">
                <label className="mb-2 block text-sm font-bold">اسم الفرع الجديد</label>
                <input
                  value={newBranchName}
                  onChange={(event) => setNewBranchName(event.target.value)}
                  placeholder="مثال: فرع الرياض"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 text-right outline-none transition focus:border-[#374375] focus:ring-4 focus:ring-[#BABDE2]/30"
                />
              </div>
            )}
          </section>

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

          {existingPlatformNames.includes(selectedPlatform) ? (
            <p className="mt-5 rounded-2xl bg-[#BABDE2]/20 px-4 py-3 text-center text-sm font-bold text-[#374375]">
              نوع المنصة مستخدم في حسابك، ويمكن ربط حساب مختلف منه بفرع آخر دون احتسابه كنوع جديد.
            </p>
          ) : existingPlatformsCount >= platformLimit ? (
            <p className="mt-5 rounded-2xl bg-[#DFAEA1]/25 px-4 py-3 text-center text-sm font-bold text-[#895159]">
              وصلت إلى حد أنواع المنصات في باقتك ({existingPlatformsCount} من {platformLimit}).
            </p>
          ) : null}

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

function ScopeButton({
  active,
  disabled = false,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-2xl border p-4 text-right transition ${
        active
          ? "border-[#374375] bg-[#374375] text-white"
          : "border-[#BABDE2]/50 bg-white text-[#374375] hover:border-[#374375]"
      } disabled:cursor-not-allowed disabled:opacity-45`}
    >
      <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#BABDE2]/30">
        {icon}
      </span>
      <span className="block font-extrabold">{title}</span>
      <span className={`mt-1 block text-xs leading-5 ${active ? "text-white/75" : "text-gray-500"}`}>
        {description}
      </span>
    </button>
  );
}
