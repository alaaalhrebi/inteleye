"use client";

import {
  Bell,
  Brain,
  Calendar,
  ChevronDown,
  LineChart,
  MessageSquare,
  Search,
  Star,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7 }}
      className="w-[560px] overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-2xl"
    >

      {/* Header */}

      <div className="border-b border-gray-100 bg-white px-6 py-5">

        <div className="flex items-center justify-between">

          <div>

            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              REVIEW DASHBOARD
            </p>

            <h2 className="mt-2 text-2xl font-bold text-[#374375]">
              Google Reviews
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Monitor customer reviews and analyze your online reputation.
            </p>

          </div>

          <div className="flex items-center gap-3">

            <button className="rounded-xl border border-gray-200 p-2 hover:bg-gray-50">
              <Search size={18} className="text-gray-500" />
            </button>

            <button className="rounded-xl border border-gray-200 p-2 hover:bg-gray-50">
              <Bell size={18} className="text-gray-500" />
            </button>

            <button className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 hover:bg-gray-50">
              <Calendar size={16} />
              <span className="text-sm">Last 30 days</span>
              <ChevronDown size={15} />
            </button>

          </div>

        </div>

      </div>

      {/* Review Summary */}

      <div className="grid grid-cols-3 gap-4 p-6">

        <SummaryCard
          icon={<Star size={18} />}
          title="Average Rating"
          value="4.8"
          sub="+0.3 vs last month"
        />

        <SummaryCard
          icon={<MessageSquare size={18} />}
          title="Total Reviews"
          value="1,248"
          sub="+124 this month"
        />

        <SummaryCard
          icon={<TrendingUp size={18} />}
          title="Growth"
          value="+12%"
          sub="Higher than last month"
        />

      </div>
            {/* Rating Trend */}

      <div className="border-y border-gray-100 bg-white px-6 py-6">

        <div className="mb-6 flex items-center justify-between">

          <div>

            <h3 className="text-lg font-semibold text-[#374375]">
              Rating Trend
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Average review score over the last 30 days
            </p>

          </div>

          <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
            View Report
          </button>

        </div>

        {/* Line Chart */}

        <div className="relative h-48">

          <div className="absolute inset-0 flex flex-col justify-between">

            {[1,2,3,4,5].map((item)=>(
              <div
                key={item}
                className="border-t border-dashed border-gray-200"
              />
            ))}

          </div>

          <svg
            viewBox="0 0 600 180"
            className="absolute inset-0 h-full w-full"
          >

            <defs>

              <linearGradient
                id="reviewGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >

                <stop
                  offset="0%"
                  stopColor="#374375"
                />

                <stop
                  offset="100%"
                  stopColor="#895159"
                />

              </linearGradient>

            </defs>

            <path
              d="
              M20 135
              C70 120 100 70 145 80
              S220 40 270 60
              S360 95 420 65
              S520 25 580 40
              "
              fill="none"
              stroke="url(#reviewGradient)"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {[
              [20,135],
              [145,80],
              [270,60],
              [420,65],
              [580,40],
            ].map(([x,y],i)=>(
              <circle
                key={i}
                cx={x}
                cy={y}
                r="5"
                fill="#374375"
              />
            ))}

          </svg>

        </div>

        {/* Sentiment */}

        <div className="mt-8 grid grid-cols-3 gap-4">

          <div className="rounded-2xl border border-green-100 bg-green-50 p-5">

            <p className="text-xs uppercase tracking-wider text-green-700">
              Positive
            </p>

            <h4 className="mt-2 text-3xl font-bold text-green-600">
              78%
            </h4>

            <p className="mt-2 text-xs text-green-700">
              975 Reviews
            </p>

          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">

            <p className="text-xs uppercase tracking-wider text-amber-700">
              Neutral
            </p>

            <h4 className="mt-2 text-3xl font-bold text-amber-500">
              15%
            </h4>

            <p className="mt-2 text-xs text-amber-700">
              188 Reviews
            </p>

          </div>

          <div className="rounded-2xl border border-red-100 bg-red-50 p-5">

            <p className="text-xs uppercase tracking-wider text-red-700">
              Negative
            </p>

            <h4 className="mt-2 text-3xl font-bold text-red-500">
              7%
            </h4>

            <p className="mt-2 text-xs text-red-700">
              85 Reviews
            </p>

          </div>

        </div>

      </div>
            {/* AI Insights */}

      <div className="border-b border-gray-100 bg-white px-6 py-6">

        <div className="mb-5 flex items-center justify-between">

          <div className="flex items-center gap-2">

            <Brain
              size={18}
              className="text-[#374375]"
            />

            <h3 className="text-lg font-semibold text-[#374375]">
              AI Insights
            </h3>

          </div>

          <button className="text-sm font-medium text-[#374375] hover:underline">
            View All
          </button>

        </div>

        <div className="space-y-4">

          <InsightCard
            status="positive"
            title="Positive reviews are increasing"
            description="AI detected an 18% increase in positive reviews compared with the previous month."
          />

          <InsightCard
            status="warning"
            title="Delivery time mentioned frequently"
            description="Delivery delay appears in 32 recent reviews and should be monitored."
          />

          <InsightCard
            status="info"
            title="12 reviews need a reply"
            description="Responding within 24 hours can improve customer satisfaction."
          />

        </div>

      </div>

      {/* Recent Reviews */}

      <div className="bg-white px-6 py-6">

        <div className="mb-5 flex items-center justify-between">

          <h3 className="text-lg font-semibold text-[#374375]">
            Recent Reviews
          </h3>

          <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50">
            View All
          </button>

        </div>

        <div className="space-y-4">

          <ReviewCard
            name="Riyadh Branch"
            rating="5.0"
            platform="Google"
            time="2 hours ago"
            sentiment="Positive"
            review="Excellent customer service and very fast response."
          />

          <ReviewCard
            name="Jeddah Branch"
            rating="4.0"
            platform="Google"
            time="5 hours ago"
            sentiment="Neutral"
            review="The service was good, but the waiting time could be improved."
          />

          <ReviewCard
            name="Dammam Branch"
            rating="5.0"
            platform="Google"
            time="Yesterday"
            sentiment="Positive"
            review="Great experience. I will definitely visit again."
          />

        </div>

      </div>

    </motion.div>

  );
}type SummaryCardProps = {
  icon: React.ReactNode;
  title: string;
  value: string;
  sub: string;
};

