"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Check,
  Crown,
  LogIn,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import LogoutButton from "@/components/dashboard/LogoutButton";
import { getSubscriptionPermissions } from "@/lib/subscription-permissions";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  formatPrice,
  getCheckoutQuote,
  normalizePlan,
  PLAN_DETAILS,
  PLAN_IDS,
  type PlanId,
} from "@/lib/plans";

type ClientSubscription = {
  plan: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  allowed_platforms_count: number | null;
};

export default function PricingPage() {
  const router = useRouter();
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [client, setClient] = useState<ClientSubscription | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAccount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;
      if (!user) {
        setIsLoggedIn(false);
        return;
      }

      const { data } = await supabase
        .from("clients")
        .select(
          "plan, subscription_status, trial_ends_at, current_period_end, allowed_platforms_count"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (isMounted) {
        setClient(data);
        setIsLoggedIn(true);
      }
    }

    loadAccount();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const permissions = client ? getSubscriptionPermissions(client) : null;
  const hasActiveSubscription = permissions?.hasActiveSubscription ?? false;
  const currentPlan = normalizePlan(permissions?.plan);

  function selectPlan(planId: PlanId) {
    if (isLoggedIn === null) return;

    if (!isLoggedIn) {
      router.push(`/signup?plan=${planId}`);
      return;
    }

    const quote = getCheckoutQuote({
      currentPlan,
      targetPlan: planId,
      hasActiveSubscription,
    });

    if (quote.mode === "current" || quote.mode === "downgrade") return;
    router.push(`/checkout?plan=${planId}`);
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#F8F7F3] text-[#374375]">
      <header className="border-b border-[#BABDE2]/30 bg-[#F8F7F3]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#374375] text-white">
              <BarChart3 size={22} />
            </span>
            <span>
              <span className="block text-lg font-extrabold">IntelEye</span>
              <span className="block text-xs text-gray-400">خطط واضحة لنمو سمعتك</span>
            </span>
          </Link>

          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="hidden rounded-full border border-[#BABDE2]/60 bg-white px-5 py-3 text-sm font-bold transition hover:bg-[#BABDE2]/20 sm:inline-flex"
              >
                لوحة التحكم
              </Link>
              <LogoutButton />
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border border-[#374375] bg-white px-5 py-3 text-sm font-bold transition hover:bg-[#374375] hover:text-white"
            >
              <LogIn size={18} />
              تسجيل الدخول
            </Link>
          )}
        </div>
      </header>

      <main className="px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
        <section className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#BABDE2]/30 px-4 py-2 text-sm font-bold">
            <Sparkles size={17} />
            اختر ما يناسب حجم منشأتك
          </span>
          <h1 className="mt-6 text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
            باقات مرنة بنفس تجربة IntelEye الذكية
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-gray-500 sm:text-lg">
            ابدأ بباقة مناسبة، وترقَّ لاحقًا بدفع فرق السعر الشهري فقط. جميع الأسعار بالريال السعودي وتُدفع شهريًا.
          </p>
        </section>

        {hasActiveSubscription && (
          <section className="mx-auto mt-8 flex max-w-5xl flex-col gap-4 rounded-[1.5rem] border border-[#DFAEA1]/45 bg-[#DFAEA1]/15 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#895159]">
                <Crown size={21} />
              </span>
              <div>
                <p className="text-xs font-bold text-gray-400">باقتك الحالية</p>
                <p className="mt-1 font-extrabold">{PLAN_DETAILS[currentPlan].name}</p>
              </div>
            </div>
            <p className="text-sm font-bold text-[#895159]">
              عند اختيار باقة أعلى سيظهر لك فرق السعر قبل الدفع.
            </p>
          </section>
        )}

        <section className="mx-auto mt-10 grid max-w-7xl gap-6 lg:grid-cols-3">
          {PLAN_IDS.map((planId) => {
            const plan = PLAN_DETAILS[planId];
            const quote = getCheckoutQuote({
              currentPlan,
              targetPlan: planId,
              hasActiveSubscription,
            });
            const disabled =
              isLoggedIn === null ||
              quote.mode === "current" ||
              quote.mode === "downgrade";
            const buttonLabel = getButtonLabel({
              isLoggedIn,
              planId,
              quote,
            });

            return (
              <article
                key={plan.id}
                className={`relative flex flex-col overflow-hidden rounded-[2rem] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:p-7 ${
                  plan.featured
                    ? "border-2 border-[#374375]"
                    : "border border-[#BABDE2]/35"
                }`}
              >
                {plan.featured && (
                  <span className="absolute left-5 top-5 rounded-full bg-[#374375] px-3 py-1 text-xs font-bold text-white">
                    الأكثر اختيارًا
                  </span>
                )}

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#BABDE2]/30 text-[#374375]">
                  {planId === "enterprise" ? <Crown size={22} /> : <ShieldCheck size={22} />}
                </div>
                <h2 className="mt-5 text-2xl font-extrabold">{plan.name}</h2>
                <p className="mt-2 min-h-[56px] text-sm font-bold leading-7 text-gray-600">
                  {plan.description}
                </p>

                <div className="mt-6 flex items-end gap-2">
                  <span className="text-4xl font-extrabold">{formatPrice(plan.priceHalalas)}</span>
                  <span className="pb-1 text-sm text-gray-400">ريال / شهر</span>
                </div>

                {quote.mode === "upgrade" && (
                  <div className="mt-4 rounded-2xl bg-[#DFAEA1]/18 px-4 py-3 text-sm font-bold text-[#895159]">
                    فرق الترقية: {formatPrice(quote.amountHalalas)} ريال
                  </div>
                )}

                <ul className="mt-6 flex-1 space-y-3 text-sm text-gray-600">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#BABDE2]/30 text-[#374375]">
                        <Check size={13} />
                      </span>
                      <span className="leading-6">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => selectPlan(planId)}
                  className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-55 ${
                    plan.featured
                      ? "bg-[#374375] text-white hover:bg-[#895159]"
                      : "border border-[#374375] text-[#374375] hover:bg-[#374375] hover:text-white"
                  }`}
                >
                  {buttonLabel}
                  {!disabled && <ArrowLeft size={17} />}
                </button>
              </article>
            );
          })}
        </section>

        <section className="mx-auto mt-12 grid max-w-5xl gap-4 rounded-[2rem] border border-[#BABDE2]/35 bg-white p-6 shadow-sm sm:grid-cols-3 sm:p-8">
          <FlowStep number="1" title="اختر الباقة" text="اختر الخطة المناسبة لحجم منشأتك." />
          <FlowStep number="2" title="سجّل أو ادخل" text="الزائر الجديد ينشئ حسابًا، والعميل الحالي يكمل مباشرة." />
          <FlowStep number="3" title="ادفع بأمان" text="يظهر السعر الكامل أو فرق الترقية قبل نموذج الدفع." />
        </section>

        {!isLoggedIn && (
          <p className="mt-8 text-center text-sm text-gray-500">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="font-extrabold text-[#895159] hover:underline">
              سجّل دخولك أولًا لترى فرق الترقية
            </Link>
          </p>
        )}
      </main>
    </div>
  );
}

function FlowStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#374375] text-sm font-extrabold text-white">
        {number}
      </span>
      <div>
        <h3 className="font-extrabold">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-gray-500">{text}</p>
      </div>
    </div>
  );
}

function getButtonLabel({
  isLoggedIn,
  planId,
  quote,
}: {
  isLoggedIn: boolean | null;
  planId: PlanId;
  quote: ReturnType<typeof getCheckoutQuote>;
}) {
  const name = PLAN_DETAILS[planId].name;
  if (isLoggedIn === null) return "جاري التحقق...";
  if (!isLoggedIn) return `أنشئ حسابًا واختر ${name}`;
  if (quote.mode === "current") return "باقتك الحالية";
  if (quote.mode === "downgrade") return "التخفيض غير متاح هنا";
  if (quote.mode === "upgrade") return `ترقية إلى ${name}`;
  return `الاشتراك في ${name}`;
}
