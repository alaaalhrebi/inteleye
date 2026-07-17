"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  BarChart3,
  Brain,
  FileText,
  HelpCircle,
  LayoutGrid,
  MessageSquare,
  PieChart,
  Settings,
  Star,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Zap,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

export default function DashboardPreview() {
  return (
    <div className="w-full">
    
      {/* Dashboard Preview Section */}
      <motion.section
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.7 }}
        className="relative px-6 py-20 bg-gradient-to-b from-white to-[#F8FAFC]"
      >
        <div className="max-w-7xl mx-auto">
          {/* Section Title */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#1A1A1A] mb-4">
              لوحة تحكم قوية وسهلة الاستخدام
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              تابع جميع تقييمات عملائك وحلل آراءهم بسهولة من خلال لوحة تحكم حديثة وسهلة الاستخدام
            </p>
          </div>

          {/* Dashboard Card */}
          <div className="relative">
            {/* Shadow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#374375]/5 to-[#5B6BA8]/5 rounded-3xl blur-2xl"></div>

            {/* Main Dashboard */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, duration: 0.7 }}
              className="relative overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-2xl"
              dir="rtl"
            >
              {/* Header */}
              <div className="flex h-16 items-center justify-between border-b border-[#E5E7EB] px-8 bg-[#FAFBFD]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#374375]">
                    <LayoutGrid size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#374375]">
                      لوحة تحكم IntelEye
                    </h3>
                    <p className="text-xs text-gray-400">
                      منصة مراقبة وتحليل السمعة
                    </p>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-500">
                  آخر 30 يوماً
                </span>
              </div>

              {/* Dashboard Layout */}
              <div className="grid grid-cols-[240px_1fr] min-h-[600px]">
                {/* Sidebar */}
                <aside className="border-l border-[#E5E7EB] bg-[#FAFBFD] px-6 py-8">
                  <nav className="space-y-2">
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
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-white"
                      >
                        <item.icon size={18} />
                        {item.label}
                      </button>
                    ))}
                  </nav>
                </aside>

                {/* Main Content */}
                <main className="overflow-y-auto p-8">
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
                        className="rounded-2xl border border-[#E5E7EB] bg-[#FAFBFD] p-4"
                      >
                        <div className="mb-4 flex justify-end">
                          <card.icon
                            size={18}
                            className={
                              idx === 3
                                ? "text-[#895159]"
                                : "text-[#374375]"
                            }
                          />
                        </div>
                        <div className="text-right">
                          <h4 className="text-2xl font-bold text-[#374375]">
                            {card.value}
                          </h4>
                          <p className="mt-2 text-xs text-gray-500">
                            {card.title}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chart */}
                  <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6">
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-[#374375]">
                          اتجاه التقييمات
                        </h4>
                        <p className="mt-1 text-sm text-gray-400">
                          المراجعات التي تم جمعها خلال آخر 30 يوماً
                        </p>
                      </div>
                      <BarChart3 size={22} className="text-[#374375]" />
                    </div>

                    <div className="flex gap-3">
                      {/* Y-axis labels */}
                      <div className="flex h-[220px] flex-col justify-between pb-6 text-xs text-gray-400">
                        {[5, 4, 3, 2, 1].map((n) => (
                          <span key={n}>{n}</span>
                        ))}
                      </div>

                      <div className="relative h-[260px] flex-1">
                        <div className="absolute inset-0 flex flex-col justify-between pb-6">
                          {[1, 2, 3, 4, 5].map((item) => (
                            <div
                              key={item}
                              className="border-t border-dashed border-[#E5E7EB]"
                            />
                          ))}
                        </div>

                        <svg
                          viewBox="0 0 800 220"
                          className="absolute inset-0 h-[220px] w-full"
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
                                stopOpacity="0.20"
                              />
                              <stop
                                offset="100%"
                                stopColor="#374375"
                                stopOpacity="0"
                              />
                            </linearGradient>
                          </defs>

                          <path
                            d="
                            M20 175
                            C90 148 140 122 200 132
                            S330 158 400 105
                            S540 65 620 78
                            S730 55 780 30
                            L780 220
                            L20 220
                            Z
                            "
                            fill="url(#chartArea)"
                          />

                          <path
                            d="
                            M20 175
                            C90 148 140 122 200 132
                            S330 158 400 105
                            S540 65 620 78
                            S730 55 780 30
                            "
                            fill="none"
                            stroke="#374375"
                            strokeWidth="4"
                            strokeLinecap="round"
                          />

                          {[
                            [20, 175],
                            [200, 132],
                            [400, 105],
                            [620, 78],
                            [780, 30],
                          ].map(([x, y], index) => (
                            <circle
                              key={index}
                              cx={x}
                              cy={y}
                              r="5"
                              fill="#374375"
                            />
                          ))}
                        </svg>

                        {/* X-axis labels */}
                        <div className="absolute inset-x-0 bottom-0 flex justify-between text-xs text-gray-400">
                          <span>مايو 1</span>
                          <span>مايو 7</span>
                          <span>مايو 15</span>
                          <span>مايو 22</span>
                          <span>مايو 30</span>
                          <span>اليوم</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Latest Reviews */}
                  <div className="mt-6 rounded-3xl border border-[#E5E7EB] bg-white p-6">
                    <div className="mb-5 flex items-center justify-between">
                      <h4 className="flex items-center gap-2 text-lg font-semibold text-[#374375]">
                        <MessageSquare size={18} />
                        آخر المراجعات
                      </h4>
                      <span className="text-sm font-medium text-gray-400">
                        Google
                      </span>
                    </div>

                    <div className="rounded-2xl bg-[#F8FAFC] p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-sm font-semibold text-[#374375]">
                            4.8
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-[#374375]">
                              مطعم الرياض
                            </p>
                            <div className="mt-1 flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  size={14}
                                  className="fill-[#895159] text-[#895159]"
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">
                          قبل ساعتين
                        </span>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-gray-600">
                        خدمة ممتازة وسرعة في الرد، وتمت معالجة الملاحظة خلال
                        وقت قصير.
                      </p>
                    </div>
                  </div>
                </main>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>
            ))}
          </div>
        </div>
      </motion.section>
    </div>
  );
}
