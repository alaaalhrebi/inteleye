"use client";

import { Printer } from "lucide-react";

export default function PrintDashboardButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-full border border-[#374375] bg-white px-5 py-3 text-sm font-bold text-[#374375] transition hover:bg-[#374375] hover:text-white"
      aria-label="طباعة لوحة التحكم"
    >
      <Printer size={18} />
      <span className="hidden sm:inline">طباعة الصفحة</span>
    </button>
  );
}
