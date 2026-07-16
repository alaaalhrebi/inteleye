"use client";

import { motion } from "framer-motion";
import { PlayCircle, Sparkles } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "./Buttons";
import DashboardPreview from "./DashboardPreview";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#F8FAF8] pt-32 pb-20">

      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-0 top-0 h-[500px] w-[500px] rounded-full bg-[#BABDE2]/30 blur-[180px]" />
        <div className="absolute bottom-0 right-0 h-[450px] w-[450px] rounded-full bg-[#FFF2D7] blur-[170px]" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-8 lg:grid-cols-2">

        {/* Hero Text */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-xl"
        >

          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#EEF1FF] px-5 py-2 text-sm font-medium text-[#374375]">
            <Sparkles size={14} />
            منصة ذكاء اصطناعي لإدارة تقييمات العملاء
          </div>

          {/* Title */}
<h1 className="text-[36px] xl:text-[44px] font-bold leading-[1.25] tracking-tight text-primary">
  حلّل آراء عملائك...
            <br />
            وطوّر سمعة علامتك التجارية
            <br />
            <span className="text-[#374375]">
              بالذكاء الاصطناعي
            </span>
          </h1>

          {/* Description */}
<p className="mt-6 text-[15px] leading-8 text-[#5F667A]">
  <span className="rounded-lg bg-[#EEF1FF] px-2 py-1 text-xl font-extrabold text-[#374375]">
              IntelEye
            </span>

            <span className="mx-2">
              منصة ذكاء اصطناعي تساعد الشركات على تحليل تقييمات العملاء،
              واكتشاف المشكلات المتكررة، واقتراح ردود احترافية،
              وإنشاء تقارير ذكية تساعد على تحسين جودة الخدمة
              وتعزيز السمعة الرقمية للمنشأة.
            </span>
          </p>

          {/* Buttons */}
          <div className="mt-7 flex flex-wrap gap-4">
            <PrimaryButton href="/signup">
              ابدأ التجربة
            </PrimaryButton>

            <SecondaryButton>
              <div className="flex items-center gap-2">
                <PlayCircle size={18} />
                مشاهدة العرض
              </div>
            </SecondaryButton>
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-5">
            <Stat number="120K+" title="تقييم تم تحليله" />
            <Stat number="98%" title="دقة التحليل" />
            <Stat number="24/7" title="مراقبة مستمرة" />
          </div>

        </motion.div>

        {/* Dashboard */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
className="flex justify-center -mt-4"
          >
          <div className="origin-center scale-[0.88]">
            <DashboardPreview />
          </div>
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
    <div className="rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm">
      <h2 className="text-3xl font-bold text-primary">
        {number}
      </h2>

      <p className="mt-2 text-sm text-[#6B7280]">
        {title}
      </p>
    </div>
  );
}
