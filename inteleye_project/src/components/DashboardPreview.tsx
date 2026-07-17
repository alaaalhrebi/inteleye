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
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="relative min-h-screen flex flex-col items-center justify-center px-6 py-20 bg-gradient-to-br from-white via-[#F8FAFC] to-white"
      >
        {/* Background Decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-10 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute bottom-20 left-10 w-72 h-72 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        </div>

        <div className="relative z-10 max-w-3xl text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EEF2FF] border border-[#D4E0FF] mb-6"
          >
            <span className="w-2 h-2 bg-[#374375] rounded-full"></span>
            <span className="text-sm font-semibold text-[#374375]">
              منصة ذكاء اصطناعي متقدمة
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-5xl md:text-6xl font-bold text-[#1A1A1A] mb-6 leading-tight"
          >
            حلل آراء عملائك
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#374375] to-[#5B6BA8]">
              وطور سمعتك التجارية
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-lg text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto"
          >
            منصة ذكاء اصطناعي متطورة لتحليل تقييمات العملاء وتطوير سمعتك التجارية بالذكاء الاصطناعي
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
          >
            <button className="px-8 py-4 bg-[#374375] text-white font-semibold rounded-lg hover:bg-[#2D3560] transition-all duration-300 flex items-center justify-center gap-2 group shadow-lg hover:shadow-xl">
              <div className="flex flex-col items-start">
                <span>تجربة مجانية لمدة 14 يوم</span>
                <span className="text-xs font-normal opacity-90">بدون الحاجة لبطاقة ائتمان</span>
              </div>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="px-8 py-3 bg-white text-[#374375] font-semibold rounded-lg border-2 border-[#E5E7EB] hover:border-[#374375] transition-all duration-300 flex items-center justify-center gap-2">
              <HelpCircle size={18} />
              مشاهدة العرض التوضيحي
            </button>
          </motion.div>

          {/* Features Tags */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex flex-wrap justify-center gap-3"
          >
            {[
              { icon: <CheckCircle2 size={16} />, text: "تحليل فوري للتقييمات" },
              { icon: <Zap size={16} />, text: "ذكاء اصطناعي متقدم" },
              { icon: <Users size={16} />, text: "دعم متعدد المنصات" },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-[#E5E7EB] text-sm text-gray-700"
              >
                <span className="text-[#374375]">{feature.icon}</span>
                {feature.text}
              </div>
            ))}
          </motion.div>
        </div>
      </motion.section>

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

      {/* Stats Section */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.7 }}
        className="px-6 py-20 bg-[#F8FAFC]"
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[
              { number: "+120K", label: "تقييم تم تحليله" },
              { number: "98%", label: "دقة التحليل" },
              { number: "24/7", label: "مراقبة مستمرة" },
            ].map((stat, idx) => (
              <div key={idx}>
                <h3 className="text-4xl font-bold text-[#374375] mb-2">
                  {stat.number}
                </h3>
                <p className="text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>
    </div>
  );
}
