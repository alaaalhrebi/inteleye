import Link from "next/link";

type AuthErrorPageProps = {
  searchParams?: {
    reason?: string | string[];
  };
};

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "رابط تأكيد البريد غير مكتمل.",
  invalid_code: "رابط التأكيد منتهي الصلاحية أو تم استخدامه مسبقًا.",
  no_session: "تم تأكيد البريد، لكن تعذر إنشاء جلسة تسجيل الدخول.",
};

export default function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const reason = Array.isArray(searchParams?.reason)
    ? searchParams.reason[0]
    : searchParams?.reason;
  const message =
    (reason && ERROR_MESSAGES[reason]) ||
    "تعذر إكمال تأكيد الحساب. حاول تسجيل الدخول مرة أخرى.";

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-[#f5f4f0] px-4"
    >
      <div className="w-full max-w-sm rounded-2xl border border-[#eeede8] bg-white p-8 text-center">
        <h1 className="mb-3 text-xl font-bold text-[#1a1a2e]">
          تعذر تأكيد الحساب
        </h1>
        <p className="mb-6 text-sm text-gray-600">{message}</p>
        <Link
          href="/login"
          className="inline-flex rounded-lg bg-[#1a1a2e] px-5 py-2.5 text-sm font-bold text-white"
        >
          الانتقال إلى تسجيل الدخول
        </Link>
      </div>
    </main>
  );
}
