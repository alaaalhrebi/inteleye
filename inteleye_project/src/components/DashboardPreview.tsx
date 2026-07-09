"use client";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Brain,
  CheckCircle2,
  MessageSquare,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7 }}
      className="w-[520px] overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-2xl"
    >
      {/* Header */}

      <div className="bg-gradient-to-r from-[#374375] to-[#895159] px-6 py-5 text-white">

        <div className="flex items-center justify-between">

          <div>

            <h2 className="text-lg font-bold">
              IntelEye Dashboard
            </h2>

            <p className="mt-1 text-xs opacity-80">
              متابعة وتحليل السمعة الرقمية
            </p>

          </div>

          <div className="flex items-center gap-3">

            <Bell size={18} />

            <div className="h-3 w-3 rounded-full bg-[#DFAEA1] animate-pulse" />

          </div>

        </div>

      </div>

      {/* KPI */}

      <div className="grid grid-cols-2 gap-4 p-5">

        <Card
          icon={<Star size={18} className="text-yellow-500" />}
          value="4.8"
          title="متوسط التقييم"
          bg="bg-yellow-50"
        />

        <Card
          icon={<TrendingUp size={18} className="text-[#895159]" />}
          value="+23%"
          title="نمو السمعة"
          bg="bg-[#FFF7F6]"
        />

        <Card
          icon={<Users size={18} className="text-[#374375]" />}
          value="12.4K"
          title="العملاء"
          bg="bg-[#EEF2FF]"
        />

        <Card
          icon={<MessageSquare size={18} className="text-[#895159]" />}
          value="5.3K"
          title="التعليقات"
          bg="bg-[#FFF7F6]"
        />

      </div>

      {/* Chart */}

      <div className="px-5">

        <div className="mb-3 flex items-center gap-2">

          <BarChart3
            size={18}
            className="text-[#374375]"
          />

          <h3 className="font-semibold text-[#374375]">

            أداء التقييمات

          </h3>

        </div>

        <div className="flex h-28 items-end gap-2">

          {[35,50,42,60,55,72,86].map((h, i) => (

            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: h }}
              transition={{ delay: i * 0.06 }}
              className="flex-1 rounded-t-lg bg-gradient-to-t from-[#374375] to-[#BABDE2]"
            />

          ))}

        </div>

      </div>

      {/* AI Insights */}

      <div className="p-5">

        <div className="rounded-2xl border bg-[#FFFCF5] p-5">

          <div className="mb-4 flex items-center gap-2">

            <Brain
              size={18}
              className="text-[#374375]"
            />

            <h3 className="font-bold text-[#374375]">

              توصيات الذكاء الاصطناعي

            </h3>

          </div>

          <Insight
            icon={<AlertTriangle size={16} />}
            color="text-red-500"
            text="ارتفاع بسيط في الشكاوى المتعلقة بسرعة الخدمة."
          />

          <Insight
            icon={<CheckCircle2 size={16} />}
            color="text-green-600"
            text="تحسن معدل رضا العملاء هذا الأسبوع."
          />

          <Insight
            icon={<TrendingUp size={16} />}
            color="text-[#895159]"
            text="زيادة التقييمات الإيجابية بنسبة 23٪."
          />
                    <Insight
            icon={<Activity size={16} />}
            color="text-[#374375]"
            text="تم اكتشاف 5 تعليقات تحتاج إلى رد عاجل."
          />

        </div>

      </div>

      {/* Recent Reviews */}

      <div className="px-5 pb-5">

        <div className="rounded-2xl border border-gray-200 bg-white p-5">

          <h3 className="mb-4 font-bold text-[#374375]">
            آخر التقييمات
          </h3>

          <Review
            name="مطعم الرياض"
            rate="★★★★★"
            text="الخدمة ممتازة ولكن وقت الانتظار طويل."
          />

          <Review
            name="فرع جدة"
            rate="★★★★☆"
            text="تعامل الموظفين رائع وسرعة الرد ممتازة."
          />

          <Review
            name="فرع الدمام"
            rate="★★★★★"
            text="تجربة رائعة وسأكرر الزيارة."
          />

        </div>

      </div>

    </motion.div>
  );
}

type CardProps = {
  icon: React.ReactNode;
  value: string;
  title: string;
  bg: string;
};

function Card({ icon, value, title, bg }: CardProps) {
  return (
    <div
      className={`${bg} rounded-xl border border-gray-100 p-4 shadow-sm transition hover:shadow-lg`}
    >
      <div className="mb-3">{icon}</div>

      <h3 className="text-2xl font-bold text-[#16352B]">
        {value}
      </h3>

      <p className="mt-1 text-sm text-gray-500">
        {title}
      </p>

    </div>
  );
}

type InsightProps = {
  icon: React.ReactNode;
  text: string;
  color: string;
};

function Insight({ icon, text, color }: InsightProps) {
  return (
    <div className="mb-3 flex items-start gap-3 rounded-xl bg-white p-3">

      <div className={color}>
        {icon}
      </div>

      <p className="text-sm leading-6 text-gray-600">
        {text}
      </p>

    </div>
  );
}

type ReviewProps = {
  name: string;
  rate: string;
  text: string;
};

function Review({ name, rate, text }: ReviewProps) {
  return (
    <div className="mb-4 border-b border-gray-100 pb-4 last:border-none last:pb-0">

      <div className="mb-1 flex items-center justify-between">

        <h4 className="font-semibold text-[#16352B]">
          {name}
        </h4>

        <span className="text-xs text-yellow-500">
          {rate}
        </span>

      </div>

      <p className="text-sm leading-6 text-gray-500">
        {text}
      </p>

    </div>
  );
}
