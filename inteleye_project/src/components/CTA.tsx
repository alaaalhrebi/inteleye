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
    <section className="bg-[#F5F9F6] py-20 sm:py-24 lg:py-28">

      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-[28px] lg:rounded-[40px] bg-[linear-gradient(135deg,#374375_0%,#56639D_35%,#7F8BC2_70%,#BABDE2_100%)] px-6 py-10 sm:px-10 sm:py-14 lg:p-16 text-center text-white shadow-2xl"
        >

          {/* Glow */}

          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#BABDE2]/30 blur-[120px]" />

          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[#DFAEA1]/25 blur-[120px]" />

          <div className="relative z-10">

            {/* Badge */}

            <span className="inline-block rounded-full border border-white/20 bg-white/10 px-4 sm:px-5 py-2 text-xs sm:text-sm backdrop-blur">

              🚀 ابدأ اليوم

            </span>

            {/* Title */}

            <h2 className="mt-6 sm:mt-8 text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">

              حوّل تقييمات العملاء

              <br />

              إلى فرص للنمو

            </h2>

            {/* Description */}

            <p className="mx-auto mt-6 sm:mt-8 max-w-3xl text-base sm:text-lg lg:text-xl leading-8 lg:leading-9 text-white/90">

              دع الذكاء الاصطناعي يتولى تحليل التعليقات،
              واكتشاف المشكلات،
              واقتراح أفضل الحلول
              بينما تركز أنت على تنمية أعمالك.

            </p>

            {/* CTA Button */}

            <div className="mt-10 sm:mt-12 flex justify-center">

          <PrimaryButton>
  ابدأ التجربة المجانية
</PrimaryButton>

            </div>

            {/* Features */}

            <div className="mt-10 sm:mt-12 grid grid-cols-1 gap-5 text-sm text-white/90 sm:grid-cols-3 sm:gap-8">

              <div className="flex items-center justify-center gap-2">

                <ShieldCheck
                  size={18}
                  className="text-[#DFAEA1]"
                />

                لا تحتاج بطاقة ائتمانية

              </div>

              <div className="flex items-center justify-center gap-2">

                <Clock3
                  size={18}
                  className="text-[#DFAEA1]"
                />

                إعداد خلال دقائق

              </div>

              <div className="flex items-center justify-center gap-2">

                <Headphones
                  size={18}
                  className="text-[#DFAEA1]"
                />

                دعم فني متخصص

              </div>

            </div>

          </div>

        </motion.div>

      </div>

    </section>
  );
}
