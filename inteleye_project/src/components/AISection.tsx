"use client";

import { motion } from "framer-motion";
import {
  BrainCircuit,
  SearchCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const steps = [
  {
    icon: SearchCheck,
    title: "جمع التقييمات",
    description:
      "يجمع IntelEye تقييمات العملاء من المنصات المختلفة ويقوم بتوحيدها في لوحة تحكم واحدة.",
  },
  {
    icon: BrainCircuit,
    title: "تحليل الذكاء الاصطناعي",
    description:
      "يقوم الذكاء الاصطناعي بتحليل المشاعر، استخراج المواضيع المتكررة، وفهم أسباب رضا أو استياء العملاء.",
  },
  {
    icon: Sparkles,
    title: "توصيات ذكية",
    description:
      "يعرض النظام أهم الإجراءات المقترحة لتحسين الخدمة، رفع التقييم، وحماية سمعة المنشأة.",
  },
];

export default function AISection() {
  return (
    <section className="bg-white py-20 sm:py-24 lg:py-28">

      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >

          <span className="inline-flex items-center gap-2 rounded-full bg-[#BABDE2]/40 px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium text-[#374375]">

            <BrainCircuit size={16} />

            كيف يعمل IntelEye

          </span>

          <h2 className="mt-6 sm:mt-8 text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-primary">

            الذكاء الاصطناعي يحول

            <br />

            التعليقات إلى قرارات

          </h2>

          <p className="mt-6 sm:mt-8 text-base sm:text-lg lg:text-xl leading-8 lg:leading-9 text-gray-600">

            بدل قراءة مئات التعليقات يدوياً،
            يقوم IntelEye بتحليلها،
            تصنيفها،
            واستخراج أهم المعلومات التي تساعدك
            على تحسين تجربة العملاء.

          </p>
                  {/* Steps */}

        <div className="mt-14 grid grid-cols-1 gap-6 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8 xl:mt-20 xl:gap-10">

          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <motion.div
                key={index}
                initial={{
                  opacity: 0,
                  y: 40,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: index * 0.15,
                  duration: 0.6,
                }}
                viewport={{
                  once: true,
                }}
                whileHover={{
                  y: -8,
                  scale: 1.02,
                }}
                className="relative rounded-[24px] lg:rounded-[32px] border border-gray-100 bg-[#F8FAF8] p-5 sm:p-6 lg:p-8 shadow-lg transition-all hover:-translate-y-2 hover:shadow-2xl"
              >

                {/* Step Number */}

                <div className="absolute left-4 top-4 text-5xl sm:left-6 sm:top-6 sm:text-6xl font-bold text-gray-100">

                  0{index + 1}

                </div>

                {/* Icon */}

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#374375] text-white sm:h-16 sm:w-16">

                  <Icon size={28} />

                </div>

                {/* Title */}

                <h3 className="mt-5 text-xl sm:mt-6 sm:text-2xl font-bold text-primary">

                  {step.title}

                </h3>

                {/* Description */}

                <p className="mt-4 text-sm leading-7 text-gray-600 sm:mt-5 sm:text-base sm:leading-8">

                  {step.description}

                </p>

                {/* Link */}

                <button className="mt-6 flex items-center gap-2 font-semibold text-[#374375] transition hover:gap-3">

                  معرفة المزيد

                  <ArrowRight size={18} />

                </button>
              </motion.div>
            );
          })}
        </div>

        </motion.div>

      </div>

    </section>
  );
}
