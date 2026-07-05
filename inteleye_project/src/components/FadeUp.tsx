"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "../lib/utils";

type FadeUpProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

export default function FadeUp({
  children,
  delay = 0,
  className,
}: FadeUpProps) {
  return (
    <motion.div
      className={cn(className)}
      initial={{
        opacity: 0,
        y: 24,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        amount: 0.3,
      }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}