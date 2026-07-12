"use client";

import Image from "next/image";
import { motion } from "framer-motion";

import {
  BarChart3,
  Brain,
  MessageSquare,
  Star,
  TrendingUp,
} from "lucide-react";


export default function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      className="w-[390px] h-[440px] overflow-hidden rounded-[26px] border border-gray-200 bg-white shadow-[0_25px_70px_rgba(0,0,0,.12)]"
      dir="rtl"
    >

  {/* Header */}

<div className="border-b border-gray-100 px-5 py-5">

  <div className="flex items-start justify-between">

    {/* Logo */}
<Image
  src="/logo.svg"
  alt="IntelEye"
  width={28}
  height={28}
  className="object-contain"
/>

    {/* Title */}

    <div className="text-right">

      <span className="text-xs font-medium tracking-wide text-gray-400">
        لوحة تحليل السمعة
      </span>

      <h2 className="mt-1 text-lg font-bold text-[#374375]">
        IntelEye
      </h2>

      <p className="mt-1 text-xs text-gray-400">
        آخر 30 يوماً
      </p>

    </div>

  </div>

</div>

      
{/* Summary */}

<div className="grid grid-cols-3 gap-3 px-5 py-5">

  <SummaryCard
    icon={<Star size={16} className="text-[#C8A648]" />}
    title="متوسط التقييم"
    value="4.8"
  />

  <SummaryCard
    icon={<MessageSquare size={16} className="text-[#374375]" />}
    title="إجمالي المراجعات"
    value="1,248"
  />

  <SummaryCard
    icon={<TrendingUp size={16} className="text-green-600" />}
    title="نمو السمعة"
    value="+18%"
  />

</div>
            {/* اتجاه التقييمات */}

     {/* Rating Trend */}

<div className="border-t border-gray-100 px-5 py-5">

  <div className="mb-4 flex items-center justify-between">

    <div className="text-right">

      <h3 className="text-sm font-semibold text-[#374375]">
        اتجاه التقييمات
      </h3>

      <p className="text-xs text-gray-400">
        آخر 30 يوماً
      </p>

    </div>

    <BarChart3 size={18} className="text-[#374375]" />

  </div>

  <div className="relative h-40">

    <div className="absolute inset-0 flex flex-col justify-between">
      {[1,2,3,4].map((i) => (
        <div key={i} className="border-t border-dashed border-gray-100" />
      ))}
    </div>

    <svg
      viewBox="0 0 420 150"
      className="absolute inset-0 h-full w-full"
    >

      <defs>

        <linearGradient
          id="area"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor="#374375" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#374375" stopOpacity="0" />
        </linearGradient>

      </defs>

      <path
        d="M10 120
           C60 90 100 70 140 75
           S220 95 270 60
           S350 40 410 30
           L410 150
           L10 150 Z"
        fill="url(#area)"
      />

      <path
        d="M10 120
           C60 90 100 70 140 75
           S220 95 270 60
           S350 40 410 30"
        fill="none"
        stroke="#374375"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {[
        [10,120],
        [140,75],
        [270,60],
        [410,30],
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
{/* AI Insights */}

<div className="px-5 py-5">

  <div className="mb-4 flex items-center justify-between">

    <h3 className="text-sm font-semibold text-[#374375]">
      تحليل الذكاء الاصطناعي
    </h3>

    <Brain size={18} className="text-[#374375]" />

  </div>

  <div className="space-y-2">

    <InsightItem
      title="ارتفعت التقييمات الإيجابية بنسبة 18٪"
    />

    <InsightItem
      title="12 مراجعة تحتاج إلى رد"
    />

    <InsightItem
      title="انخفاض الشكاوى المتعلقة بالخدمة"
    />

  </div>

</div>
            {/* آخر التقييمات */}
{/* آخر التقييمات */}

<div className="border-t border-gray-100 px-5 py-5">

  <div className="mb-3 flex items-center justify-between">

    <h3 className="text-sm font-semibold text-[#374375]">
      آخر التقييمات
    </h3>

    <span className="text-xs text-gray-400">
      Google
    </span>

  </div>

  <div className="rounded-2xl bg-[#F8FAFC] p-4">

    <div className="mb-3 flex items-center justify-between">

      <div>

        <h4 className="text-sm font-semibold text-[#374375]">
          مطعم الرياض
        </h4>

        <p className="text-xs text-gray-400">
          قبل ساعتين
        </p>

      </div>

      <div className="rounded-lg bg-green-100 px-2 py-1">

        <span className="text-xs font-semibold text-green-700">
          4.8
        </span>

      </div>

    </div>

    <p className="text-sm leading-6 text-gray-600">
      خدمة ممتازة وسرعة في الرد، وتمت معالجة الملاحظة خلال وقت قصير.
    </p>

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
    <div className="rounded-2xl border border-gray-100 bg-[#FAFBFD] p-3">

      <div className="mb-3 flex justify-end">
        {icon}
      </div>

      <div className="text-right">

        <h3 className="text-2xl font-bold text-[#374375]">
          {value}
        </h3>

        <p className="mt-1 text-[11px] text-gray-500">
          {title}
        </p>

      </div>

    </div>
  );
}

/* ===========================
   Insight Card
=========================== */

type InsightItemProps = {
  title: string;
};

function InsightItem({
  title,
}: InsightItemProps) {

  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#F8FAFC] px-4 py-3">

      <div className="h-2 w-2 rounded-full bg-[#374375]" />

      <p className="text-sm text-gray-600">
        {title}
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