function SummaryCard({
  icon,
  title,
  value,
  sub,
}: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-[#F8FAFC] p-5 transition duration-300 hover:shadow-md">

      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#374375] shadow-sm">
        {icon}
      </div>

      <h3 className="text-3xl font-bold text-[#374375]">
        {value}
      </h3>

      <p className="mt-2 text-sm font-medium text-gray-700">
        {title}
      </p>

      <p className="mt-1 text-xs text-green-600">
        {sub}
      </p>

    </div>
  );
}

type InsightCardProps = {
  title: string;
  description: string;
  status: "positive" | "warning" | "info";
};

function InsightCard({
  title,
  description,
  status,
}: InsightCardProps) {

  const styles = {
    positive: "border-green-200 bg-green-50",
    warning: "border-amber-200 bg-amber-50",
    info: "border-blue-200 bg-blue-50",
  };

  return (
    <div className={`rounded-2xl border p-4 ${styles[status]}`}>

      <h4 className="font-semibold text-[#374375]">
        {title}
      </h4>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        {description}
      </p>

    </div>
  );
}

type ReviewCardProps = {
  name: string;
  platform: string;
  rating: string;
  sentiment: string;
  time: string;
  review: string;
};

function ReviewCard({
  name,
  platform,
  rating,
  sentiment,
  time,
  review,
}: ReviewCardProps) {

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-[#374375] hover:shadow-md">

      <div className="flex items-start justify-between">

        <div>

          <h4 className="font-semibold text-[#374375]">
            {name}
          </h4>

          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">

            <span>{platform}</span>

            <span>•</span>

            <span>{time}</span>

          </div>

        </div>

        <div className="text-right">

          <div className="text-lg font-bold text-[#374375]">
            {rating}
          </div>

          <div className="text-xs text-gray-500">
            {sentiment}
          </div>

        </div>

      </div>

      <p className="mt-4 text-sm leading-7 text-gray-600">
        {review}
      </p>

      <div className="mt-5 flex gap-2">

        <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50">
          Reply
        </button>

        <button className="rounded-lg bg-[#374375] px-4 py-2 text-sm text-white hover:bg-[#2f3965]">
          View Details
        </button>

      </div>

    </div>
  );
}
