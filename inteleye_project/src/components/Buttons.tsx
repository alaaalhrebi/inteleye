"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  showArrow?: boolean;
};

const primaryClassName = `
group
inline-flex
items-center
justify-center
gap-2
rounded-full
bg-primary
px-6
sm:px-7
py-3
sm:py-3.5
text-sm
sm:text-base
font-semibold
text-white
shadow-lg
transition-all
duration-300
hover:bg-accent
hover:shadow-xl
`;

const secondaryClassName = `
inline-flex
items-center
justify-center
rounded-full
border
border-primary
bg-white
px-6
sm:px-7
py-3
sm:py-3.5
text-sm
sm:text-base
font-semibold
text-primary
shadow-sm
transition-all
duration-300
hover:bg-primary
hover:text-white
hover:shadow-lg
`;

export function PrimaryButton({
  children,
  href,
  onClick,
  showArrow = true,
}: ButtonProps) {

  const content = (
    <>
      {children}

      {showArrow && (
        <ArrowRight
          size={18}
          className="transition-transform duration-300 group-hover:translate-x-1"
        />
      )}
    </>
  );

  if (href) {
    return (
      <motion.div
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
      >
        <Link
          href={href}
          className={primaryClassName}
        >
          {content}
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
      {content}
    </motion.button>
  );
}

export function SecondaryButton({
  children,
  href,
  onClick,
}: ButtonProps) {

  if (href) {
    return (
      <motion.div
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        <Link
          href={href}
          className={secondaryClassName}
        >
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
