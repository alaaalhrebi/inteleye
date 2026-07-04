"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function CheckoutSuccessPage() {
  const [status, setStatus] = useState<"waiting" | "active">("waiting");
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    // الدفع تم في المتصفح، لكن تفعيل الحساب الفعلي يحدث من webhook
    // في السيرفر، وقد يستغرق ثوانٍ قليلة. نتحقق بشكل متكرر (polling)
    // حتى تتحدث subscription_status إلى active، بدل افتراض النجاح فوراً.
    const interval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: client } = await supabase
        .from("clients")
        .select("subscription_status")
        .eq("user_id", user.id)
        .single();

      if (client?.subscription_status === "active") {
        setStatus("active");
        clearInterval(interval);
        setTimeout(() => router.push("/dashboard"), 1500);
      }
    }, 2000);

    // إيقاف المحاولة بعد 30 ثانية لمنع الانتظار اللانهائي عند أي خلل
    const timeout = setTimeout(() => clearInterval(interval), 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f4f0] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-[#eeede8] p-8 max-w-sm w-full text-center">
        {status === "waiting" ? (
          <>
            <p className="text-lg font-bold text-[#1a1a2e] mb-2">جاري تأكيد الدفع...</p>
            <p className="text-sm text-gray-500">
              قد يستغرق هذا بضع ثوانٍ. لا تغلق هذه الصفحة.
            </p>
          </>
        ) : (
          <>
            <p className="text-lg font-bold text-green-600 mb-2">تم تفعيل حسابك ✓</p>
            <p className="text-sm text-gray-500">جاري تحويلك إلى لوحة التحكم...</p>
          </>
        )}
      </div>
    </div>
  );
}
