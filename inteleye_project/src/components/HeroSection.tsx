"use client";

import { motion } from "framer-motion";
import { PlayCircle, Sparkles, ArrowRight, CheckCircle2, Zap, Users } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "./Buttons";
import DashboardPreview from "./DashboardPreview";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white pt-32 pb-20">
      {/* Background Decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      <div className="mx-auto max-w-7xl px-8 flex flex-col items-center text-center">
        {/* Hero Text Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full bg-[#EEF1FF] px-5 py-2 text-sm font-semibold text-[#374375] border border-[#D4E0FF]"
          >
            < />
            منصة ذكاء اصطناعي لإدارة تقييمات العملاء
          </motion.div>

          {/* Title */}
          <h1 className="text-5xl md:text-6xl font-extrabold leading-[1.15] tracking-tight text-[#1A1A1A] mb-8">
            حلّل آراء عملائك...
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#374375] to-[#5B6BA8]">
              وطوّر سمعة علامتك التجارية
            </span>
          </h1>

          {/* Description */}
          <p className="mx-auto max-w-2xl text-lg md:text-xl leading-relaxed text-[#5F667A] mb-10">
            منصة ذكاء اصطناعي تساعد الشركات على تحليل تقييمات العملاء، واكتشاف المشكلات المتكررة، وتعزيز السمعة الرقمية للمنشأة باحترافية.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <button className="h-[64px] px-8 bg-[#374375] text-white font-bold rounded-xl hover:bg-[#2D3560] transition-all duration-300 flex items-center justify-center gap-3 group shadow-lg hover:shadow-xl">
              <div className="flex flex-col items-start text-right">
                <span className="text-lg">تجربة مجانية لمدة 14 يوم</span>
                <span className="text-[11px] font-normal opacity-80 leading-none">بدون الحاجة لبطاقة ائتمان</span>
              </div>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>


          {/* Features Tags */}
          <div className="flex flex-wrap justify-center gap-4 mb-20">
            {[
              { icon: <CheckCircle2 size={16} />, text: "تحليل فوري للتقييمات" },
              { icon: <Zap size={16} />, text: "ذكاء اصطناعي متقدم" },
              { icon: <Users size={16} />, text: "دعم متعدد المنصات" },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#FAFBFD] rounded-full border border-[#E5E7EB] text-sm font-medium text-gray-700 shadow-sm"
              >
                <span className="text-[#374375]">{feature.icon}</span>
                {feature.text}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Dashboard Preview Wrapper */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="relative w-full max-w-5xl"
        >
          {/* Decorative Glow */}
          <div className="absolute -inset-4 bg-gradient-to-r from-[#374375]/10 to-[#5B6BA8]/10 rounded-[40px] blur-2xl -z-10"></div>
          
          <div className="rounded-[32px] border border-[#E5E7EB] bg-white shadow-2xl overflow-hidden">
            <DashboardPreview />
          </div>
        </motion.div>

        {/* Bottom Stats Section */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          viewport={{ once: true }}
          className="mt-24 grid grid-cols-2 md:grid-cols-3 gap-8 w-full max-w-4xl"
        >
          <Stat number="+120K" title="تقييم تم تحليله" />
          <Stat number="98%" title="دقة التحليل" />
          <Stat number="24/7" title="مراقبة مستمرة" className="col-span-2 md:col-span-1" />
        </motion.div>
      </div>
    </section>
  );
}

type StatProps = {
  number: string;
  title: string;
  className?: string;
};

function Stat({ number, title, className = "" }: StatProps) {
  return (
    <div className={`text-center ${className}`}>
      <h2 className="text-4xl font-bold text-[#374375] mb-2">
        {number}
      </h2>
      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
        {title}
      </p>
    </div>
  );
}
