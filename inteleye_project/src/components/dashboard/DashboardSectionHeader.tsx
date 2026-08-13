import type { ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  LayoutDashboard,
  MessageSquareText,
  RadioTower,
  Settings,
} from "lucide-react";

import LogoutButton from "@/components/dashboard/LogoutButton";

type DashboardSectionHeaderProps = {
  activePath: "/dashboard/platforms" | "/dashboard/replies" | "/dashboard/settings";
  clientName: string;
  plan: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
};

const navItems = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/dashboard/platforms", label: "المنصات", icon: RadioTower },
  { href: "/dashboard/replies", label: "الردود", icon: MessageSquareText },
  { href: "/dashboard/settings", label: "الإعدادات", icon: Settings },
] as const;

export default function DashboardSectionHeader({
  activePath,
  clientName,
  plan,
  eyebrow,
  title,
  description,
  icon,
}: DashboardSectionHeaderProps) {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[#BABDE2]/30 bg-[#F8F7F3]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3 sm:gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#374375] text-white sm:h-12 sm:w-12">
              <BarChart3 size={23} />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-extrabold text-[#374375] sm:text-xl">
                IntelEye
              </span>
              <span className="block truncate text-xs text-gray-500 sm:text-sm">
                {clientName} · باقة {formatPlan(plan)}
              </span>
            </span>
          </Link>

          <div className="shrink-0 [&_button]:px-3 sm:[&_button]:px-5">
            <LogoutButton />
          </div>
        </div>

        <div className="overflow-x-auto border-t border-[#BABDE2]/20 bg-white/70">
          <nav
            aria-label="أقسام لوحة التحكم"
            className="mx-auto flex w-max min-w-full max-w-7xl items-center gap-2 px-4 py-2 sm:px-6"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === activePath;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                    isActive
                      ? "bg-[#374375] text-white shadow-sm"
                      : "text-gray-500 hover:bg-[#BABDE2]/25 hover:text-[#374375]"
                  }`}
                >
                  <Icon size={17} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden rounded-[1.75rem] border border-[#BABDE2]/35 bg-white p-6 shadow-sm sm:rounded-[2rem] sm:p-8">
        <div className="absolute -left-14 -top-16 h-40 w-40 rounded-full bg-[#BABDE2]/25 blur-2xl" />
        <div className="absolute -bottom-20 right-10 h-40 w-40 rounded-full bg-[#DFAEA1]/20 blur-2xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#374375] text-white shadow-sm sm:h-16 sm:w-16">
            {icon}
          </div>
          <div>
            <p className="text-xs font-bold text-[#895159]">{eyebrow}</p>
            <h1 className="mt-2 text-2xl font-extrabold text-[#374375] sm:text-3xl lg:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-500 sm:text-base">
              {description}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function formatPlan(plan: string) {
  const normalized = plan?.trim().toLowerCase();
  if (normalized === "enterprise") return "Enterprise";
  if (normalized === "pro") return "Pro";
  return "Basic";
}
