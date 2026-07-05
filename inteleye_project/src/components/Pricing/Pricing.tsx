"use client";

import { motion } from "framer-motion";
import PricingCard from "./PricingCard";
import { plans } from "./plans";

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="py-28 bg-gradient-to-b from-white to-[#F8FAF8]"
    >
      <div className="max-w-7xl mx-auto px-8">

        {/* Header */}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: .6 }}
          className="text-center max-w-3xl mx-auto"
        >

          <span className="inline-flex items-center rounded-full bg-[#BABDE2]/40 text-[#374375] px-5 py-2 text-sm font-medium">

            الأسعار

          </span>

          <h2 className="mt-8 text-5xl font-bold text-[#16352B] leading-tight">

            اختر الخطة المناسبة
            <br />
            لنمو أعمالك

          </h2>

          <p className="mt-8 text-xl leading-9 text-gray-600">

            جميع الخطط تشمل الذكاء الاصطناعي لتحليل تقييمات العملاء،
            التقارير الذكية، واقتراح الردود.
            اختر الخطة التي تناسب حجم منشأتك.

          </p>

        </motion.div>

        {/* Cards */}

        <div className="grid lg:grid-cols-3 gap-8 mt-20">

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