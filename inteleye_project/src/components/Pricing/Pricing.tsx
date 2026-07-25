"use client";

import { motion } from "framer-motion";
import PricingCard from "./PricingCard";
import { plans } from "./plans";

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="bg-gradient-to-b from-white to-[#F8FAF8] py-16 sm:py-24 lg:py-32"
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12">

        {/* Header */}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >

          <span className="inline-flex items-center rounded-full bg-[#BABDE2]/40 px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium text-[#374375]">
            الأسعار
          </span>

          <h2 className="mt-6 sm:mt-8 text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-primary">

            اختر الخطة المناسبة

            <br />

            لنمو أعمالك

          </h2>

          <p className="mt-6 sm:mt-8 text-base sm:text-lg leading-8 text-gray-600">

            جميع الخطط تشمل الذكاء الاصطناعي لتحليل تقييمات العملاء،
            التقارير الذكية،
            واقتراح الردود.

            <br className="hidden sm:block" />

            اختر الخطة التي تناسب حجم منشأتك.

          </p>

        </motion.div>

        {/* Pricing Cards */}

        <div className="mt-12 grid grid-cols-1 gap-6 sm:mt-16 md:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:gap-8 xl:mt-20">

          {plans.map((plan, index) => (

            <PricingCard
              key={index}
              plan={plan}
            />

          ))}

        </div>

      </div>
    </section>
  );
}
