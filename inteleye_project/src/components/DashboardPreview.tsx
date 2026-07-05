"use client";

import {
  Star,
  TrendingUp,
  Brain,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7 }}
      className="rounded-[32px] bg-white shadow-2xl border border-gray-100 overflow-hidden"
    >
      {/* Header */}

      <div className="px-8 py-6 border-b bg-gradient-to-r from-[#374375] to-[#1E8A68] text-white">

        <div className="flex justify-between items-center">

          <div>

            <h2 className="text-xl font-bold">
              Intel Eye Dashboard
            </h2>

            <p className="text-sm opacity-80">
              تحليل مباشر لتقييمات العملاء
            </p>

          </div>

          <div className="w-3 h-3 rounded-full bg-[#DFAEA1] animate-pulse" />

        </div>

      </div>

      {/* KPI Cards */}

      <div className="grid grid-cols-2 gap-5 p-7">

        <Card
          icon={<Star className="text-yellow-500" />}
          value="4.8"
          title="متوسط التقييم"
          bg="bg-yellow-50"
        />

        <Card
          icon={<TrendingUp className="text-[#895159]" />}
          value="+23%"
          title="نمو السمعة"
          bg="bg-[#FFFCF5]"
        />

        <Card
          icon={<Brain className="text-blue-600" />}
          value="85%"
          title="رضا العملاء"
          bg="bg-blue-50"
        />

        <Card
          icon={<MessageSquare className="text-orange-500" />}
          value="12,450"
          title="التعليقات"
          bg="bg-orange-50"
        />

      </div>

      {/* AI Insights */}

      <div className="px-7 pb-7">

        <div className="rounded-3xl border bg-[#F8FAF8] p-6">

          <h3 className="font-bold text-[#16352B] mb-5">
            توصيات الذكاء الاصطناعي
          </h3>

          <Insight
            icon={<AlertTriangle size={18} />}
            text="ارتفاع الشكاوى المتعلقة بسرعة الخدمة."
            color="text-red-500"
          />

          <Insight
            icon={<CheckCircle2 size={18} />}
            text="العملاء يشيدون بسرعة الرد على الاستفسارات."
            color="text-[#895159]"
          />

          <Insight
            icon={<TrendingUp size={18} />}
            text="تحسن التقييم العام بنسبة 23% خلال آخر شهر."
            color="text-[#895159]"
          />

        </div>

      </div>

      {/* Fake Chart */}

      <div className="px-7 pb-8">

        <h3 className="font-semibold mb-4 text-[#16352B]">
          أداء التقييمات
        </h3>

        <div className="flex items-end gap-3 h-40">

          {[45, 70, 62, 90, 80, 110, 125].map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: h }}
              transition={{
                delay: i * 0.08,
              }}
              className="flex-1 rounded-t-xl bg-gradient-to-t from-[#374375] to-[#34D399]"
            />
          ))}

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
    <div className={`${bg} rounded-2xl p-5`}>

      <div className="mb-4">{icon}</div>

      <h3 className="text-3xl font-bold text-[#16352B]">
        {value}
      </h3>

      <p className="text-gray-500 mt-2">
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
    <div className="flex items-start gap-3 mb-4">

      <div className={color}>
        {icon}
      </div>

      <p className="text-gray-700 leading-7">
        {text}
      </p>

    </div>
  );
}