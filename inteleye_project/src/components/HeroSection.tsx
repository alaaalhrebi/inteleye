"use client";

import { motion } from "framer-motion";
import { PlayCircle, Sparkles } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "./Buttons";
import DashboardPreview from "./DashboardPreview";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background pt-40 pb-24">

      {/* Background */}
      <div className="absolute inset-0 -z-10">

        <div className="absolute top-0 left-0 h-[500px] w-[500px] rounded-full bg-secondary/40 blur-[180px] opacity-60" />

        <div className="absolute bottom-0 right-0 h-[450px] w-[450px] rounded-full bg-peach/40 blur-[170px] opacity-60" />

      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-20 px-8 lg:grid-cols-2">

        {/* Left */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
        >

          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-secondary/30 px-4 py-2 text-primary">

            <Sparkles size={16} />

            منصة ذكاء اصطناعي لإدارة السمعة

          </div>

          <h1 className="text-6xl font-bold leading-tight text-primary">

            افهم تقييمات عملائك

            <span className="mt-2 block text-accent">

              واتخذ قرارات أذكى

            </span>

          </h1>

          <p className="mt-8 text-xl leading-10 text-muted">

            Intel Eye منصة ذكية تستخدم الذكاء الاصطناعي لتحليل تقييمات العملاء،
            فهم التعليقات، اكتشاف المشاكل المتكررة، واقتراح الردود المناسبة
            لتحسين جودة الخدمة ورفع تقييم منشأتك.

          </p>

          <div className="mt-10 flex flex-wrap gap-5">

            <PrimaryButton href="/signup">
              ابدأ التجربة
            </PrimaryButton>

            <SecondaryButton>

              <div className="flex items-center gap-2">

                <PlayCircle size={20} />

                مشاهدة العرض

              </div>

            </SecondaryButton>

          </div>

          {/* Stats */}
          <div className="mt-14 grid grid-cols-3 gap-6">

            <Stat
              number="120K+"
              title="تعليق تم تحليله"
            />

            <Stat
              number="98%"
              title="دقة التحليل"
            />

            <Stat
              number="24/7"
              title="مراقبة مستمرة"
            />

          </div>

        </motion.div>

        {/* Right */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >

          <DashboardPreview />

        </motion.div>

      </div>

    </section>
  );
}

type StatProps = {
  number: string;
  title: string;
};

function Stat({ number, title }: StatProps) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-6 text-center shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">

      <h2 className="text-4xl font-bold text-primary">

        {number}

      </h2>

      <p className="mt-3 text-muted">

        {title}

      </p>

    </div>
  );
}
