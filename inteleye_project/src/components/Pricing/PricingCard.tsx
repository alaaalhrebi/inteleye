"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import SpotlightBorder from "../SpotlightBorder";
import FeatureItem from "./FeatureItem";
import AnimatedText from "../AnimatedText";

type Feature = {
  text: string;
};

type Plan = {
  name: string;
  price: string;
  description: string;
  featured?: boolean;
  features: Feature[];
};

type Props = {
  plan: Plan;
};

function getPlanSlug(planName: string) {
  const name = planName.toLowerCase();

  if (name.includes("basic")) return "basic";
  if (name.includes("pro")) return "pro";
  if (name.includes("enterprise")) return "enterprise";

  return "basic";
}

export default function PricingCard({ plan }: Props) {
  const planSlug = getPlanSlug(plan.name);

  return (
    <SpotlightBorder className="group h-full">
      <motion.div
        whileHover={{ y: -6, scale: 1.02 }}
        transition={{ duration: 0.3 }}
        className={`
          relative
          flex
          flex-col
          h-full
          rounded-[24px]
          border
          p-7
          shadow-lg
          transition-all
          ${
            plan.featured
              ? "border-[#374375] bg-[#374375] text-white"
              : "border-gray-200 bg-white"
          }
        `}
      >
        {plan.featured && (
          <div className="absolute right-6 top-6 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">
            الأكثر طلبًا
          </div>
        )}

        <h3
          className={`text-xl font-bold ${
            plan.featured ? "text-white" : "text-primary"
          }`}
        >
          {plan.name}
        </h3>

        <div className="mt-5 flex items-end gap-2">
          <span
            className={`text-5xl font-bold ${
              plan.featured ? "text-white" : "text-primary"
            }`}
          >
            {plan.price}
          </span>

          <span
            className={`mb-2 text-sm ${
              plan.featured ? "text-[#FFFCF5]/90" : "text-gray-500"
            }`}
          >
            ريال / شهر
          </span>
        </div>

        <p
          className={`mt-5 text-sm leading-7 ${
            plan.featured ? "text-[#FFFCF5]" : "text-gray-600"
          }`}
        >
          {plan.description}
        </p>

        <div
          className={`my-7 ${
            plan.featured
              ? "border-t border-white/20"
              : "border-t border-gray-200"
          }`}
        />

        {/* Features */}
        <div className="flex-1 space-y-3">
          {plan.features.map((feature, index) => (
            <FeatureItem
              key={index}
              text={feature.text}
              featured={plan.featured}
            />
          ))}
        </div>

        {/* Button */}
        <Link
          href={`/signup?plan=${planSlug}`}
          className={`
            mt-8
            flex
            w-full
            items-center
            justify-center
            rounded-xl
            py-3
            text-base
            font-semibold
            transition-all
            duration-300
            ${
              plan.featured
                ? "bg-white text-[#374375] hover:scale-[1.02]"
                : "bg-[#374375] text-white hover:bg-[#895159]"
            }
          `}
        >
          <AnimatedText>ابدأ الآن</AnimatedText>
        </Link>

        <div
          className={`
            absolute
            inset-x-0
            bottom-0
            h-1
            rounded-b-[24px]
            ${plan.featured ? "bg-accent" : "bg-[#374375]"}
          `}
        />
      </motion.div>
    </SpotlightBorder>
  );
}
