"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  BarChart3,
  Brain,
  FileText,
  LayoutGrid,
  MessageSquare,
  PieChart,
  Settings,
  Star,
  TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";

export default function DashboardPreview() {
  return (
    <div className="w-full overflow-hidden rounded-[32px] border border-[#E5E7EB] bg-white shadow-2xl" dir="rtl">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-[#E5E7EB] px-8 bg-[#FAFBFD]">
        <div className="flex items-center gap-3">
          {/* Logo Placeholder */}
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#374375] text-white overflow-hidden">
            {/* يمكنك استبدال هذا بـ <Image src="/logo.png" ... /> */}
            <span className="text-xs font-bold">IE</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#374375]">
              لوحة تحكم IntelEye
            </h3>
            <p className="text-[10px] text-gray-400">
              منصة مراقبة وتحليل السمعة
            </p>
          </div>
        </div>
        <span className="text-xs font-medium text-gray-400">
          آخر 30 يوماً
        </span>
      </div>

      {/* Dashboard Layout */}
      <div className="grid grid-cols-[220px_1fr] min-h-[580px]">
        {/* Sidebar */}
        <aside className="border-l border-[#E5E7EB] bg-[#FAFBFD] px-5 py-8">
          <nav className="space-y-1.5">
            <button className="flex w-full items-center gap-3 rounded-xl bg-[#374375] px-4 py-3 text-sm font-medium text-white transition-all">
              <LayoutGrid size={18} />
              لوحة التحكم
            </button>
            {[
              { icon: MessageSquare, label: "المراجعات" },
              { icon: Brain, label: "الذكاء الاصطناعي" },
              { icon: PieChart, label: "التحليلات" },
              { icon: FileText, label: "التقارير" },
              { icon: Settings, label: "الإعدادات" },
            ].map((item, idx) => (
              <button
                key={idx}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-white hover:text-[#374375]"
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="p-8 bg-white">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              {
                icon: Brain,
                title: "درجة الذكاء الاصطناعي",
                value: "96%",
              },
              {
                icon: TrendingUp,
                title: "نمو السمعة",
                value: "+18%",
              },
              {
                icon: MessageSquare,
                title: "إجمالي المراجعات",
                value: "1,248",
              },
              { icon: Star, title: "متوسط التقييم من 5", value: "4.8" },
            ].map((card, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-[#F1F5F9] bg-[#FAFBFD] p-4"
              >
                <div className="mb-3 flex justify-end">
                  <card.icon
                    size={16}
                    className={
                      idx === 3
                        ? "text-[#895159]"
                        : "text-[#374375]"
                    }
                  />
                </div>
                <div className="text-right">
                  <h4 className="text-xl font-bold text-[#374375]">
                    {card.value}
                  </h4>
                  <p className="mt-1 text-[10px] text-gray-500 font-medium">
                    {card.title}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="rounded-2xl border border-[#F1F5F9] bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-[#374375]">
                  اتجاه التقييمات
                </h4>
                <p className="mt-0.5 text-xs text-gray-400">
                  تحليل المراجعات خلال آخر 30 يوماً
                </p>
              </div>
              <BarChart3 size={20} className="text-[#374375] opacity-50" />
            </div>

            <div className="flex gap-4">
              {/* Y-axis labels */}
              <div className="flex h-[200px] flex-col justify-between pb-6 text-[10px] text-gray-400 font-medium">
                {[5, 4, 3, 2, 1].map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </div>

              <div className="relative h-[240px] flex-1">
                <div className="absolute inset-0 flex flex-col justify-between pb-6">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <div
                      key={item}
                      className="border-t border-dashed border-gray-100"
                    />
                  ))}
                </div>

                <svg
                  viewBox="0 0 800 200"
                  className="absolute inset-0 h-[200px] w-full"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient
                      id="chartArea"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#374375"
                        stopOpacity="0.15"
                      />
                      <stop
                        offset="100%"
                        stopColor="#374375"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>

                  <path
                    d="M20 160 C90 135 140 110 200 120 S330 145 400 95 S540 60 620 70 S730 50 780 25 L780 200 L20 200 Z"
                    fill="url(#chartArea)"
                  />

                  <path
                    d="M20 160 C90 135 140 110 200 120 S330 145 400 95 S540 60 620 70 S730 50 780 25"
                    fill="none"
                    stroke="#374375"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {[
                    [20, 160],
                    [200, 120],
                    [400, 95],
                    [620, 70],
                    [780, 25],
                  ].map(([x, y], index) => (
                    <circle
                      key={index}
                      cx={x}
                      cy={y}
                      r="4"
                      fill="#374375"
                    />
                  ))}
                </svg>

                {/* X-axis labels */}
                <div className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] text-gray-400 font-medium">
                  <span>1 مايو</span>
                  <span>7 مايو</span>
                  <span>15 مايو</span>
                  <span>22 مايو</span>
                  <span>30 مايو</span>
                  <span>اليوم</span>
                </div>
              </div>
            </div>
          </div>

          {/* Latest Review Snippet */}
          <div className="mt-6 rounded-2xl border border-[#F1F5F9] bg-[#FAFBFD] p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      className="fill-[#895159] text-[#895159]"
                    />
                  ))}
                </div>
                <span className="text-[11px] font-bold text-[#374375]">
                  مطعم الرياض
                </span>
              </div>
              <span className="text-[10px] text-gray-400 font-medium">
                قبل ساعتين
              </span>
            </div>
            <p className="text-xs leading-5 text-gray-600">
              خدمة ممتازة وسرعة في الرد، وتمت معالجة الملاحظة خلال وقت قصير جداً.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
