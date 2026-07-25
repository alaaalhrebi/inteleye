"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

type AnimatedTextProps = {
  children: ReactNode;
  className?: string;
};

const transition = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1] as const,
};

export default function AnimatedText({
  children,
  className = "",
}: AnimatedTextProps) {
  return (
    <span
      className={`
        relative
        inline-flex
        overflow-hidden
        whitespace-nowrap
        leading-none
        ${className}
      `}
    >
      {/* Default Text */}

      <motion.span
        initial={{ y: 0 }}
        whileHover={{ y: "-100%" }}
        whileTap={{ scale: 0.98 }}
        transition={transition}
        className="block"
      >
        {children}
      </motion.span>

      {/* Hover Text */}

      <motion.span
        aria-hidden="true"
        initial={{ y: "100%" }}
        whileHover={{ y: 0 }}
        transition={transition}
        className="absolute inset-0 block"
      >
        {children}
      </motion.span>
    </span>
  );
}
