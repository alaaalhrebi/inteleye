"use client";

import { motion } from "framer-motion";
import { ArrowRight, PlayCircle, Sparkles } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "./Buttons";
import DashboardPreview from "./DashboardPreview";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#F8FAF8] pt-40 pb-24">

      {/* Background */}

      <div className="absolute inset-0 -z-10">

        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-green-100 rounded-full blur-[180px] opacity-60" />

        <div className="absolute bottom-0 right-0 w-[450px] h-[450px] bg-yellow-100 rounded-full blur-[170px] opacity-60" />

      </div>

      <div className="max-w-7xl mx-auto px-8 grid lg:grid-cols-2 gap-20 items-center">

        {/* Left */}

        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: .7 }}
        >

          <div className="inline-flex items-center gap-2 rounded-full bg-green-100 text-green-700 px-4 py-2 mb-8">

            <Sparkles size={16} />

            منصة ذكاء اصطناعي لإدارة السمعة

          </div>

          <h1 className="text-6xl leading-tight font-bold text-[#16352B]">

            افهم تقييمات عملائك

            <span className="text-[#374375] block">

              واتخذ قرارات أذكى

            </span>

          </h1>

          <p className="mt-8 text-xl text-gray-600 leading-10">

            Intel Eye منصة ذكية تستخدم الذكاء الاصطناعي لتحليل تقييمات العملاء،
            فهم التعليقات، اكتشاف المشاكل المتكررة، واقتراح الردود المناسبة
            لتحسين جودة الخدمة ورفع تقييم منشأتك.

          </p>

          <div className="mt-10 flex flex-wrap gap-5">

            <PrimaryButton>

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
          transition={{ duration: .8 }}
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
    <div className="rounded-3xl bg-white border border-gray-100 shadow-lg p-6 text-center">

      <h2 className="text-4xl font-bold text-[#374375]">

        {number}

      </h2>

      <p className="text-gray-500 mt-3">

        {title}

      </p>

    </div>
  );
}