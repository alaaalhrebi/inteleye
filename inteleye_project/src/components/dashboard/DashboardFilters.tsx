"use client";

import { useMemo } from "react";
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

    router.push(
      queryString
        ? `/dashboard?${queryString}`
        : "/dashboard"
    );
  }

  return (
    <div className="space-y-3">
      <FilterSelect
        label="اختيار الفرع"
        value={selectedBranch}
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
      <label className="mb-1.5 block text-xs font-extrabold text-[#374375]">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-[#BABDE2]/50 bg-[#F8F7F3] px-3 py-2.5 text-xs font-bold text-[#374375] outline-none transition focus:border-[#374375] focus:ring-4 focus:ring-[#BABDE2]/30"
      >
        {children}
      </select>
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
