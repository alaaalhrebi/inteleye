"use client";

import {
  Brain,
  LineChart,
  MessageSquare,
  Star,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      className="w-[420px] h-[470px] overflow-hidden rounded-[26px] border border-gray-200 bg-white shadow-[0_25px_70px_rgba(0,0,0,.12)]"
      dir="rtl"
    >

      {/* Header */}

      <div className="border-b border-gray-100 px-6 py-5">

        <span className="text-xs font-medium tracking-wide text-gray-400">
          لوحة تحليل السمعة
        </span>

        <h2 className="mt-2 text-2xl font-bold text-[#374375]">
          IntelEye
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          متابعة تقييمات العملاء وتحليل السمعة الرقمية باستخدام الذكاء الاصطناعي.
        </p>

      </div>

      {/* Summary */}

      <div className="grid grid-cols-3 gap-3 p-5">

        <SummaryCard
          icon={<Star size={18} />}
          title="التقييم"
          value="4.8"
        />

        <SummaryCard
          icon={<MessageSquare size={18} />}
          title="المراجعات"
          value="1,248"
        />

        <SummaryCard
          icon={<TrendingUp size={18} />}
          title="النمو"
          value="+18%"
        />

      </div>
            {/* اتجاه التقييمات */}

      <div className="border-y border-gray-100 px-5 py-5">

        <div className="mb-4 flex items-center justify-between">

          <div className="flex items-center gap-2">

            <LineChart
              size={18}
              className="text-[#374375]"
            />

            <span className="font-semibold text-[#374375]">
              اتجاه التقييمات
            </span>

          </div>

          <span className="text-xs text-gray-400">
            آخر 30 يوم
          </span>

        </div>

        {/* الرسم البياني */}

        <div className="relative h-32">

          <div className="absolute inset-0 flex flex-col justify-between">

            {[1,2,3,4].map((i)=>(
              <div
                key={i}
                className="border-t border-dashed border-gray-200"
              />
            ))}

          </div>

          <svg
            viewBox="0 0 360 120"
            className="absolute inset-0 h-full w-full"
          >

            <path
              d="
              M10 95
              C45 82 70 50 110 55
              S180 30 220 42
              S285 72 350 28
              "
              fill="none"
              stroke="#374375"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {[
              [10,95],
              [110,55],
              [220,42],
              [350,28],
            ].map(([x,y],i)=>(
              <circle
                key={i}
                cx={x}
                cy={y}
                r="4"
                fill="#374375"
              />
            ))}

          </svg>

        </div>

      </div>

      {/* تحليل الذكاء الاصطناعي */}

      <div className="px-5 py-5">

        <div className="mb-4 flex items-center gap-2">

          <Brain
            size={18}
            className="text-[#374375]"
          />

          <span className="font-semibold text-[#374375]">
            تحليل الذكاء الاصطناعي
          </span>

        </div>

        <div className="space-y-3">

          <InsightCard
            title="ارتفاع التقييمات الإيجابية"
            description="ارتفع معدل التقييمات الإيجابية خلال الشهر الحالي بنسبة 18٪."
          />

          <InsightCard
            title="انخفاض الشكاوى"
            description="انخفضت الشكاوى المتعلقة بسرعة الخدمة مقارنة بالشهر الماضي."
          />

        </div>

      </div>
            {/* آخر التقييمات */}

      <div className="border-t border-gray-100 px-5 py-5">

        <h3 className="mb-4 font-semibold text-[#374375]">
          آخر التقييمات
        </h3>

        <div className="space-y-3">

          <ReviewCard
            name="مطعم الرياض"
            rating="5.0"
            review="الخدمة ممتازة وسرعة الاستجابة كانت رائعة."
          />

          <ReviewCard
            name="فرع جدة"
            rating="4.7"
            review="تجربة جميلة، فقط وقت الانتظار يحتاج إلى تحسين."
          />

        </div>

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
    <div className="rounded-2xl border border-gray-200 bg-[#F8FAFC] p-4">

      <div className="mb-3 text-[#374375]">
        {icon}
      </div>

      <div className="text-xl font-bold text-[#374375]">
        {value}
      </div>

      <div className="mt-1 text-xs text-gray-500">
        {title}
      </div>

    </div>
  );
}

/* ===========================
   Insight Card
=========================== */

type InsightCardProps = {
  title: string;
  description: string;
};

function InsightCard({
  title,
  description,
}: InsightCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-[#F8FAFC] p-3">

      <h4 className="text-sm font-semibold text-[#374375]">
        {title}
      </h4>

      <p className="mt-2 text-xs leading-6 text-gray-500">
        {description}
      </p>

    </div>
  );
}

/* ===========================
   Review Card
=========================== */

type ReviewCardProps = {
  name: string;
  rating: string;
  review: string;
};

function ReviewCard({
  name,
  rating,
  review,
}: ReviewCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">

      <div className="mb-2 flex items-center justify-between">

        <h4 className="font-semibold text-[#374375]">
          {name}
        </h4>

        <span className="text-sm font-bold text-[#374375]">
          {rating}
        </span>

      </div>

      <p className="text-sm leading-6 text-gray-500">
        {review}
      </p>

    </div>
  );
}
