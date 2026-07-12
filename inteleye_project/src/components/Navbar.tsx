"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="mx-auto max-w-7xl px-6 pt-5">
        <div className="flex items-center justify-between rounded-3xl border border-border bg-background/90 px-8 py-5 shadow-xl backdrop-blur-lg">

          {/* Logo */}
          <Link href="/" className="flex items-center">
            <img
              src="/logo.png"
              alt="IntelEye"
              className="h-14 w-auto"
            />
          </Link>

          {/* Desktop Menu */}
          <nav className="hidden lg:flex items-center gap-10">
            <Link
              href="/"
              className="font-medium text-text transition hover:text-primary"
            >
              الرئيسية
            </Link>

            <a
              href="#features"
              className="font-medium text-text transition hover:text-primary"
            >
              المميزات
            </a>

            <a
              href="#pricing"
              className="font-medium text-text transition hover:text-primary"
            >
              الأسعار
            </a>

            <a
              href="#contact"
              className="font-medium text-text transition hover:text-primary"
            >
              تواصل
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              className="hidden md:block"
            >
              <Link
                href="/login"
                className="rounded-full bg-primary px-7 py-3 font-bold text-white transition hover:bg-accent"
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
              className="mt-3 rounded-3xl border border-border bg-background/95 p-6 shadow-xl lg:hidden"
            >
              <nav className="flex flex-col gap-5 text-right">

                <Link href="/" onClick={() => setOpen(false)}>
                  الرئيسية
                </Link>

                <a href="#features" onClick={() => setOpen(false)}>
                  المميزات
                </a>

                <a href="#pricing" onClick={() => setOpen(false)}>
                  الأسعار
                </a>

                <a href="#contact" onClick={() => setOpen(false)}>
                  تواصل
                </a>

                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="mt-3 rounded-full bg-primary px-6 py-3 text-center font-bold text-white"
                >
                  تسجيل الدخول
                </Link>

              </nav>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.header>
  );
}
