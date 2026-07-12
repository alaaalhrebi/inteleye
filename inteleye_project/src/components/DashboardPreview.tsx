"use client";

import { motion } from "framer-motion";

export default function DashboardPreview() {
  return (
    <motion.div className="h-40 w-40 bg-red-500">
      Test
    </motion.div>
  );
}
      {/* Header */}
    <div className="flex h-16 items-center justify-between border-b border-gray-100 px-6">
  <div className="flex items-center gap-3">
    <Image
      src="/logo.svg"
      alt="IntelEye"
      width={32}
      height={32}
    />

    <div>
      <h2 className="text-lg font-bold text-[#374375]">
        IntelEye Dashboard
      </h2>

      <p className="text-xs text-gray-400">
        Reputation Monitoring Platform
      </p>
    </div>
  </div>

  <div className="text-sm font-medium text-gray-500">
    Last 30 Days
  </div>
</div>

      {/* Dashboard Layout */}
      <div className="grid h-[536px] grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <aside className="border-l border-gray-100 bg-[#FAFBFD] px-5 py-6">
          <nav className="space-y-2">
            <button className="flex w-full items-center rounded-xl bg-[#374375] px-4 py-3 text-sm font-medium text-white">
              Dashboard
            </button>

            <button className="flex w-full items-center rounded-xl px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-white">
              Reviews
            </button>

            <button className="flex w-full items-center rounded-xl px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-white">
              AI Insights
            </button>

            <button className="flex w-full items-center rounded-xl px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-white">
              Analytics
            </button>

            <button className="flex w-full items-center rounded-xl px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-white">
              Reports
            </button>

            <button className="flex w-full items-center rounded-xl px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-white">
              Settings
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="overflow-y-auto p-6">

          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">

            <SummaryCard
              icon={<Star size={18} className="text-[#895159]" />}
              title="Average Rating"
              value="4.8"
            />

            <SummaryCard
              icon={<MessageSquare size={18} className="text-[#374375]" />}
              title="Reviews"
              value="1,248"
            />

            <SummaryCard
              icon={<TrendingUp size={18} className="text-[#374375]" />}
              title="Growth"
              value="+18%"
            />

            <SummaryCard
              icon={<Brain size={18} className="text-[#374375]" />}
              title="AI Score"
              value="96%"
            />
          </div>
                    {/* Chart */}
          <div className="mt-6 rounded-3xl border border-gray-100 bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#374375]">
                  Rating Trend
                </h3>

                <p className="mt-1 text-sm text-gray-400">
                  Reviews collected during the last 30 days
                </p>
              </div>

              <BarChart3
                size={22}
                className="text-[#374375]"
              />
            </div>

            <div className="relative h-[260px]">
              <div className="absolute inset-0 flex flex-col justify-between">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div
                    key={item}
                    className="border-t border-dashed border-gray-100"
                  />
                ))}
              </div>

              <svg
                viewBox="0 0 800 260"
                className="absolute inset-0 h-full w-full"
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
                  M20 210
                  C90 180 140 150 200 160
                  S330 190 400 130
                  S540 80 620 95
                  S730 70 780 40
                  L780 260
                  L20 260
                  Z
                  "
                  fill="url(#chartArea)"
                />

                <path
                  d="
                  M20 210
                  C90 180 140 150 200 160
                  S330 190 400 130
                  S540 80 620 95
                  S730 70 780 40
                  "
                  fill="none"
                  stroke="#374375"
                  strokeWidth="4"
                  strokeLinecap="round"
                />

                {[
                  [20, 210],
                  [200, 160],
                  [400, 130],
                  [620, 95],
                  [780, 40],
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
            </div>
          </div>

          {/* AI Insights */}
          <div className="mt-6 grid grid-cols-2 gap-5">
            <div className="rounded-3xl border border-gray-100 bg-white p-6">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#374375]">
                  AI Insights
                </h3>

                <Brain
                  size={20}
                  className="text-[#374375]"
                />
              </div>

              <div className="space-y-3">
                <InsightItem title="Positive reviews increased by 18% compared with last month." />
                <InsightItem title="12 customer reviews require a response." />
                <InsightItem title="Response time improved by 32%." />
                <InsightItem title="Service quality is the most mentioned strength." />
              </div>
            </div>
                        {/* Latest Reviews */}
            <div className="rounded-3xl border border-gray-100 bg-white p-6">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#374375]">
                  Latest Reviews
                </h3>

                <span className="text-sm text-gray-400">
                  Google Reviews
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-100">
                <table className="w-full">
                  <thead className="bg-[#F8FAFC]">
                    <tr className="text-sm text-gray-500">
                      <th className="px-4 py-3 text-right font-medium">
                        Business
                      </th>

                      <th className="px-4 py-3 text-right font-medium">
                        Rating
                      </th>

                      <th className="px-4 py-3 text-right font-medium">
                        Status
                      </th>

                      <th className="px-4 py-3 text-right font-medium">
                        Time
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {[
                      {
                        business: "Riyadh Restaurant",
                        rating: "4.9",
                        status: "Positive",
                        time: "2 hours ago",
                      },
                      {
                        business: "Coffee House",
                        rating: "4.7",
                        status: "Positive",
                        time: "5 hours ago",
                      },
                      {
                        business: "Elite Hotel",
                        rating: "4.5",
                        status: "Pending Reply",
                        time: "Yesterday",
                      },
                      {
                        business: "Medical Center",
                        rating: "5.0",
                        status: "Positive",
                        time: "Yesterday",
                      },
                    ].map((review, index) => (
                      <tr
                        key={index}
                        className="border-t border-gray-100 hover:bg-[#FAFBFD]"
                      >
                        <td className="px-4 py-4 font-medium text-[#374375]">
                          {review.business}
                        </td>

                        <td className="px-4 py-4 text-gray-700">
                          {review.rating}
                        </td>

                        <td className="px-4 py-4">
                          <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-medium text-[#374375]">
                            {review.status}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-gray-500">
                          {review.time}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
  icon: React.ReactNode;
  title: string;
  value: string;
};

function SummaryCard({
  icon,
  title,
  value,
}: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-[#FAFBFD] p-4">
      <div className="mb-4 flex justify-end">
        {icon}
      </div>

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
   Insight Item
=========================== */

type InsightItemProps = {
  title: string;
};

function InsightItem({ title }: InsightItemProps) {
  return (
    <div className="rounded-2xl bg-[#F8FAFC] px-4 py-4">
      <p className="text-sm leading-6 text-gray-600">
        {title}
      </p>
    </div>
  );
}
