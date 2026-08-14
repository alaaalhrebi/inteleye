"use client";

import Link from "next/link";
import Script from "next/script";
import { useSearchParams } from "next/navigation";
import { CreditCard, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import {
  formatPrice,
  getCheckoutQuote,
  normalizePlan,
  PLAN_DETAILS,
} from "@/lib/plans";
import { getSubscriptionPermissions } from "@/lib/subscription-permissions";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type ClientSubscription = {
  plan: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  allowed_platforms_count: number | null;
};

type MoyasarOptions = {
  element: string;
  amount: number;
  currency: string;
  description: string;
  publishable_api_key: string;
  callback_url: string;
  methods: string[];
  metadata: Record<string, string>;
};

declare global {
  interface Window {
    Moyasar?: {
      init: (options: MoyasarOptions) => void;
    };
  }
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutLoading />}>
      <CheckoutForm />
    </Suspense>
  );
}

function CheckoutForm() {
  const searchParams = useSearchParams();
  const targetPlan = normalizePlan(searchParams.get("plan"));
  const targetDetails = PLAN_DETAILS[targetPlan];
  const [supabase] = useState(() => createSupabaseBrowserClient());

  const [userId, setUserId] = useState<string | null>(null);
  const [client, setClient] = useState<ClientSubscription | null>(null);
  const [checkingAccount, setCheckingAccount] = useState(true);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [formReady, setFormReady] = useState(false);
  const [moyasarError, setMoyasarError] = useState<string | null>(null);
  const moyasarInitialized = useRef(false);

  const permissions = client ? getSubscriptionPermissions(client) : null;
  const currentPlan = normalizePlan(permissions?.plan);
  const hasActiveSubscription =
    permissions?.hasActiveSubscription ?? false;
  const quote = useMemo(
    () =>
      getCheckoutQuote({
        currentPlan,
        targetPlan,
        hasActiveSubscription,
      }),
    [currentPlan, hasActiveSubscription, targetPlan]
  );
  const publishableKey = process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY;

  useEffect(() => {
    let isMounted = true;

    async function loadAccount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (!user) {
        setCheckingAccount(false);
        return;
      }

      setUserId(user.id);
      const { data, error } = await supabase
        .from("clients")
        .select(
          "plan, subscription_status, trial_ends_at, current_period_end, allowed_platforms_count"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (error || !data) {
        setAccountError(
          "تعذر العثور على بيانات اشتراكك. أعد المحاولة أو تواصل مع الدعم."
        );
      } else {
        setClient(data);
      }

      setCheckingAccount(false);
    }

    loadAccount();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (
      !scriptLoaded ||
      checkingAccount ||
      !userId ||
      !client ||
      accountError ||
      quote.amountHalalas <= 0 ||
      moyasarInitialized.current
    ) {
      return;
    }

    if (!publishableKey) {
      setMoyasarError("تعذر تجهيز بوابة الدفع حاليًا. تواصل مع الدعم.");
      return;
    }

    if (!window.Moyasar) {
      setMoyasarError("تعذر تحميل بوابة الدفع. أعد تحميل الصفحة وحاول مجددًا.");
      return;
    }

    try {
      const callbackParams = new URLSearchParams({
        plan: targetPlan,
        mode: quote.mode,
      });

      window.Moyasar.init({
        element: ".mysr-form",
        amount: quote.amountHalalas,
        currency: "SAR",
        description:
          quote.mode === "upgrade"
            ? `ترقية IntelEye إلى باقة ${targetDetails.name}`
            : `اشتراك IntelEye — باقة ${targetDetails.name}`,
        publishable_api_key: publishableKey,
        callback_url: `${window.location.origin}/checkout/success?${callbackParams.toString()}`,
        methods: ["creditcard"],
        metadata: {
          client_user_id: userId,
          plan: targetPlan,
          target_plan: targetPlan,
          current_plan: currentPlan,
          payment_type: quote.mode,
        },
      });

      moyasarInitialized.current = true;
      setFormReady(true);
    } catch {
      setMoyasarError("حدث خطأ أثناء تجهيز نموذج الدفع. حاول مرة أخرى.");
    }
  }, [
    accountError,
    checkingAccount,
    client,
    currentPlan,
    publishableKey,
    quote.amountHalalas,
    quote.mode,
    scriptLoaded,
    targetDetails.name,
    targetPlan,
    userId,
  ]);

  const checkoutPath = `/checkout?plan=${targetPlan}`;

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#F8F7F3] px-4 py-10 text-[#374375] sm:px-6"
    >
      <link
        rel="stylesheet"
        href="https://cdn.moyasar.com/mpf/1.16.0/moyasar.css"
      />
      <Script
        src="https://cdn.moyasar.com/mpf/1.16.0/moyasar.js"
        onLoad={() => setScriptLoaded(true)}
        onError={() =>
          setMoyasarError("تعذر تحميل بوابة الدفع. حاول مرة أخرى لاحقًا.")
        }
        strategy="afterInteractive"
      />

      <div className="absolute right-[-130px] top-[-150px] h-[360px] w-[360px] rounded-full bg-[#BABDE2]/45 blur-[120px]" />
      <div className="absolute bottom-[-140px] left-[-130px] h-[360px] w-[360px] rounded-full bg-[#DFAEA1]/35 blur-[120px]" />

      <div className="relative mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <Link href="/pricing" className="inline-flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#374375] text-white">
              <Sparkles size={22} />
            </span>
            <span className="text-2xl font-extrabold">IntelEye</span>
          </Link>
          <h1 className="mt-6 text-3xl font-extrabold sm:text-4xl">
            {quote.mode === "upgrade" ? "إكمال ترقية الباقة" : "إكمال الاشتراك"}
          </h1>
          <p className="mt-3 text-gray-500">
            راجع ملخص طلبك ثم أكمل الدفع الآمن
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <aside className="rounded-[2rem] border border-[#BABDE2]/35 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-400">الباقة المختارة</p>
                <h2 className="mt-1 text-2xl font-extrabold">
                  {targetDetails.name}
                </h2>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#BABDE2]/30">
                <ShieldCheck size={23} />
              </span>
            </div>

            <div className="mt-6 rounded-2xl bg-[#F8F7F3] p-5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-gray-500">سعر الباقة الشهري</span>
                <span className="font-extrabold">
                  {formatPrice(targetDetails.priceHalalas)} ريال
                </span>
              </div>

              {quote.mode === "upgrade" && (
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#BABDE2]/30 pt-4 text-sm">
                  <span className="text-gray-500">
                    خصم باقة {PLAN_DETAILS[currentPlan].name} الحالية
                  </span>
                  <span className="font-extrabold text-[#895159]">
                    - {formatPrice(PLAN_DETAILS[currentPlan].priceHalalas)} ريال
                  </span>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-end justify-between gap-4 rounded-2xl bg-[#374375] p-5 text-white">
              <div>
                <p className="text-xs text-white/65">
                  {quote.mode === "upgrade"
                    ? "فرق الترقية المستحق"
                    : "المبلغ المستحق"}
                </p>
                <p className="mt-1 text-3xl font-extrabold">
                  {formatPrice(quote.amountHalalas)}
                </p>
              </div>
              <span className="pb-1 text-sm text-white/70">ريال سعودي</span>
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[#DFAEA1]/18 p-4 text-sm leading-6 text-[#895159]">
              <LockKeyhole className="mt-0.5 shrink-0" size={18} />
              <p>
                بيانات الدفع تُعالج بأمان عبر بوابة Moyasar ولا تُحفظ في
                IntelEye.
              </p>
            </div>
          </aside>

          <section className="rounded-[2rem] border border-[#BABDE2]/35 bg-white p-6 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#DFAEA1]/25 text-[#895159]">
                <CreditCard size={21} />
              </span>
              <div>
                <h2 className="font-extrabold">بيانات الدفع</h2>
                <p className="mt-1 text-xs text-gray-400">الدفع بالبطاقة الائتمانية</p>
              </div>
            </div>

            {checkingAccount ? (
              <StatusMessage text="جاري التحقق من حسابك واشتراكك..." />
            ) : !userId ? (
              <div className="rounded-2xl bg-[#F8F7F3] p-6 text-center">
                <p className="font-bold">سجّل حسابك أولًا لإتمام الدفع</p>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  سنحتفظ بالباقة المختارة وننقلك للدفع بعد إنشاء الحساب أو
                  تسجيل الدخول.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Link
                    href={`/signup?plan=${targetPlan}`}
                    className="rounded-full bg-[#374375] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#895159]"
                  >
                    إنشاء حساب
                  </Link>
                  <Link
                    href={`/login?next=${encodeURIComponent(checkoutPath)}`}
                    className="rounded-full border border-[#374375] px-5 py-3 text-sm font-extrabold transition hover:bg-[#374375] hover:text-white"
                  >
                    تسجيل الدخول
                  </Link>
                </div>
              </div>
            ) : accountError ? (
              <ErrorMessage text={accountError} />
            ) : quote.mode === "current" ? (
              <BlockedCheckout
                title="هذه باقتك الحالية بالفعل"
                text="لا تحتاج إلى دفع جديد. يمكنك العودة إلى لوحة التحكم ومتابعة استخدام حسابك."
                href="/dashboard"
                action="العودة إلى لوحة التحكم"
              />
            ) : quote.mode === "downgrade" ? (
              <BlockedCheckout
                title="اختيار باقة أقل غير متاح من هنا"
                text="هذه الصفحة مخصصة للاشتراك والترقية. اختر باقة أعلى أو تواصل مع الدعم لتغيير باقتك."
                href="/pricing"
                action="العودة إلى الباقات"
              />
            ) : (
              <>
                {moyasarError && <ErrorMessage text={moyasarError} />}
                {!scriptLoaded && !moyasarError && (
                  <StatusMessage text="جاري تحميل نموذج الدفع الآمن..." />
                )}
                {scriptLoaded && !formReady && !moyasarError && (
                  <StatusMessage text="جاري تجهيز نموذج الدفع..." />
                )}
                <div className="mysr-form" />
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function CheckoutLoading() {
  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-[#F8F7F3] px-4"
    >
      <StatusMessage text="جاري تجهيز صفحة الدفع..." />
    </main>
  );
}

function StatusMessage({ text }: { text: string }) {
  return (
    <p className="rounded-2xl bg-[#F8F7F3] px-4 py-8 text-center text-sm text-gray-500">
      {text}
    </p>
  );
}

function ErrorMessage({ text }: { text: string }) {
  return (
    <p className="mb-4 rounded-2xl bg-red-50 px-4 py-4 text-center text-sm font-bold text-red-700">
      {text}
    </p>
  );
}

function BlockedCheckout({
  title,
  text,
  href,
  action,
}: {
  title: string;
  text: string;
  href: string;
  action: string;
}) {
  return (
    <div className="rounded-2xl bg-[#F8F7F3] p-6 text-center">
      <h3 className="text-lg font-extrabold">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-gray-500">{text}</p>
      <Link
        href={href}
        className="mt-5 inline-flex rounded-full bg-[#374375] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#895159]"
      >
        {action}
      </Link>
    </div>
  );
}
