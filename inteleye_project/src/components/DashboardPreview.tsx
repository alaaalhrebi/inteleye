"use client";

import {
  Star,
  TrendingUp,
  Brain,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Bell,
} from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7 }}
      className="ml-auto max-w-[500px] overflow-hidden rounded-[26px] border border-border bg-white shadow-xl"
    >
      {/* Header */}

      <div className="bg-gradient-to-r from-primary to-accent px-6 py-5 text-white">

        <div className="flex items-center justify-between">

          <div>

            <h2 className="text-lg font-bold">
              IntelEye Dashboard
            </h2>

            <p className="mt-1 text-xs opacity-80">
              مراقبة وتحليل السمعة الرقمية
            </p>

          </div>

          <div className="flex items-center gap-3">

            <Bell className="h-5 w-5 opacity-80" />

            <div className="h-3 w-3 rounded-full bg-peach animate-pulse" />

          </div>

        </div>

      </div>

      {/* KPI */}

      <div className="grid grid-cols-2 gap-4 p-5">

        <Card
          icon={<Star className="text-yellow-500" size={18} />}
          value="4.8"
          title="متوسط التقييم"
          bg="bg-yellow-50"
        />

        <Card
          icon={<TrendingUp className="text-accent" size={18} />}
          value="+23%"
          title="نمو السمعة"
          bg="bg-secondary/20"
        />

        <Card
          icon={<Brain className="text-primary" size={18} />}
          value="85%"
          title="رضا العملاء"
          bg="bg-background"
        />

        <Card
          icon={<MessageSquare className="text-accent" size={18} />}
          value="12.4K"
          title="التعليقات"
          bg="bg-peach/20"
        />

      </div>

      {/* AI Insights */}

      <div className="px-5 pb-5">

        <div className="rounded-2xl border border-border bg-background p-5">

          <div className="mb-4 flex items-center gap-2">

            <Brain className="text-primary" size={18} />

            <h3 className="font-bold text-primary">
              توصيات الذكاء الاصطناعي
            </h3>

          </div>

          <Insight
            icon={<AlertTriangle size={16} />}
            text="ارتفاع بسيط في الشكاوى المتعلقة بسرعة الخدمة."
            color="text-red-500"
          />

          <Insight
            icon={<CheckCircle2 size={16} />}
            text="تحسن معدل رضا العملاء هذا الأسبوع."
            color="text-accent"
          />

          <Insight
            icon={<TrendingUp size={16} />}
            text="زيادة التقييمات الإيجابية بنسبة 23٪."
            color="text-primary"
          />

        </div>

      </div>

      {/* Chart */}

      <div className="px-5 pb-5">

        <div className="mb-3 flex items-center gap-2">

          <BarChart3
            className="text-primary"
            size={18}
          />

          <h3 className="font-semibold text-primary">
            أداء التقييمات
          </h3>

        </div>

        <div className="flex h-28 items-end gap-2">
          {[30, 45, 40, 60, 52, 70, 82].map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: h }}
              transition={{ delay: i * 0.07 }}
              className="flex-1 rounded-t-lg bg-gradient-to-t from-primary to-secondary"
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
    <div
      className={`${bg} rounded-xl border border-border p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
    >
      <div className="mb-3">{icon}</div>

      <h3 className="text-2xl font-bold text-primary">
        {value}
      </h3>

      <p className="mt-1 text-sm text-muted">
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
    <div className="mb-3 flex items-start gap-3 rounded-xl bg-white p-3 shadow-sm">

      <div className={`${color} mt-0.5`}>
        {icon}
      </div>

      <p className="text-sm leading-6 text-muted">
        {text}
      </p>

    </div>
  );
}
