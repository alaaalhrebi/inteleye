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
        <div className="flex flex-row-reverse items-center justify-between rounded-2xl border border-white/60 bg-white/80 px-7 py-4 shadow-lg backdrop-blur-xl">
          {/* Logo */}
          <div className="flex flex-row-reverse items-center gap-3">
            <img
              src="/logo.png"
              alt="Intel Eye"
              className="h-14 w-auto object-contain"
            />
          </div>

          {/* Desktop Menu */}
          <nav className="hidden items-center gap-10 lg:flex">
            <a
              href="#"
              className="text-gray-700 transition hover:text-[#374375]"
            >
              الرئيسية
            </a>

            <a
              href="#features"
              className="text-gray-700 transition hover:text-[#374375]"
            >
              المميزات
            </a>

            <a
              href="#pricing"
              className="text-gray-700 transition hover:text-[#374375]"
            >
              الأسعار
            </a>

            <a
              href="#contact"
              className="text-gray-700 transition hover:text-[#374375]"
            >
              تواصل
            </a>
          </nav>

          {/* Login */}
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Link
                  href="/login"
                  className="inline-flex items-center rounded-full bg-[#374375] px-8 py-4 font-bold text-white shadow-lg transition hover:bg-[#895159]"
                >
                  تسجيل الدخول
                </Link>
              </motion.div>
            </div>

            <button className="rounded-xl border p-2 transition hover:bg-gray-100 lg:hidden">
              <Menu size={22} />
            </button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
