import { motion } from "framer-motion";
import { ReactNode } from "react";

type AnimatedTextProps = {
  children: ReactNode;
  className?: string;
};

export default function AnimatedText({
  children,
  className = "",
}: AnimatedTextProps) {
  return (
    <span
      className={`relative inline-flex overflow-hidden leading-none ${className}`}
    >
      {/* النص الأول */}
      <motion.span
        initial={{ y: 0 }}
        whileHover={{ y: "-100%" }}
        transition={{
          duration: 0.28,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="block"
      >
        {children}
      </motion.span>

      {/* النص الثاني */}
      <motion.span
        initial={{ y: "100%" }}
        whileHover={{ y: 0 }}
        transition={{
          duration: 0.28,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="absolute inset-0 block"
      >
        {children}
      </motion.span>
    </span>
  );
}