"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  RadioTower,
  Repeat2,
  Settings,
} from "lucide-react";

import DashboardFilters from "@/components/dashboard/DashboardFilters";

type Platform = {
  id: number;
  branch_id: number | null;
  platform_name: string;
};

type Branch = {
  id: number;
  name: string;
};

export default function DashboardSidebar({
  platforms,
  branches,
  canManagePlatformLinks,
  currentPlatformsCount,
  platformLimit,
  canManageBranches,
  canAccessCustomReports,
}: {
  platforms: Platform[];
  branches: Branch[];
  canManagePlatformLinks: boolean;
  currentPlatformsCount: number;
  platformLimit: number;
  canManageBranches: boolean;
  canAccessCustomReports: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`no-print w-full shrink-0 rounded-[1.35rem] border border-[#BABDE2]/40 bg-white p-3 shadow-sm transition-[width] duration-300 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto ${
        collapsed ? "lg:w-[76px]" : "lg:w-[220px] xl:w-[232px]"
      }`}
    >
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="hidden h-9 w-9 items-center justify-center rounded-xl border border-[#BABDE2]/50 text-[#374375] transition hover:bg-[#F8F7F3] lg:flex"
          aria-label={collapsed ? "توسيع الشريط الجانبي" : "طي الشريط الجانبي"}
          title={collapsed ? "توسيع الشريط" : "طي الشريط"}
        >
          {collapsed ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
        </button>
      </div>

      <div className={collapsed ? "lg:hidden" : ""}>
        <DashboardFilters branches={branches} platforms={platforms} />
      </div>

      <nav className={`${collapsed ? "lg:mt-1" : "mt-4"} space-y-2`}>
        {canManagePlatformLinks ? (
          <SidebarLink
            href="/onboarding/platforms"
            label="إضافة أو ربط منصة"
            icon={<Plus size={18} />}
            collapsed={collapsed}
            emphasized
          />
        ) : collapsed ? (
          <div
            className="hidden h-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700 lg:flex"
            title={`تستخدم ${currentPlatformsCount} من أصل ${platformLimit} منصة`}
          >
            <RadioTower size={18} />
          </div>
        ) : (
          <div className="rounded-xl bg-amber-50 p-3 text-xs font-bold leading-6 text-amber-800">
            وصلت إلى حد المنصات.
            <span className="block text-[10px]">
              {currentPlatformsCount} من أصل {platformLimit}
            </span>
          </div>
        )}

        <SidebarLink
          href="/dashboard/replies"
          label="مركز الردود"
          icon={<Repeat2 size={18} />}
          collapsed={collapsed}
          emphasized
        />

        {canAccessCustomReports ? (
          <SidebarLink
            href="/dashboard/reports"
            label="التقارير المخصصة"
            icon={<FileText size={18} />}
            collapsed={collapsed}
          />
        ) : null}

        {canManageBranches ? (
          <SidebarLink
            href="/dashboard/branches"
            label="إدارة الفروع"
            icon={<Building2 size={18} />}
            collapsed={collapsed}
          />
        ) : null}

        <div className="border-t border-[#BABDE2]/30 pt-2">
          <p
            className={`mb-1 px-2 text-[10px] font-bold text-gray-400 ${
              collapsed ? "lg:hidden" : ""
            }`}
          >
            إدارة الحساب
          </p>
          <div className="space-y-1">
            <SidebarLink
              href="/dashboard/platforms"
              label="حالة المنصات"
              icon={<RadioTower size={18} />}
              collapsed={collapsed}
            />
            <SidebarLink
              href="/dashboard/settings"
              label="الإعدادات"
              icon={<Settings size={18} />}
              collapsed={collapsed}
            />
          </div>
        </div>
      </nav>
    </aside>
  );
}

function SidebarLink({
  href,
  label,
  icon,
  collapsed,
  emphasized = false,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  collapsed: boolean;
  emphasized?: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`flex min-h-11 w-full items-center rounded-xl px-3 text-sm font-bold transition ${
        collapsed ? "lg:justify-center lg:px-0" : "gap-2.5"
      } ${
        emphasized
          ? "border border-[#BABDE2]/55 bg-[#F8F7F3] text-[#374375] hover:bg-[#BABDE2]/25"
          : "text-gray-500 hover:bg-[#BABDE2]/20 hover:text-[#374375]"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className={collapsed ? "lg:hidden" : ""}>{label}</span>
    </Link>
  );
}
