"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import type { DashboardPeriodKey } from "@/lib/dashboard-analytics";

type Branch = { id: number; name: string };
type Platform = { id: number; branch_id: number | null; platform_name: string };
export type DashboardFilterScope = { branchId: number | null; platformId: number | null; period: DashboardPeriodKey };
const periodLabels: Record<DashboardPeriodKey, string> = {
  this_week: "هذا الأسبوع", last_week: "الأسبوع الماضي", this_month: "هذا الشهر",
  last_60_days: "آخر شهرين", last_90_days: "آخر 3 أشهر", last_180_days: "آخر 6 أشهر",
};

export default function DashboardFilters({ branches, platforms, appliedScope, hasError = false }: {
  branches: Branch[];
  platforms: Platform[];
  appliedScope: DashboardFilterScope;
  hasError?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [showLoading, setShowLoading] = useState(false);
  const [navigationError, setNavigationError] = useState(false);

  useEffect(() => {
    if (!isPending) { setShowLoading(false); return; }
    const timer = window.setTimeout(() => setShowLoading(true), 300);
    return () => window.clearTimeout(timer);
  }, [isPending]);

  // Labels and controls describe the server-rendered data, never a speculative URL.
  const selectedBranch = appliedScope.branchId === null ? "all" : String(appliedScope.branchId);
  const selectedPlatform = appliedScope.platformId === null ? "all" : String(appliedScope.platformId);
  const availablePlatforms = useMemo(() => platforms.filter(platform =>
    appliedScope.branchId === null || platform.branch_id === null || platform.branch_id === appliedScope.branchId
  ), [platforms, appliedScope.branchId]);
  const branchNames = useMemo(() => new Map(branches.map(branch => [branch.id, branch.name])), [branches]);
  const scopeLabel = [
    appliedScope.branchId === null ? "كل الفروع" : branchNames.get(appliedScope.branchId) || "فرع غير محدد",
    appliedScope.platformId === null ? "كل المنصات" : formatPlatform(platforms.find(p => p.id === appliedScope.platformId)?.platform_name || "منصة غير محددة"),
    periodLabels[appliedScope.period],
  ].join(" · ");
  const hasFilters = selectedBranch !== "all" || selectedPlatform !== "all" || appliedScope.period !== "this_week";

  function navigate(url?: string) {
    if (isPending) return;
    setNavigationError(false);
    try {
      startTransition(() => {
        if (url) router.push(url, { scroll: false });
        else router.refresh();
      });
    } catch { setNavigationError(true); }
  }

  function updateFilter(key: "branch" | "platform" | "period", value: string) {
    if (isPending) return;
    const current = key === "branch" ? selectedBranch : key === "platform" ? selectedPlatform : appliedScope.period;
    if (value === current) return;
    const params = new URLSearchParams(searchParams.toString());
    // Normalize stale or invalid query values to the scope authorized by the server.
    for (const [name, current] of [["branch", selectedBranch], ["platform", selectedPlatform], ["period", appliedScope.period]]) {
      if (current === "all" || (name === "period" && current === "this_week")) params.delete(name);
      else params.set(name, current);
    }
    if (value === "all" || (key === "period" && value === "this_week")) params.delete(key);
    else params.set(key, value);
    if (key === "branch") {
      const currentPlatform = platforms.find(platform => platform.id === Number(params.get("platform")));
      if (currentPlatform && value !== "all" && currentPlatform.branch_id !== null && currentPlatform.branch_id !== Number(value)) params.delete("platform");
    }
    const query = params.toString();
    if (query === searchParams.toString()) return;
    navigate(query ? `/dashboard?${query}` : "/dashboard");
  }

  return (
    <>
      <section aria-labelledby="dashboard-filters-heading" aria-busy={isPending}
        className="no-print rounded-xl border border-[#BABDE2]/40 bg-white px-3 py-2.5 text-[#374375] shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5">
            <h2 id="dashboard-filters-heading" className="flex items-center gap-1.5 text-sm font-extrabold">
              <SlidersHorizontal size={16} aria-hidden="true" className="shrink-0" />تخصيص عرض لوحة التحكم
            </h2>
            <p className="text-[11px] leading-5 text-gray-500">تتغير النتائج تلقائيًا حسب اختيارك</p>
          </div>
          <button type="button" disabled={isPending || !hasFilters} onClick={() => navigate("/dashboard")}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-bold text-[#895159] hover:bg-[#DFAEA1]/15 disabled:cursor-default disabled:opacity-40">
            <RotateCcw size={12} aria-hidden="true" />إعادة ضبط
          </button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:gap-3">
          <FilterSelect id="dashboard-filter-branch" label="الفرع" value={selectedBranch} disabled={isPending} onChange={value => updateFilter("branch", value)}>
            <option value="all">كل الفروع</option>
            {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </FilterSelect>
          <FilterSelect id="dashboard-filter-platform" label="المنصة" value={selectedPlatform} disabled={isPending} onChange={value => updateFilter("platform", value)}>
            <option value="all">كل المنصات</option>
            {availablePlatforms.map(platform => <option key={platform.id} value={platform.id}>
              {formatPlatform(platform.platform_name)}{platform.branch_id === null ? " — عامة لكل الفروع" : selectedBranch === "all" ? ` — ${branchNames.get(platform.branch_id) || "فرع"}` : ""}
            </option>)}
          </FilterSelect>
          <FilterSelect id="dashboard-filter-period" label="الفترة" value={appliedScope.period} disabled={isPending} onChange={value => updateFilter("period", value)}>
            {Object.entries(periodLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </FilterSelect>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs leading-5">
          <p aria-label="نطاق البيانات المعروض"><span className="text-gray-500">{hasError ? "النطاق المطلوب: " : "العرض الحالي: "}</span><strong>{scopeLabel}</strong></p>
          {isPending && <p role="status" className="text-[#895159]">جارٍ تحديث النتائج…</p>}
        </div>
        {(hasError || navigationError) && <div role="alert" className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#DFAEA1]/15 px-2 py-1.5 text-xs leading-5 text-[#895159]">
          <p>{hasError ? "تعذر تحميل بعض البيانات لهذا الاختيار؛ النتائج المتاحة قد تكون غير مكتملة." : "تعذر تحديث العرض. أعد المحاولة."}</p>
          <button type="button" disabled={isPending} onClick={() => navigate()} className="shrink-0 font-bold underline underline-offset-2 disabled:opacity-50">إعادة المحاولة</button>
        </div>}
      </section>
      {showLoading && isPending ? createPortal(<DashboardRefreshOverlay />, document.body) : null}
    </>
  );
}

function FilterSelect({ id, label, value, onChange, children, disabled = false }: {
  id: string; label: string; value: string; onChange: (value: string) => void; children: ReactNode; disabled?: boolean;
}) {
  return <div className="min-w-0">
    <label htmlFor={id} className="mb-1 block text-[11px] font-bold text-gray-500">{label}</label>
    <select id={id} value={value} disabled={disabled} onChange={event => onChange(event.target.value)}
      className="min-h-9 w-full min-w-0 rounded-lg border border-[#BABDE2]/50 bg-[#F8F7F3] px-1.5 py-1.5 text-[11px] font-bold text-[#374375] outline-none transition focus:border-[#374375] focus:ring-2 focus:ring-[#BABDE2]/30 disabled:cursor-wait disabled:opacity-60 sm:px-2 sm:text-sm">
      {children}
    </select>
  </div>;
}

function DashboardRefreshOverlay() {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#16172E]/25 px-5 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-label="جارٍ تحديث لوحة التحكم"
    >
      <div className="w-full max-w-xs rounded-[1.75rem] border border-white/60 bg-white/95 p-6 text-center shadow-2xl">
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full border border-[#BABDE2]/60" />
          <span className="absolute inset-1 animate-spin rounded-full border-2 border-transparent border-t-[#374375]" />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#F8F7F3] shadow-sm">
            <Image
              src="/logo.png"
              alt="IntelEye"
              width={48}
              height={48}
              priority
              className="h-12 w-12 object-contain"
            />
          </span>
        </div>
        <p className="mt-4 text-lg font-black text-[#374375]">
          جارٍ تحديث لوحة التحكم…
        </p>
        <p className="mt-2 text-sm font-bold leading-6 text-gray-500">
          يتم تطبيق الفلاتر المختارة وتحضير أحدث النتائج
        </p>
      </div>
    </div>
  );
}

function formatPlatform(platform: string) {
  if (platform === "google_maps") {
    return "Google Maps";
  }

  if (platform === "x") {
    return "X";
  }

  if (platform === "tiktok") {
    return "TikTok";
  }

  if (platform === "instagram") {
    return "Instagram";
  }

  return platform;
}
