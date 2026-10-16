"use client";

import Link from "next/link";
import type { SVGProps } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Globe, Instagram, Smartphone } from "lucide-react";
import DashboardPreview from "./DashboardPreview";
export default function HeroSection() {

  const platforms = [
    { icon: Globe, name: "Google Maps" },
    { icon: Instagram, name: "Instagram" },
    { icon: XPlatformIcon, name: "X" },
    { icon: Smartphone, name: "TikTok" },
  ];

  return (
    <section className="relative overflow-hidden bg-white pt-36 md:pt-44 lg:pt-48 pb-16 md:pb-20">

      {/* Background Decoration */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">

        <div className="absolute top-20 right-10 h-60 w-60 rounded-full bg-blue-100 opacity-20 blur-3xl mix-blend-multiply md:h-72 md:w-72"></div>

        <div className="absolute bottom-20 left-10 h-60 w-60 rounded-full bg-indigo-100 opacity-20 blur-3xl mix-blend-multiply md:h-72 md:w-72"></div>

      </div>

      <div className="mx-auto flex max-w-[1400px] flex-col items-center px-4 text-center sm:px-6 lg:px-12">

        {/* Hero Text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl"
        >

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: .9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: .2, duration: .5 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#D4E0FF] bg-[#EEF1FF] px-4 py-2 text-xs font-semibold text-[#374375] sm:px-5 sm:text-sm"
          >
            <Sparkles size={14} />
            منصة ذكاء اصطناعي لإدارة تقييمات العملاء
          </motion.div>

          {/* Title */}
          <h1 className="mb-6 text-3xl font-extrabold leading-[1.15] tracking-tight text-[#1A1A1A] sm:text-4xl lg:text-5xl xl:text-6xl">

            حلّل آراء عملائك...

            <br />

            <span className="bg-gradient-to-r from-[#374375] to-[#5B6BA8] bg-clip-text text-transparent">
              وطوّر سمعة علامتك التجارية
            </span>

          </h1>

          {/* Description */}
          <p className="mx-auto mb-10 max-w-2xl text-sm leading-7 text-[#5F667A] sm:text-base md:text-lg lg:text-xl lg:leading-relaxed">

            منصة ذكاء اصطناعي تساعد الشركات على تحليل تقييمات العملاء،
            واكتشاف المشكلات المتكررة،
            وتعزيز السمعة الرقمية للمنشأة باحترافية.

          </p>

          {/* Button */}
          <div className="mb-14 flex flex-col items-center justify-center gap-4 sm:flex-row">

            <Link
              href="/signup"
              className="group flex min-h-[64px] w-full items-center justify-center gap-3 rounded-xl bg-[#374375] px-6 py-4 font-bold text-white shadow-lg transition-all duration-300 hover:bg-[#2D3560] hover:shadow-xl sm:h-[68px] sm:w-auto sm:px-8 lg:px-10"
            >

              <div className="flex flex-col items-start text-right">

                <span className="text-base sm:text-lg lg:text-xl">
                  تجربة مجانية لمدة 14 يوم
                </span>

                <span className="text-xs font-normal opacity-80">
                  بدون الحاجة لبطاقة ائتمان
                </span>

              </div>

              <ArrowRight
                size={22}
                className="transition-transform group-hover:translate-x-1"
              />

            </Link>

          </div>
                    {/* Features Tags */}
          <div className="mb-16 sm:mb-20 flex flex-wrap justify-center gap-2 sm:gap-3 lg:gap-4">

            {[
              "تحليل فوري للتقييمات",
              "ذكاء اصطناعي متقدم",
              "دعم متعدد المنصات",
            ].map((text, idx) => (
              <div
                key={idx}
                className="rounded-full border border-[#E5E7EB] bg-[#FAFBFD] px-4 py-2.5 text-xs font-semibold text-gray-700 shadow-sm sm:px-6 sm:py-3 sm:text-sm"
              >
                {text}
              </div>
            ))}

          </div>

        </motion.div>

        {/* Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: .5, duration: .8 }}
          className="relative w-full max-w-full lg:max-w-5xl"
        >

          <div className="absolute -inset-3 -z-10 rounded-[30px] bg-gradient-to-r from-[#374375]/10 to-[#5B6BA8]/10 blur-2xl sm:-inset-4 sm:rounded-[40px]" />

          <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl sm:rounded-[32px]">

            <DashboardPreview />

          </div>

        </motion.div>

{/* Supported Platforms */}
<section aria-labelledby="supported-platforms-heading" className="mt-16 sm:mt-20 lg:mt-24 w-full">

  <div className="mb-6 flex items-center justify-center gap-2 text-[#374375]/60">
    <span className="h-px w-8 bg-current"></span>
    <h2 id="supported-platforms-heading" className="text-base font-bold sm:text-lg">
      المنصات المدعومة
    </h2>
    <span className="h-px w-8 bg-current"></span>
  </div>

  <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-6 lg:gap-x-12">
    {platforms.map((platform) => (
      <li
        key={platform.name}
        className="flex items-center gap-4 select-none"
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white text-[#374375] shadow-sm sm:h-16 sm:w-16">
          <platform.icon aria-hidden="true" className="h-7 w-7 sm:h-8 sm:w-8" />
        </div>

        <span lang="en" className="whitespace-nowrap text-base font-bold text-[#374375] sm:text-lg">
          {platform.name}
        </span>
      </li>
    ))}
  </ul>

</section>
             

      </div>
    </section>
  );
}

function XPlatformIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.64 7.584H.47l8.6-9.835L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}
