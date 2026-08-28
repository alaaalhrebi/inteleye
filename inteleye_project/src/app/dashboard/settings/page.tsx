import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleUserRound,
  CreditCard,
  Mail,
  RadioTower,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import DashboardSectionHeader from "@/components/dashboard/DashboardSectionHeader";
import { getSubscriptionPermissions } from "@/lib/subscription-permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: client } = await supabase
    .from("clients")
    .select(
      "id, name, email, plan, subscription_status, trial_started_at, trial_ends_at, current_period_end, created_at, allowed_platforms_count"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!client) redirect("/signup");

  const basePermissions = getSubscriptionPermissions(client);
  if (!basePermissions.canAccessDashboard) {
    redirect("/pricing?reason=subscription_required");
  }

  const [branchesResult, platformsResult] = await Promise.all([
    supabase
      .from("branches")
      .select("id", { count: "exact" })
      .eq("client_id", client.id)
      .eq("is_active", true),
    supabase
      .from("client_platforms")
      .select("platform_name")
      .eq("client_id", client.id)
      .eq("is_active", true),
  ]);

  const branchCount = branchesResult.count ?? branchesResult.data?.length ?? 0;
  const platformCount = new Set(
    (platformsResult.data ?? []).map((platform) => platform.platform_name)
  ).size;
  const permissions = getSubscriptionPermissions(client, {
    currentBranchesCount: branchCount,
    currentPlatformsCount: platformCount,
  });
  const periodEnd = permissions.isTrialActive
    ? client.trial_ends_at
    : client.current_period_end;

  return (
    <div dir="rtl" className="min-h-screen bg-[#F8F7F3] text-[#374375]">
      <DashboardSectionHeader
        activePath="/dashboard/settings"
        clientName={client.name || "حساب IntelEye"}
        plan={permissions.plan}
        eyebrow="الحساب والاشتراك"
        title="الإعدادات"
        description="راجع معلومات المنشأة وحالة اشتراكك وحدود الباقة. إدارة الفروع وربط المنصات متاحة من صفحاتها المخصصة."
        icon={<Settings size={29} />}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <section className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
          <div className="space-y-6">
            <SettingsPanel
              eyebrow="الحساب والمنشأة"
              title="المعلومات الأساسية"
              icon={<CircleUserRound size={22} />}
            >
              <InfoRow icon={<Building2 size={18} />} label="اسم المنشأة" value={client.name || "غير محدد"} />
              <InfoRow icon={<Mail size={18} />} label="البريد الإلكتروني" value={client.email || user.email || "غير محدد"} ltr />
              <InfoRow icon={<CalendarDays size={18} />} label="تاريخ إنشاء الحساب" value={formatDate(client.created_at)} />
              <div className="mt-4 rounded-2xl bg-[#F8F7F3] px-4 py-3 text-xs leading-6 text-gray-500">
                بيانات الاشتراك تُحدّث آليًا بعد تأكيد الدفع. لا يمكن تغيير الباقة من هذه الحقول مباشرة.
              </div>
            </SettingsPanel>

            <SettingsPanel
              eyebrow="حالة الوصول"
              title="المزايا المتاحة"
              icon={<ShieldCheck size={22} />}
            >
              <FeatureRow label="لوحة التحكم والتحليلات الأساسية" enabled={permissions.canAccessDashboard} />
              <FeatureRow label="إدارة الفروع" enabled={permissions.canManageBranches} />
              <FeatureRow label="عرض سجل التقارير" enabled={permissions.canViewReports} />
              <FeatureRow label="إنشاء تقارير مخصصة" enabled={permissions.canCreateCustomReport} />
            </SettingsPanel>
          </div>

          <div className="space-y-6">
            <section className="overflow-hidden rounded-[2rem] border border-[#BABDE2]/35 bg-white shadow-sm">
              <div className="bg-[#374375] p-6 text-white sm:p-7">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#BABDE2]">الاشتراك الحالي</p>
                    <h2 className="mt-2 text-3xl font-extrabold">باقة {formatPlan(permissions.plan)}</h2>
                    <p className="mt-2 text-sm text-white/65">{formatSubscriptionStatus(permissions.status, permissions.isTrialActive)}</p>
                  </div>
                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold">
                    <CreditCard size={18} />
                    {permissions.hasActiveSubscription ? "اشتراك مدفوع" : "تجربة مجانية"}
                  </span>
                </div>

                <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm">
                  <CalendarDays size={19} className="text-[#DFAEA1]" />
                  <span>{periodEnd ? `تنتهي الفترة الحالية في ${formatDate(periodEnd)}` : "لا يوجد تاريخ انتهاء محدد للفترة الحالية"}</span>
                </div>
              </div>

              <div className="p-6 sm:p-7">
                <div className="grid gap-4 sm:grid-cols-2">
                  <UsageCard
                    label="الفروع المستخدمة"
                    current={branchCount}
                    limit={permissions.branchLimit}
                    icon={<Building2 size={21} />}
                  />
                  <UsageCard
                    label="المنصات المستخدمة"
                    current={platformCount}
                    limit={permissions.platformLimit}
                    icon={<RadioTower size={21} />}
                  />
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/pricing"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#374375] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#895159]"
                  >
                    <Sparkles size={18} />
                    عرض الباقات والترقية
                  </Link>
                  <Link
                    href="/dashboard/platforms"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#374375] px-6 py-3 text-sm font-bold text-[#374375] transition hover:bg-[#F8F7F3]"
                  >
                    <RadioTower size={18} />
                    حالة المنصات
                  </Link>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-[#DFAEA1]/40 bg-[#DFAEA1]/14 p-6 sm:p-7">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#895159]">
                  <ShieldCheck size={23} />
                </span>
                <div>
                  <h2 className="text-lg font-extrabold text-[#374375]">حسابك محمي بجلسة Supabase</h2>
                  <p className="mt-2 text-sm leading-7 text-gray-600">
                    تسجيل الدخول والجلسة تتم إدارتها بصورة آمنة. لتغيير كلمة المرور استخدم رابط استعادة كلمة المرور من صفحة الدخول.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}

function SettingsPanel({
  eyebrow,
  title,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-[#BABDE2]/35 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#BABDE2]/30 text-[#374375]">
          {icon}
        </span>
        <div>
          <p className="text-xs font-bold text-gray-400">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-extrabold text-[#374375]">{title}</h2>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function InfoRow({
  icon,
  label,
  value,
  ltr = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#BABDE2]/25 px-4 py-3">
      <span className="text-[#895159]">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-400">{label}</p>
        <p dir={ltr ? "ltr" : undefined} className={`mt-1 truncate text-sm font-bold text-[#374375] ${ltr ? "text-right" : ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function FeatureRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#F8F7F3] px-4 py-3">
      <span className="text-sm font-bold text-gray-600">{label}</span>
      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${enabled ? "bg-[#DFAEA1]/25 text-[#895159]" : "bg-gray-100 text-gray-400"}`}>
        <CheckCircle2 size={14} />
        {enabled ? "متاحة" : "غير متاحة"}
      </span>
    </div>
  );
}

function UsageCard({
  label,
  current,
  limit,
  icon,
}: {
  label: string;
  current: number;
  limit: number;
  icon: ReactNode;
}) {
  const percentage = limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0;

  return (
    <article className="rounded-2xl bg-[#F8F7F3] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[#895159]">{icon}</span>
        <span className="text-xs font-bold text-gray-400">{current} من {limit}</span>
      </div>
      <p className="mt-4 text-sm font-bold text-[#374375]">{label}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#BABDE2]/30">
        <div className="h-full rounded-full bg-[#374375]" style={{ width: `${percentage}%` }} />
      </div>
    </article>
  );
}

function formatPlan(plan: string) {
  if (plan === "enterprise") return "Enterprise";
  if (plan === "pro") return "Pro";
  return "Basic";
}

function formatSubscriptionStatus(status: string, isTrialActive: boolean) {
  if (isTrialActive) return "التجربة المجانية سارية";
  if (status === "active") return "الاشتراك نشط";
  return "الاشتراك غير نشط";
}

function formatDate(value: string | null) {
  if (!value) return "غير محدد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير محدد";

  return new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Riyadh",
  }).format(date);
}
