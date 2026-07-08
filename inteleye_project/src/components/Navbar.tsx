"use client";

import { Menu } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function Navbar() {
  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 z-50 w-full"
    >
      <div className="mx-auto max-w-7xl px-6 pt-5">
        <div className="flex flex-row-reverse items-center justify-between rounded-3xl border border-border bg-background/95 px-8 py-5 shadow-xl backdrop-blur-md">

          {/* Logo */}
          <Link
            href="/"
            className="flex flex-row-reverse items-center transition duration-300 hover:scale-105"
          >
            <img
              src="/logo.png"
              alt="IntelEye"
              className="h-16 w-auto object-contain"
            />
          </Link>

          {/* Desktop Menu */}
          <nav className="hidden items-center gap-10 lg:flex">

            <a
              href="#"
              className="font-medium text-text transition-all duration-300 hover:text-accent"
            >
              الرئيسية
            </a>

            <a
              href="#features"
              className="font-medium text-text transition-all duration-300 hover:text-accent"
            >
              المميزات
            </a>

            <a
              href="#pricing"
              className="font-medium text-text transition-all duration-300 hover:text-accent"
            >
              الأسعار
            </a>

            <a
              href="#contact"
              className="font-medium text-text transition-all duration-300 hover:text-accent"
            >
              تواصل
            </a>

          </nav>

          {/* Login Button */}
          <div className="flex items-center gap-4">

            <div className="hidden md:block">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
              >
                <Link
                  href="/login"
                  className="inline-flex items-center rounded-full bg-primary px-8 py-3 font-bold text-white shadow-lg transition-all duration-300 hover:bg-secondary"
                >
                  تسجيل الدخول
                </Link>
              </motion.div>
            </div>

            {/* Mobile Menu */}
            <button className="rounded-xl border border-border p-2 text-primary transition hover:bg-background lg:hidden">
              <Menu size={22} />
            </button>

          </div>
        </div>
      </div>
    </motion.header>
  );
}
