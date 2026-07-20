"use client";

import { motion } from "framer-motion";
import PricingCard from "./PricingCard";
import { plans } from "./plans";

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="py-24 bg-gradient-to-b from-white to-[#F8FAF8]"
    >
      <div className="max-w-6xl mx-auto px-6">

        {/* Header */}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <span className="inline-flex items-center rounded-full bg-[#BABDE2]/40 text-[#374375] px-5 py-2 text-sm font-medium">
            الأسعار
          </span>

          <h2 className="mt-8 text-5xl font-bold text-primary leading-tight">
            اختر الخطة المناسبة
            <br />
            لنمو أعمالك
          </h2>

          <p className="mt-8 text-lg leading-8 text-gray-600">
            جميع الخطط تشمل الذكاء الاصطناعي لتحليل تقييمات العملاء،
            التقارير الذكية، واقتراح الردود.
            اختر الخطة التي تناسب حجم منشأتك.
          </p>
        </motion.div>

        {/* Cards */}

        <div className="mt-16 grid items-stretch gap-6 lg:grid-cols-3">
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
