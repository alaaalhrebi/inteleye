"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const navLink =
    "relative text-[16px] font-bold text-[#374375] transition-all duration-300 hover:text-primary after:absolute after:left-0 after:-bottom-2 after:h-[2px] after:w-0 after:bg-primary after:transition-all after:duration-300 hover:after:w-full";

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div className="mx-auto max-w-7xl px-6 pt-5">
        <div className="flex items-center justify-between rounded-3xl border border-border bg-background/90 px-8 py-5 shadow-xl backdrop-blur-xl">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-4">

            <img
              src="/logo.png"
              alt="IntelEye"
              className="h-14 w-auto object-contain"
            />

            <span
              className="select-none text-[34px] font-black tracking-[-0.05em] text-[#374375]"
              style={{
                fontFamily: "'Space Grotesk', 'Sora', 'Inter', sans-serif",
              }}
            >
              INTELEYE
            </span>

          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-10">

            <Link href="/" className={navLink}>
              الرئيسية
            </Link>

            <a href="#features" className={navLink}>
              المميزات
            </a>

            <a href="#pricing" className={navLink}>
              الأسعار
            </a>

            <a href="#contact" className={navLink}>
              تواصل
            </a>

          </nav>

          {/* Right Buttons */}
          <div className="flex items-center gap-4">

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="hidden md:block"
            >
              <Link
                href="/demo"
                className="rounded-full border-2 border-[#374375] px-6 py-3 font-semibold text-[#374375] transition-all duration-300 hover:bg-[#374375] hover:text-white"
              >
                تجربة مجانية
              </Link>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="hidden md:block"
            >
              <Link
                href="/login"
                className="rounded-full bg-[#374375] px-7 py-3 font-bold text-white shadow-lg transition-all duration-300 hover:bg-[#2E365F]"
              >
                تسجيل الدخول
              </Link>
            </motion.div>

            <button
              onClick={() => setOpen(!open)}
              className="rounded-xl border border-border p-2 lg:hidden"
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>

          </div>

        </div>
                <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="mt-3 rounded-3xl border border-border bg-background/95 p-6 shadow-xl backdrop-blur-xl lg:hidden"
            >
              <nav className="flex flex-col gap-6 text-right">

                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  className="text-lg font-semibold text-[#374375]"
                >
                  الرئيسية
                </Link>

                <a
                  href="#features"
                  onClick={() => setOpen(false)}
                  className="text-lg font-semibold text-[#374375]"
                >
                  المميزات
                </a>

                <a
                  href="#pricing"
                  onClick={() => setOpen(false)}
                  className="text-lg font-semibold text-[#374375]"
                >
                  الأسعار
                </a>

                <a
                  href="#contact"
                  onClick={() => setOpen(false)}
                  className="text-lg font-semibold text-[#374375]"
                >
                  تواصل
                </a>

                <div className="mt-4 flex flex-col gap-3">

                  <Link
                    href="/demo"
                    onClick={() => setOpen(false)}
                    className="rounded-full border-2 border-[#374375] px-6 py-3 text-center font-semibold text-[#374375] transition hover:bg-[#374375] hover:text-white"
                  >
                    تجربة مجانية
                  </Link>

                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="rounded-full bg-[#374375] px-6 py-3 text-center font-bold text-white shadow-lg transition hover:bg-[#2E365F]"
                  >
                    تسجيل الدخول
                  </Link>

                </div>

              </nav>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.header>
  );
}
