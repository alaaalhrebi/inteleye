"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";

type Props = {
  text: string;
  featured?: boolean;
};

export default function FeatureItem({
  text,
  featured = false,
}: Props) {
  return (
    <motion.div
      whileHover={{ x: 5 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-4"
    >
      <div
        className={`mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
          featured
            ? "bg-white text-[#374375]"
            : "bg-[#374375] text-white"
        }`}
      >
        <Check size={16} strokeWidth={3} />
      </div>

      <p
        className={`leading-7 ${
          featured ? "text-green-50" : "text-gray-600"
        }`}
      >
        {text}
      </p>
    </motion.div>
  );
}