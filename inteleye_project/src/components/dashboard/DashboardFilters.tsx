"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import type { ReactNode } from "react";

type Branch = {
  id: number;
  name: string;
};

type Platform = {
  id: number;
  branch_id: number | null;
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
  const [isPending, startTransition] = useTransition();
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (!isPending) {
      setShowLoading(false);
      return;
    }

    const timer = window.setTimeout(() => setShowLoading(true), 300);
    return () => window.clearTimeout(timer);
  }, [isPending]);

  const selectedBranch =
    searchParams.get("branch") || "all";

  const availablePlatforms = useMemo(() => {
    if (selectedBranch === "all") {
      return platforms;
    }

    const branchId = Number(selectedBranch);

    return platforms.filter(
      (platform) =>
        platform.branch_id === null ||
        platform.branch_id === branchId
    );
  }, [platforms, selectedBranch]);

  const branchNames = useMemo(
    () =>
      new Map(
        branches.map((branch) => [
          branch.id,
          branch.name,
        ])
      ),
    [branches]
  );

  function updateFilter(
    key: string,
    value: string
  ) {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    /*
     * عند تغيير الفرع نحذف المنصة الحالية إذا
     * كانت مرتبطة بفرع مختلف.
     */
    if (key === "branch") {
      const currentPlatformId =
        params.get("platform");

      if (currentPlatformId) {
        const currentPlatform =
          platforms.find(
            (platform) =>
              platform.id ===
              Number(currentPlatformId)
          );

        if (
          currentPlatform &&
          value !== "all" &&
          currentPlatform.branch_id !== null &&
          currentPlatform.branch_id !==
            Number(value)
        ) {
          params.delete("platform");
        }
      }
    }

    const queryString = params.toString();
    if (queryString === searchParams.toString()) return;

    startTransition(() => {
      router.push(
        queryString
          ? `/dashboard?${queryString}`
          : "/dashboard"
      );
    });
  }

  return (
    <>
      <div className="space-y-3" aria-busy={isPending}>
        <FilterSelect
          label="اختيار الفرع"
          value={selectedBranch}
          disabled={isPending}
          onChange={(value) =>
            updateFilter("branch", value)
          }
        >
          <option value="all">كل الفروع</option>

          {branches.map((branch) => (
            <option
              key={branch.id}
              value={branch.id}
            >
              {branch.name}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="اختيار المنصة"
          value={
            searchParams.get("platform") ||
            "all"
          }
          disabled={isPending}
          onChange={(value) =>
            updateFilter("platform", value)
          }
        >
          <option value="all">
            كل المنصات
          </option>

          {availablePlatforms.map(
            (platform) => (
              <option
                key={platform.id}
                value={platform.id}
              >
                {formatPlatform(
                  platform.platform_name
                )}

                {platform.branch_id === null
                  ? " — عامة لكل الفروع"
                  : selectedBranch === "all"
                    ? ` — ${
                        branchNames.get(
                          platform.branch_id
                        ) || "فرع"
                      }`
                    : ""}
              </option>
            )
          )}
        </FilterSelect>

        <FilterSelect
          label="اختيار الفترة"
          value={
            searchParams.get("period") ||
            "this_week"
          }
          disabled={isPending}
          onChange={(value) =>
            updateFilter("period", value)
          }
        >
          <option value="this_week">
            هذا الأسبوع
          </option>

          <option value="last_week">
            الأسبوع الماضي
          </option>

          <option value="this_month">
            هذا الشهر
          </option>

          <option value="last_60_days">
            آخر شهرين
          </option>

          <option value="last_90_days">
            آخر 3 أشهر
          </option>

          <option value="last_180_days">
            آخر 6 أشهر
          </option>
        </FilterSelect>
      </div>

      {showLoading ? <DashboardRefreshOverlay /> : null}
    </>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-extrabold text-[#374375]">
        {label}
      </label>

      <select
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-[#BABDE2]/50 bg-[#F8F7F3] px-3 py-2.5 text-sm font-bold text-[#374375] outline-none transition focus:border-[#374375] focus:ring-4 focus:ring-[#BABDE2]/30 disabled:cursor-wait disabled:opacity-60"
      >
        {children}
      </select>
    </div>
  );
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
