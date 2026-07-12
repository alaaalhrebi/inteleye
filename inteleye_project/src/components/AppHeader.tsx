"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AppHeader({ rightLabel }: { rightLabel?: string }) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      dir="rtl"
      className="sticky top-0 z-50 bg-[#1a1a2e] text-white px-5 py-3 flex items-center justify-between"
    >
<span className="font-bold text-sm">IntelEye</span>
      <div className="flex items-center gap-4">
        {rightLabel && <span className="text-xs text-gray-300">{rightLabel}</span>}
        <button
          onClick={handleLogout}
          title="تسجيل الخروج"
          aria-label="تسجيل الخروج"
          className="text-gray-300 hover:text-white transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  );
}
