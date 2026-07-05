"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
};

const primaryClassName = `
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
`;

const secondaryClassName = `
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
`;

export function PrimaryButton({ children, href, onClick }: ButtonProps) {
  if (href) {
    return (
      <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
        <Link href={href} className={primaryClassName}>
          {children}

          <ArrowRight
            size={18}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={primaryClassName}
    >
      {children}

      <ArrowRight
        size={18}
        className="transition-transform duration-300 group-hover:translate-x-1"
      />
    </motion.button>
  );
}

export function SecondaryButton({ children, href, onClick }: ButtonProps) {
  if (href) {
    return (
      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
        <Link href={href} className={secondaryClassName}>
          {children}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={secondaryClassName}
    >
      {children}
    </motion.button>
  );
}
