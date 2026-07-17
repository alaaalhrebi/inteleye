"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import type { ReactNode } from "react";

export default function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      className="pointer-events-none select-none w-full max-w-[800px] h-[680px] overflow-hidden rounded-[32px] border border-gray-200 bg-white shadow-[0_40px_100px_rgba(0,0,0,.14)]"
      dir="rtl"
    >

      {/* Header */}

      <div className="flex h-16 items-center justify-between border-b border-gray-100 px-6">

        <div className="flex items-center gap-3">

          <Image
            src="/logo.png"
            alt="IntelEye"
            width={120}
            height={34}
            className="h-8 w-auto"
          />

          <div>

            <h2 className="text-lg font-bold text-[#374375]">
              لوحة تحكم IntelEye
            </h2>

            <p className="text-xs text-gray-400">
              منصة مراقبة وتحليل السمعة
            </p>

          </div>

        </div>

        <div className="text-sm font-medium text-gray-500">
          آخر 30 يوماً
        </div>

      </div>

      {/* Dashboard Layout */}

      <div className="grid h-[456px] grid-cols-[170px_1fr]">

        {/* Sidebar */}

        <aside className="border-l border-gray-100 bg-[#FAFBFD] px-5 py-6">

          <nav className="space-y-2">

            <button className="flex w-full items-center gap-3 rounded-xl bg-[#374375] px-4 py-3 text-sm font-medium text-white">
              لوحة التحكم
            </button>

            <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-white">
              المراجعات
            </button>

            <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-white">
              الذكاء الاصطناعي
            </button>

            <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-white">
              التحليلات
            </button>

            <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-white">
              التقارير
            </button>

            <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-white">
              الإعدادات
            </button>

          </nav>

        </aside>

        {/* Main Content */}

        <main className="overflow-hidden p-6">

          {/* Summary Cards */}

          <div className="grid grid-cols-4 gap-4">

            <SummaryCard
              title="درجة الذكاء الاصطناعي"
              value="96%"
            />

            <SummaryCard
              title="نمو السمعة"
              value="+18%"
            />

            <SummaryCard
              title="إجمالي المراجعات"
              value="1,248"
            />

            <SummaryCard
              title="متوسط التقييم من 5"
              value="4.8"
            />

          </div>
                    {/* Chart */}

          <div className="mt-4 rounded-3xl border border-gray-100 bg-white p-5">

            <div className="mb-4">

              <h3 className="text-lg font-semibold text-[#374375]">
                اتجاه التقييمات
              </h3>

              <p className="mt-1 text-sm text-gray-400">
                المراجعات التي تم جمعها خلال آخر 30 يوماً
              </p>

            </div>

            <div className="flex gap-3">

              {/* Y Axis */}

              <div className="flex h-[180px] flex-col justify-between pb-6 text-xs text-gray-400">

                {[5, 4, 3, 2, 1].map((n) => (
                  <span key={n}>{n}</span>
                ))}

              </div>

              <div className="relative h-[220px] flex-1">

                <div className="absolute inset-0 flex flex-col justify-between pb-6">

                  {[1,2,3,4,5].map((item)=>(

                    <div
                      key={item}
                      className="border-t border-dashed border-gray-100"
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
                    [20,175],
                    [200,132],
                    [400,105],
                    [620,78],
                    [780,30],
                  ].map(([x,y],index)=>(

                    <circle
                      key={index}
                      cx={x}
                      cy={y}
                      r="5"
                      fill="#374375"
                    />

                  ))}

                </svg>

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

          <div className="mt-6 rounded-3xl border border-gray-100 bg-white p-6">

            <div className="mb-5 flex items-center justify-between">

              <h3 className="text-lg font-semibold text-[#374375]">
                آخر المراجعات
              </h3>

              <span className="text-sm font-medium text-gray-400">
                Google
              </span>

            </div>

            <ReviewItem
              rating="4.8"
              business="مطعم الرياض"
              stars={5}
              time="قبل ساعتين"
              content="خدمة ممتازة وسرعة في الرد، وتمت معالجة الملاحظة خلال وقت قصير."
            />

          </div>

        </main>

      </div>

    </motion.div>

  );
}
/* ===========================
   Summary Card
=========================== */

type SummaryCardProps = {
  title: string;
  value: string;
};

function SummaryCard({ title, value }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-[#FAFBFD] p-4">

      <div className="text-right">

        <h3 className="text-3xl font-bold text-[#374375]">
          {value}
        </h3>

        <p className="mt-2 text-sm text-gray-500">
          {title}
        </p>

      </div>

    </div>
  );
}

/* ===========================
   Review Item
=========================== */

type ReviewItemProps = {
  rating: string;
  business: string;
  stars: number;
  time: string;
  content: string;
};

function ReviewItem({
  rating,
  business,
  stars,
  time,
  content,
}: ReviewItemProps) {
  return (
    <div className="rounded-2xl bg-[#F8FAFC] p-5">

      <div className="flex items-center justify-between">

        <div className="flex items-center gap-3">

          <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-sm font-semibold text-[#374375]">
            {rating}
          </span>

          <div>

            <p className="text-sm font-semibold text-[#374375]">
              {business}
            </p>

            <div className="mt-1 flex items-center gap-1">

              {Array.from({ length: stars }).map((_, i) => (
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
          {time}
        </span>

      </div>

      <p className="mt-4 text-sm leading-6 text-gray-600">
        {content}
      </p>

    </div>
  );
}
