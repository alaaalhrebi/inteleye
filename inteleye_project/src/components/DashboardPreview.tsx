"use client";

import Image from "next/image";
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

export default function DashboardPreview() {
  return (
    <div
      dir="rtl"
      className="w-full overflow-hidden rounded-2xl sm:rounded-[32px] border border-[#E5E7EB] bg-white shadow-2xl"
    >

      {/* Header */}

      <div className="flex h-14 sm:h-16 items-center justify-between border-b border-[#E5E7EB] bg-[#FAFBFD] px-4 sm:px-6 lg:px-8">

        <div className="flex items-center gap-3">

          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center overflow-hidden">

            <Image
              src="/logo.png"
              alt="Inteleye Logo"
              width={40}
              height={40}
              className="object-contain"
            />

          </div>

          <div>

            <h3 className="text-xs sm:text-sm font-bold text-[#374375]">
              لوحة تحكم IntelEye
            </h3>

            <p className="text-[9px] sm:text-[10px] text-gray-400">
              منصة مراقبة وتحليل السمعة
            </p>

          </div>

        </div>

        <span className="hidden sm:block text-xs font-medium text-gray-400">
          آخر 30 يوماً
        </span>

      </div>

      {/* Dashboard */}

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] min-h-[580px]">

        {/* Sidebar */}

        <aside className="border-b lg:border-b-0 lg:border-l border-[#E5E7EB] bg-[#FAFBFD] px-4 sm:px-5 py-5 sm:py-8">

          <nav className="grid grid-cols-2 gap-2 sm:flex sm:flex-col sm:space-y-1.5">

            <button className="flex items-center justify-center gap-2 rounded-xl bg-[#374375] px-3 py-3 text-xs sm:text-sm font-medium text-white">

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
                className="flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs sm:text-sm font-medium text-gray-600 transition hover:bg-white hover:text-[#374375]"
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}

          </nav>

        </aside>

        {/* Main Content */}

        <main className="bg-white p-4 sm:p-6 lg:p-8">
                    {/* Summary Cards */}

          <div className="mb-6 grid grid-cols-2 gap-3 lg:mb-8 lg:grid-cols-4 lg:gap-4">

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
              {
                icon: Star,
                title: "متوسط التقييم",
                value: "4.8",
              },
            ].map((card, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-[#F1F5F9] bg-[#FAFBFD] p-3 sm:p-4"
              >

                <div className="mb-2 flex justify-end">

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

                  <h4 className="text-lg sm:text-xl font-bold text-[#374375]">
                    {card.value}
                  </h4>

                  <p className="mt-1 text-[10px] sm:text-xs text-gray-500">
                    {card.title}
                  </p>

                </div>

              </div>
            ))}

          </div>

          {/* Chart */}

          <div className="overflow-x-auto">

            <div className="min-w-[650px] rounded-2xl border border-[#F1F5F9] bg-white p-4 sm:p-6 shadow-sm">

              <div className="mb-6 flex items-center justify-between">

                <div>

                  <h4 className="text-sm sm:text-base font-bold text-[#374375]">
                    اتجاه التقييمات
                  </h4>

                  <p className="mt-1 text-[10px] sm:text-xs text-gray-400">
                    تحليل المراجعات خلال آخر 30 يوماً
                  </p>

                </div>

                <BarChart3
                  size={20}
                  className="text-[#374375] opacity-50"
                />

              </div>

              <div className="flex gap-4">

                {/* Y Axis */}

                <div className="flex h-[200px] flex-col justify-between pb-6 text-[10px] font-medium text-gray-400">

                  {[5,4,3,2,1].map((n)=>(
                    <span key={n}>{n}</span>
                  ))}

                </div>

                <div className="relative h-[240px] flex-1">

                  <div className="absolute inset-0 flex flex-col justify-between pb-6">

                    {[1,2,3,4,5].map((i)=>(
                      <div
                        key={i}
                        className="border-t border-dashed border-gray-100"
                      />
                    ))}

                  </div>

                  <svg
                    viewBox="0 0 800 200"
                    preserveAspectRatio="none"
                    className="absolute inset-0 h-[200px] w-full"
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
                      [20,160],
                      [200,120],
                      [400,95],
                      [620,70],
                      [780,25],
                    ].map(([x,y],index)=>(
                      <circle
                        key={index}
                        cx={x}
                        cy={y}
                        r="4"
                        fill="#374375"
                      />
                    ))}

                  </svg>

                  <div className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] font-medium text-gray-400">

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

          </div>
                    {/* Latest Review */}

          <div className="mt-6 rounded-2xl border border-[#F1F5F9] bg-[#FAFBFD] p-4 sm:p-5">

            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

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

                <span className="text-xs sm:text-sm font-bold text-[#374375]">
                  مطعم الرياض
                </span>

              </div>

              <span className="text-[10px] sm:text-xs text-gray-400 font-medium">
                قبل ساعتين
              </span>

            </div>

            <p className="text-xs sm:text-sm leading-6 text-gray-600">

              خدمة ممتازة وسرعة في الرد،
              وتمت معالجة الملاحظة خلال وقت قصير جداً،
              واستمر التواصل حتى تم التأكد من رضا العميل.

            </p>

          </div>

        </main>

      </div>

    </div>

  );
}
