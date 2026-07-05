"use client";

import { motion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "./Buttons";

export default function CTA() {
  return (
    <section className="py-28 bg-[#F5F9F6]">

      <div className="max-w-7xl mx-auto px-8">

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-[40px] bg-gradient-to-r from-[#374375] via-[#1D7A5D] to-[#14523F] p-16 text-center text-white shadow-2xl"
        >

          {/* Glow */}

          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[#D4AF37]/20 blur-3xl" />

          <div className="relative z-10">

            <span className="inline-block rounded-full bg-white/10 border border-white/20 px-5 py-2 text-sm backdrop-blur">

              🚀 ابدأ اليوم

            </span>

            <h2 className="mt-8 text-5xl font-bold leading-tight">

              حوّل تقييمات العملاء
              <br />
              إلى فرص للنمو

            </h2>

            <p className="mx-auto mt-8 max-w-3xl text-xl leading-9 text-green-50">

              دع الذكاء الاصطناعي يتولى تحليل التعليقات،
              اكتشاف المشكلات، واقتراح أفضل الحلول
              بينما تركز أنت على تنمية أعمالك.

            </p>

            <div className="mt-12 flex flex-wrap justify-center gap-5">

              <PrimaryButton>

                <div className="flex items-center gap-2">

                  ابدأ التجربة المجانية

                  <ArrowRight size={18} />

                </div>

              </PrimaryButton>

              <SecondaryButton>

                <div className="flex items-center gap-2">

                  <PlayCircle size={20} />

                  مشاهدة العرض

                </div>

              </SecondaryButton>

            </div>

            <div className="mt-12 flex flex-wrap justify-center gap-10 text-sm text-green-100">

              <div>✔ لا تحتاج بطاقة ائتمانية</div>

              <div>✔ إعداد خلال دقائق</div>

              <div>✔ دعم فني متخصص</div>

            </div>

          </div>

        </motion.div>

      </div>

    </section>
  );
}