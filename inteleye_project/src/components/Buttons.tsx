"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
};

export function PrimaryButton({
  children,
  onClick,
}: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="
      group
      inline-flex
      items-center
      gap-3
      rounded-full
      bg-[#374375]
      px-7
      py-3.5
      text-white
      font-semibold
      shadow-lg
      transition-all
      duration-300
      hover:bg-[#895159]
      hover:shadow-2xl
      "
    >
      {children}

      <ArrowRight
        size={18}
        className="transition-transform duration-300 group-hover:translate-x-1"
      />
    </motion.button>
  );
}

export function SecondaryButton({
  children,
  onClick,
}: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="
      inline-flex
      items-center
      justify-center
      rounded-full
      border
      border-[#374375]
      bg-white
      px-7
      py-3.5
      font-semibold
      text-[#374375]
      transition-all
      duration-300
      hover:bg-[#374375]
      hover:text-white
      "
    >
      {children}
    </motion.button>
  );
}