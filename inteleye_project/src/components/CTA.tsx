"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  Clock3,
  Headphones,
} from "lucide-react";
import { PrimaryButton } from "./Buttons";

export default function CTA() {
  return (
    <section className="py-28 bg-[#F5F9F6]">
      <div className="max-w-7xl mx-auto px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-[40px] bg-[linear-gradient(135deg,#374375_0%,#56639D_35%,#7F8BC2_70%,#BABDE2_100%)] p-16 text-center text-white shadow-2xl"
        >
          {/* Glow Effects */}

          <div className="absolute -top-28 -left-28 h-80 w-80 rounded-full bg-[#BABDE2]/30 blur-[120px]" />

          <div className="absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-[#DFAEA1]/25 blur-[120px]" />

          <div className="relative z-10">
            <span className="inline-block rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm backdrop-blur">
              🚀 ابدأ اليوم
            </span>

            <h2 className="mt-8 text-5xl font-bold leading-tight">
              حوّل تقييمات العملاء
              <br />
              إلى فرص للنمو
            </h2>

            <p className="mx-auto mt-8 max-w-3xl text-xl leading-9 text-white/90">
              دع الذكاء الاصطناعي يتولى تحليل التعليقات،
              واكتشاف المشكلات، واقتراح أفضل الحلول
              بينما تركز أنت على تنمية أعمالك.
            </p>

            {/* Button */}

            <div className="mt-12 flex justify-center">
              <PrimaryButton>
                <div className="flex items-center gap-2">
                  ابدأ التجربة المجانية
                  <ArrowRight size={18} />
                </div>
              </PrimaryButton>
            </div>

            {/* Features */}

            <div className="mt-12 flex flex-wrap justify-center gap-10 text-sm text-white/90">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#DFAEA1]" />
                لا تحتاج بطاقة ائتمانية
              </div>

              <div className="flex items-center gap-2">
                <Clock3 size={18} className="text-[#DFAEA1]" />
                إعداد خلال دقائق
              </div>

              <div className="flex items-center gap-2">
                <Headphones size={18} className="text-[#DFAEA1]" />
                دعم فني متخصص
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
