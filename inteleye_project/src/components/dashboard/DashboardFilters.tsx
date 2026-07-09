"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

type Branch = {
  id: number;
  name: string;
};

type Platform = {
  id: number;
  platform_name: string;
};

export default function DashboardFilters({
  branches,
  platforms,
}: {
  branches: Branch[];
  platforms: Platform[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    const queryString = params.toString();
    router.push(queryString ? `/dashboard?${queryString}` : "/dashboard");
  }

  return (
    <div className="space-y-4">
      <FilterSelect
        label="اختيار الفرع"
        value={searchParams.get("branch") || "all"}
        onChange={(value) => updateFilter("branch", value)}
      >
        <option value="all">كل الفروع</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label="اختيار المنصة"
        value={searchParams.get("platform") || "all"}
        onChange={(value) => updateFilter("platform", value)}
      >
        <option value="all">كل المنصات</option>
        {platforms.map((platform) => (
          <option key={platform.id} value={platform.id}>
            {formatPlatform(platform.platform_name)}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label="اختيار الفترة"
        value={searchParams.get("period") || "this_week"}
        onChange={(value) => updateFilter("period", value)}
      >
        <option value="this_week">هذا الأسبوع</option>
        <option value="last_week">الأسبوع الماضي</option>
        <option value="this_month">هذا الشهر</option>
        <option value="last_60_days">آخر شهرين</option>
      </FilterSelect>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-extrabold text-[#374375]">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-[#BABDE2]/50 bg-[#F8F7F3] px-4 py-3 text-sm font-bold text-[#374375] outline-none transition focus:border-[#374375] focus:ring-4 focus:ring-[#BABDE2]/30"
      >
        {children}
      </select>
    </div>
  );
}

function formatPlatform(platform: string) {
  if (platform === "google_maps") return "Google Maps";
  if (platform === "x") return "X";
  if (platform === "tiktok") return "TikTok";
  if (platform === "instagram") return "Instagram";
  return platform;
}
