"use client";

import { motion } from "framer-motion";
import { PlayCircle, Sparkles } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "./Buttons";
import DashboardPreview from "./DashboardPreview";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#F8FAF8] pt-40 pb-24">

      {/* Background */}

      <div className="absolute inset-0 -z-10">

        <div className="absolute top-0 left-0 h-[500px] w-[500px] rounded-full bg-[#BABDE2]/30 blur-[180px]" />

        <div className="absolute bottom-0 right-0 h-[450px] w-[450px] rounded-full bg-[#FFF2D7] blur-[170px]" />

      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-24 px-8 lg:grid-cols-2">

        {/* Hero Text */}

        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-xl"
        >

          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-[#EEF1FF] px-5 py-2 text-sm font-medium text-[#374375]">

            <Sparkles size={13} />

            منصة ذكاء اصطناعي لإدارة أراء العملاء

          </div>

          <h1 className="text-5xl font-extrabold leading-[1.35] text-[#16352B] xl:text-6xl">

            افهم تقييمات عملائك

            <br />

            واتخذ قرارات أذكى

          </h1>

          <p className="mt-7 text-[14px] leading-9 text-[#5F667A]">

             منصة ذكاء اصطناعي تساعد الشركات على تحليل تقييمات العملاء IntelEye
            واكتشاف المشاكل المتكررة، واقتراح ردود احترافية، وإنشاء تقارير ذكية
            تساعد في تحسين جودة الخدمة ورفع السمعة الرقمية لمنشأتك.

          </p>

          <div className="mt-10 flex flex-wrap gap-4">

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

          <div className="mt-12 grid grid-cols-3 gap-5">

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

        {/* Dashboard */}

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="flex justify-center"
        >

          <div className="origin-center scale-[0.88] xl:scale-95">

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
    <div className="rounded-3xl border border-gray-100 bg-white p-5 text-center shadow-lg">

      <h2 className="text-2xl font-bold text-[#16352B]">

        {number}

      </h2>

      <p className="mt-2 text-sm text-[#6B7280]">

        {title}

      </p>

    </div>
  );
}
