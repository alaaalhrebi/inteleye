"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Clock3, Sparkles, TriangleAlert } from "lucide-react";
import { Suspense, useEffect, useState } from "react";

import { normalizePlan, PLAN_DETAILS } from "@/lib/plans";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type ConfirmationStatus = "waiting" | "active" | "timeout";

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <SuccessCard status="waiting" isUpgrade={false} planName="الباقة" />
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [status, setStatus] = useState<ConfirmationStatus>("waiting");
  const targetPlan = normalizePlan(searchParams.get("plan"));
  const isUpgrade = searchParams.get("mode") === "upgrade";

  useEffect(() => {
    let isMounted = true;
    let isConfirmed = false;
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;

    async function confirmSubscription() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !isMounted || isConfirmed) return;

      const { data: client } = await supabase
        .from("clients")
        .select("subscription_status, plan")
        .eq("user_id", user.id)
        .maybeSingle();

      const activatedTargetPlan =
        client?.subscription_status?.toLowerCase() === "active" &&
        client?.plan?.trim().toLowerCase() === targetPlan;

      if (activatedTargetPlan && isMounted) {
        isConfirmed = true;
        setStatus("active");
        redirectTimer = setTimeout(() => router.replace("/dashboard"), 1800);
      }
    }

    confirmSubscription();
    const interval = setInterval(confirmSubscription, 2000);
    const timeout = setTimeout(() => {
      if (isMounted && !isConfirmed) setStatus("timeout");
      clearInterval(interval);
    }, 45000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      clearTimeout(timeout);
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [router, supabase, targetPlan]);

  return (
    <SuccessCard
      status={status}
      isUpgrade={isUpgrade}
      planName={PLAN_DETAILS[targetPlan].name}
    />
  );
}

function SuccessCard({
  status,
  isUpgrade,
  planName,
}: {
  status: ConfirmationStatus;
  isUpgrade: boolean;
  planName: string;
}) {
  return (
    <main
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F8F7F3] px-4 py-10 text-[#374375]"
    >
      <div className="absolute right-[-130px] top-[-150px] h-[350px] w-[350px] rounded-full bg-[#BABDE2]/45 blur-[120px]" />
      <div className="absolute bottom-[-140px] left-[-130px] h-[350px] w-[350px] rounded-full bg-[#DFAEA1]/35 blur-[120px]" />

      <section className="relative w-full max-w-lg rounded-[2rem] border border-[#BABDE2]/35 bg-white p-8 text-center shadow-xl sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#374375] text-white">
          {status === "waiting" ? (
            <Clock3 size={30} />
          ) : status === "active" ? (
            <CheckCircle2 size={30} />
          ) : (
            <TriangleAlert size={30} />
          )}
        </div>

        {status === "waiting" && (
          <>
            <h1 className="mt-6 text-2xl font-extrabold">جاري تأكيد الدفع...</h1>
            <p className="mt-3 leading-7 text-gray-500">
              نتحقق من تفعيل باقة {planName}. قد يستغرق ذلك بضع ثوانٍ، فلا
              تغلق الصفحة.
            </p>
            <span className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full bg-[#BABDE2]/25 px-4 py-2 text-sm font-bold">
              <Sparkles size={16} />
              التفعيل يتم بعد تحقق الخادم من عملية الدفع
            </span>
          </>
        )}

        {status === "active" && (
          <>
            <h1 className="mt-6 text-2xl font-extrabold text-[#895159]">
              {isUpgrade ? "تمت ترقية باقتك بنجاح" : "تم تفعيل اشتراكك بنجاح"}
            </h1>
            <p className="mt-3 leading-7 text-gray-500">
              أصبحت باقة {planName} فعالة. جاري تحويلك إلى لوحة التحكم...
            </p>
          </>
        )}

        {status === "timeout" && (
          <>
            <h1 className="mt-6 text-2xl font-extrabold">الدفع قيد التحقق</h1>
            <p className="mt-3 leading-7 text-gray-500">
              لم يصلنا تأكيد تفعيل باقة {planName} بعد. لا تُعد عملية الدفع
              فاشلة بالضرورة؛ تحقق من حسابك بعد قليل أو تواصل مع الدعم.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                href="/dashboard"
                className="rounded-full bg-[#374375] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#895159]"
              >
                لوحة التحكم
              </Link>
              <Link
                href="/pricing"
                className="rounded-full border border-[#374375] px-5 py-3 text-sm font-extrabold transition hover:bg-[#374375] hover:text-white"
              >
                العودة إلى الباقات
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
