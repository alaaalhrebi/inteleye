// Navbar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const navItem =
    "text-[15px] md:text-[16px] font-semibold text-[#374375] transition hover:text-[#22315E]";

  const btn =
    "rounded-full bg-[#374375] px-4 md:px-6 py-2.5 md:py-3 text-xs md:text-sm font-bold text-white transition hover:bg-[#2A3460]";

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-8 pt-3 md:pt-5">
        <div className="grid grid-cols-2 lg:grid-cols-3 items-center rounded-3xl border border-border bg-background/90 px-5 md:px-8 py-4 md:py-5 shadow-xl backdrop-blur-xl">

          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="IntelEye" className="h-10 md:h-12 lg:h-14 w-auto"/>
            <span className="text-2xl md:text-3xl lg:text-[32px] font-black tracking-tight text-[#374375]">
              INTELEYE
            </span>
          </Link>

          <nav className="hidden lg:flex items-center justify-center gap-5 xl:gap-8">
            <Link href="/" className={navItem}>الرئيسية</Link>
            <a href="#features" className={navItem}>المميزات</a>
            <a href="#pricing" className={navItem}>الأسعار</a>
            <a href="#contact" className={navItem}>تواصل</a>
          </nav>

          <div className="flex items-center justify-end gap-3">
            <Link href="/demo" className={`hidden md:block ${btn}`}>تجربة مجانية</Link>
            <Link href="/login" className={`hidden md:block ${btn}`}>تسجيل الدخول</Link>

            <button onClick={()=>setOpen(!open)} className="rounded-xl border border-border p-2.5 lg:hidden">
              {open ? <X size={22}/> : <Menu size={22}/>}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{opacity:0,y:-10}}
              animate={{opacity:1,y:0}}
              exit={{opacity:0,y:-10}}
              className="mt-3 rounded-3xl border border-border bg-background/95 p-6 shadow-xl lg:hidden"
            >
              <nav className="flex flex-col gap-5">
                <Link href="/" onClick={()=>setOpen(false)}>الرئيسية</Link>
                <a href="#features" onClick={()=>setOpen(false)}>المميزات</a>
                <a href="#pricing" onClick={()=>setOpen(false)}>الأسعار</a>
                <a href="#contact" onClick={()=>setOpen(false)}>تواصل</a>

                <Link href="/demo" onClick={()=>setOpen(false)} className={btn}>تجربة مجانية</Link>
                <Link href="/login" onClick={()=>setOpen(false)} className={btn}>تسجيل الدخول</Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.header>
  );
}
