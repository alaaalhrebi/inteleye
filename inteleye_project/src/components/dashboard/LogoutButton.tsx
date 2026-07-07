"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="inline-flex items-center gap-2 rounded-full border border-[#BABDE2]/60 bg-white px-5 py-3 text-sm font-bold text-[#374375] transition hover:bg-[#895159] hover:text-white"
    >
      <LogOut size={18} />
      تسجيل الخروج
    </button>
  );
}
