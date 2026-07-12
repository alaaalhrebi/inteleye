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
        whileHover={{
          y: -8,
          scale: 1.015,
        }}
        transition={{
          duration: 0.35,
        }}
        className={`
          relative
          h-full
          rounded-[32px]
          border
          p-10
          shadow-xl
          transition-all
          ${
            plan.featured
              ? "border-[#374375] bg-[#374375] text-white"
              : "border-gray-200 bg-white"
          }
        `}
      >
        {plan.featured && (
<div className="absolute right-8 top-8 rounded-full bg-accent px-4 py-1 text-sm font-semibold text-white">
  الأكثر طلبًا
          </div>
        )}

        <h3
          className={`text-2xl font-bold ${
plan.featured ? "text-white" : "text-primary"
          }`}
        >
          {plan.name}
        </h3>

        <div className="mt-8 flex items-end gap-2">
          <span
            className={`text-6xl font-bold ${
plan.featured ? "text-white" : "text-primary"
            }`}
          >
            {plan.price}
          </span>

          <span
            className={`mb-2 ${
              plan.featured ? "text-[#FFFCF5]/90" : "text-gray-500"
            }`}
          >
            ريال / شهر
          </span>
        </div>

        <p
          className={`mt-6 leading-8 ${
            plan.featured ? "text-[#FFFCF5]" : "text-gray-600"
          }`}
        >
          {plan.description}
        </p>

        <Link
          href={`/signup?plan=${planSlug}`}
          className={`
            mt-10
            flex
            w-full
            items-center
            justify-center
            rounded-2xl
            py-4
            text-lg
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
          className={`my-10 ${
            plan.featured
              ? "border-t border-white/20"
              : "border-t border-gray-200"
          }`}
        />

        <div className="space-y-5">
          {plan.features.map((feature, index) => (
            <FeatureItem
              key={index}
              text={feature.text}
              featured={plan.featured}
            />
          ))}
        </div>

        <div
          className={`
            absolute
            inset-x-0
            bottom-0
            h-1
            rounded-b-[32px]
${plan.featured ? "bg-accent" : "bg-[#374375]"}
`}
        />
      </motion.div>
    </SpotlightBorder>
  );
}
