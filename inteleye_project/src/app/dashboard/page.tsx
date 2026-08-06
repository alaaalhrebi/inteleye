import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  FileText,
  Lightbulb,
  MessageSquareText,
  Plus,
  Repeat2,
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import LogoutButton from "@/components/dashboard/LogoutButton";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import PrintDashboardButton from "@/components/dashboard/PrintDashboardButton";
import { getSubscriptionPermissions } from "@/lib/subscription-permissions";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: {
    platform?: string;
    branch?: string;
    period?: string;
  };
}) {
  const selectedPlatformId = searchParams?.platform;
  const selectedBranchId = searchParams?.branch;
  const selectedPeriod = searchParams?.period || "this_week";
  
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select(`
      id,
      name,
      email,
      subscription_status,
      plan,
      trial_started_at,
      trial_ends_at,
      current_period_end,
      allowed_platforms_count
    `)
    .eq("user_id", user.id)
    .maybeSingle();
  
  if (clientError) {
    console.error("Failed to load client:", clientError.message);
    redirect("/login");
  }
  
  if (!client) {
    redirect("/signup");
  }
  
  const basePermissions = getSubscriptionPermissions(client);

  if (!basePermissions.canAccessDashboard) {
    redirect("/pricing?reason=subscription_required");
  }

  let platformsQuery = supabase
    .from("client_platforms")
    .select("id, platform_name, platform_url, username, business_activity, is_active")
    .eq("client_id", client.id)
    .eq("is_active", true);

  if (basePermissions.isTrialActive) {
    platformsQuery = platformsQuery.limit(1);
  }

  const { data: platforms, error: platformsError } = await platformsQuery;

  if (platformsError) redirect("/onboarding/platforms");
  if (!platforms || platforms.length === 0) redirect("/onboarding/platforms");

  let branchesQuery = supabase
    .from("branches")
    .select("id, name")
    .eq("client_id", client.id);

  if (basePermissions.isTrialActive) {
    branchesQuery = branchesQuery.limit(1);
  }

  const { data: branches } = await branchesQuery;

  const branchIds = (branches ?? []).map((b) => b.id);


  
 let reportsQuery = supabase
  .from("reports")
  .select("*")
  .eq("client_id", client.id)
  .in("status", ["completed", "no_data"])
  .order("created_at", { ascending: false });
  
  if (selectedBranchId) {
    const branchId = Number(selectedBranchId);
  
    reportsQuery = reportsQuery.or(
      `branch_id.eq.${branchId},branch_id.is.null`
    );
  } else if (branchIds.length > 0) {
    reportsQuery = reportsQuery.or(
      `branch_id.in.(${branchIds.join(
        ","
      )}),branch_id.is.null`
    );
  } else {
    reportsQuery =
      reportsQuery.is("branch_id", null);
  }
  
  if (selectedPlatformId) {
    reportsQuery = reportsQuery.eq("platform_id", Number(selectedPlatformId));
  }
  
  if (selectedPeriod === "this_week") {
    reportsQuery = reportsQuery.eq("report_type", "weekly");
  }
  
  if (selectedPeriod === "this_month") {
    reportsQuery = reportsQuery.eq("report_type", "monthly");
  }
  
  const { data: reports } = await reportsQuery;

  const latestReport = reports?.[0] ?? null;

 const currentPlatformsCount = new Set(
  platforms.map((platform) => platform.platform_name)
).size;

const permissions = getSubscriptionPermissions(client, {
  currentPlatformsCount,
});

const plan = permissions.plan;
const canAddPlatforms = permissions.canAddPlatform;

const stats = asObject(latestReport?.stats);
const aiSummary = asObject(latestReport?.ai_summary);
const sentiment = asObject(sentiment in stats ? stats.sentiment : {});

const averageRatingSource =
  stats.average_rating ?? latestReport?.google_rating;

const averageRating =
  averageRatingSource === null ||
  averageRatingSource === undefined ||
  averageRatingSource === ""
    ? "—"
    : asNumber(averageRatingSource);

const totalReviews = asNumber(
  latestReport?.total_feedback ??
    stats.total_feedback ??
    latestReport?.total_reviews
);

const negativePct = asNumber(
  latestReport?.negative_pct ??
    sentiment.negative_percentage
);

const positivePct = asNumber(
  latestReport?.positive_pct ??
    sentiment.positive_percentage
);

const urgentCount = asNumber(
  stats.urgent_cases_count ??
    latestReport?.urgent_count
);

const suggestedRepliesCount = asNumber(
  stats.needs_reply_count ??
    latestReport?.suggested_replies_count
);

const aiIssues = asObjectArray(aiSummary.top_issues);
const statisticalIssues = asObjectArray(stats.top_issues);

const topIssues = (
  aiIssues.length > 0 ? aiIssues : statisticalIssues
).map((issue) => ({
  label: String(
    issue.title ??
      issue.name ??
      issue.label ??
      "ملاحظة"
  ),
  count: asNumber(issue.count),
}));

const reportRecommendations = asObjectArray(
  aiSummary.recommendations
);

const recommendations =
  reportRecommendations.length > 0
    ? reportRecommendations.map((item) => ({
        title: String(item.title ?? "توصية"),
        text: [
          item.description,
          item.suggested_action,
          item.text,
        ]
          .filter(
            (value): value is string =>
              typeof value === "string" &&
              value.trim().length > 0
          )
          .join(" — "),
      }))
    : [
        {
          title: "لا توجد توصيات بعد",
          text: "ستظهر التوصيات بعد توفر تقرير مكتمل يحتوي على بيانات كافية.",
        },
      ];

  return (
  <div dir="rtl" className="dashboard-print-root min-h-screen bg-[#F8F7F3] text-[#374375]">
    <DashboardHeader clientName={client.name} plan={client.plan} />
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6 lg:flex-row lg:gap-6">
    <DashboardSideMenu
          platforms={platforms}
          branches={branches ?? []}
          canAddPlatforms={canAddPlatforms}
          currentPlatformsCount={currentPlatformsCount}
          platformLimit={permissions.platformLimit}
          canManageBranches={permissions.canManageBranches}
          canAccessCustomReports={permissions.canAccessCustomReports}
        />

        <main className="min-w-0 flex-1 pb-10">
          <HeroSummary clientName={client.name} />

          <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              title="متوسط التقييم"
              value={averageRating}
              icon={<Star size={22} />}
            />
            <KpiCard
              title="تعليقات هذا الأسبوع"
              value={totalReviews}
              icon={<MessageSquareText size={22} />}
            />
            <KpiCard
              title="نسبة السلبي"
              value={`${negativePct}%`}
              icon={<TrendingDown size={22} />}
              tone="bad"
            />
            <KpiCard
              title="رضا العملاء"
              value={`${positivePct}%`}
              icon={<CheckCircle2 size={22} />}
              tone="good"
            />
            <KpiCard
              title="تحتاج تدخل سريع"
              value={urgentCount}
              icon={<AlertTriangle size={22} />}
              tone="warn"
            />
            <KpiCard
              title="ردود مقترحة"
              value={suggestedRepliesCount}
              icon={<Repeat2 size={22} />}
            />
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            <WeeklyComparison />
            <RatingTrend />
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            <TopIssues issues={topIssues} />
            <SmartAlerts />
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            <SuggestedReplies />
            <AiRecommendations recommendations={recommendations} />
          </section>

          <section className="mt-8">
            <PlatformsSection
              platforms={platforms}
              canAddPlatforms={canAddPlatforms}
              plan={plan}
              currentPlatformsCount={currentPlatformsCount}
              platformLimit={permissions.platformLimit}
            />
            </section>
        </main>
      </div>
    </div>
  );
}

function DashboardHeader({
  clientName,
  plan,
}: {
  clientName: string;
  plan: string;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#BABDE2]/30 bg-[#F8F7F3]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#374375] text-white">
            <BarChart3 size={24} />
          </div>

          <div>
            <h1 className="text-xl font-extrabold text-[#374375]">
              IntelEye
            </h1>
            <p className="text-sm text-gray-500">
              {clientName} · باقة {formatPlan(plan)}
            </p>
          </div>
        </div>

        <div className="no-print flex items-center gap-3">
          <PrintDashboardButton />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}

function DashboardSideMenu({
  platforms,
  branches,
  canAddPlatforms,
  currentPlatformsCount,
  platformLimit,
  canManageBranches,
  canAccessCustomReports,
}: {
  platforms: any[];
  branches: any[];
  canAddPlatforms: boolean;
  currentPlatformsCount: number;
  platformLimit: number;
  canManageBranches: boolean;
  canAccessCustomReports: boolean;
}) {
  return (
    <aside className="no-print w-full shrink-0 rounded-[1.5rem] border border-[#BABDE2]/40 bg-white p-4 shadow-sm lg:sticky lg:top-24 lg:w-[260px] xl:w-[300px]">
      <DashboardFilters branches={branches} platforms={platforms} />

      <div className="mt-6 space-y-3">
        {canAddPlatforms ? (
          <Link
            href="/onboarding/platforms"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#374375] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#895159]"
          >
            <Plus size={18} />
            إضافة منصة
          </Link>
        ) : (
          <div className="rounded-2xl bg-[#F8F7F3] p-4 text-sm font-bold leading-7 text-gray-500">
          وصلت إلى الحد المسموح من المنصات في باقتك الحالية.
          <span className="mt-1 block text-xs">
            تستخدم حاليًا {currentPlatformsCount} من أصل {platformLimit}.
          </span>
        </div>
        )}

        {canAccessCustomReports && (
          <Link
            href="/dashboard/reports"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#BABDE2]/60 bg-[#F8F7F3] px-5 py-3 text-sm font-bold text-[#374375] transition hover:bg-[#BABDE2]/30"
          >
            <FileText size={18} />
            التقارير المخصصة
          </Link>
        )}

        {canManageBranches && (
          <Link
            href="/dashboard/branches"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#BABDE2]/60 bg-[#F8F7F3] px-5 py-3 text-sm font-bold text-[#374375] transition hover:bg-[#BABDE2]/30"
          >
            <Building2 size={18} />
            إدارة الفروع
          </Link>
        )}

      </div>
    </aside>
  );
}


function HeroSummary({ clientName }: { clientName: string }) {
  return (
   <section className="rounded-[1.5rem] sm:rounded-[2rem] border border-[#BABDE2]/30 bg-white p-6 sm:p-8 shadow-sm">
      <p className="text-xs sm:text-sm text-gray-400">لوحة التحكم</p>
      <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#374375]">
        مرحبًا، {clientName}
      </h2>
      <p className="mt-3 sm:mt-4 max-w-3xl text-sm sm:text-base lg:text-lg leading-relaxed text-gray-500">
        هنا ملخص أداء منصاتك، الفروع، التقارير، التنبيهات الذكية، التوصيات،
        واقتراحات الردود بناءً على تحليل تقييمات العملاء.
      </p>
    </section>
  );
}

function KpiCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: any;
  icon: React.ReactNode;
  tone?: "good" | "bad" | "warn";
}) {
  const toneClass =
    tone === "bad"
      ? "text-red-600 bg-red-50"
      : tone === "warn"
      ? "text-amber-700 bg-amber-50"
      : tone === "good"
      ? "text-[#895159] bg-[#DFAEA1]/25"
      : "text-[#374375] bg-[#BABDE2]/30";

  return (
    <div className="rounded-[1.2rem] border border-[#BABDE2]/30 bg-white p-4 sm:p-5 shadow-sm transition-all hover:shadow-md">
      <div className={`mb-3 sm:mb-5 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl ${toneClass}`}>
        <div className="scale-90 sm:scale-100">{icon}</div>
      </div>
      <p className="text-xs sm:text-sm text-gray-400 truncate">{title}</p>
      <p className="mt-1 sm:mt-3 text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#374375]">{value}</p>
    </div>
  );
}

function WeeklyComparison() {
  return (
    <Panel
      eyebrow="مقارنة الأداء"
      title="الأسبوع الحالي مقارنة بالأسبوع الماضي"
      icon={<TrendingUp size={22} />}
    >
      <div className="space-y-4">
        <ComparisonRow label="متوسط التقييم" current="—" previous="—" change="بانتظار أول تقرير" />
        <ComparisonRow label="عدد التعليقات" current="0" previous="0" change="لا توجد بيانات بعد" />
        <ComparisonRow label="نسبة السلبي" current="0%" previous="0%" change="سيظهر التحسن لاحقًا" />
      </div>
    </Panel>
  );
}

function RatingTrend() {
  return (
    <Panel eyebrow="الاتجاه العام" title="رسم مبسط للتقييمات" icon={<BarChart3 size={22} />}>
      <div className="flex h-52 items-end gap-3 rounded-3xl bg-[#F8F7F3] p-5">
        {[35, 45, 40, 60, 55, 75, 68].map((height, index) => (
          <div
            key={index}
            className="flex-1 rounded-t-2xl bg-[#BABDE2]"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <p className="mt-4 text-sm text-gray-500">
        سيعكس الرسم بيانات التقارير الأسبوعية بعد تشغيل n8n.
      </p>
    </Panel>
  );
}

function TopIssues({ issues }: { issues: any[] }) {
  return (
    <Panel
      eyebrow="المشاكل المتكررة"
      title="أكثر المشاكل تكرارًا هذا الأسبوع"
      icon={<AlertTriangle size={22} />}
    >
      {issues.length === 0 ? (
        <div className="rounded-2xl bg-[#F8F7F3] p-6 text-center text-sm font-bold text-gray-500">
          لا توجد مشاكل متكررة مسجلة في التقرير الحالي.
        </div>
      ) : (
        <div className="space-y-4">
          {issues.map((issue, index) => {
            const width =
              issue.count > 0
                ? Math.min(100, Math.max(8, issue.count * 6))
                : 0;

            return (
              <div key={`${issue.label}-${index}`}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-bold text-[#374375]">
                    {issue.label}
                  </span>

                  <span className="text-gray-400">
                    {issue.count} مرة
                  </span>
                </div>

                <div className="h-3 rounded-full bg-[#F8F7F3]">
                  <div
                    className="h-3 rounded-full bg-[#895159]"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function SmartAlerts() {
  return (
    <Panel eyebrow="تنبيهات ذكية" title="تنبيهات تحتاج انتباهك" icon={<Lightbulb size={22} />}>
      <div className="space-y-3">
        <AlertItem text="ستظهر التنبيهات بعد أول تحليل للتعليقات." />
        <AlertItem text="سيتم تنبيهك عند ارتفاع مشكلة متكررة مثل بطء الخدمة." />
        <AlertItem text="سيظهر هنا أي فرع يحصل على تقييم منخفض." />
      </div>
    </Panel>
  );
}

function SuggestedReplies() {
  return (
    <Panel eyebrow="اقتراح الردود" title="ردود مقترحة جاهزة" icon={<MessageSquareText size={22} />}>
      <div className="rounded-3xl bg-[#F8F7F3] p-5">
        <p className="text-sm text-gray-400">تعليق</p>
        <p className="mt-2 font-bold text-[#374375]">
          ستظهر هنا التعليقات التي تحتاج رد بعد التحليل.
        </p>

        <div className="mt-5 rounded-2xl border border-[#BABDE2]/40 bg-white p-4">
          <p className="text-sm text-gray-400">رد مقترح</p>
          <p className="mt-2 leading-7 text-gray-600">
            نشكر لك ملاحظتك، ونعتذر عن التجربة التي واجهتها. تم تمرير الملاحظة للفريق المختص لتحسين جودة الخدمة.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <SmallButton>نسخ</SmallButton>
          <SmallButton>اعتماد</SmallButton>
          <SmallButton>تعديل</SmallButton>
        </div>
      </div>
    </Panel>
  );
}

function AiRecommendations({ recommendations }: { recommendations: any[] }) {
  return (
    <Panel eyebrow="توصيات الذكاء الاصطناعي" title="ماذا تفعل لتحسين الخدمة؟" icon={<Lightbulb size={22} />}>
      <div className="space-y-4">
        {recommendations.map((item, index) => (
          <div key={index} className="rounded-2xl bg-[#F8F7F3] p-4">
            <p className="font-extrabold text-[#374375]">
              {index + 1}. {item.title}
            </p>
            <p className="mt-2 leading-7 text-gray-500">{item.text}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function PlatformsSection({
  platforms,
  canAddPlatforms,
  plan,
  currentPlatformsCount,
  platformLimit,
}: {
  platforms: any[];
  canAddPlatforms: boolean;
  plan: string;
  currentPlatformsCount: number;
  platformLimit: number;
}) {
  return (
    <Panel eyebrow="المنصات المرتبطة" title="المنصات المفعّلة" icon={<BarChart3 size={22} />}>
      <div className="space-y-4">
        {platforms.map((platform) => (
          <div key={platform.id} className="rounded-3xl border border-[#BABDE2]/30 bg-[#F8F7F3] p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-[#374375]">
                {formatPlatform(platform.platform_name)}
              </h3>
              <span className="rounded-full bg-[#BABDE2]/40 px-3 py-1 text-xs font-bold">
                مفعّلة
              </span>
            </div>

            <p className="mt-3 break-all text-sm text-gray-500">
              {platform.platform_url || platform.username || "—"}
            </p>

            {platform.business_activity && (
              <p className="mt-2 text-sm text-gray-500">
                النشاط: {platform.business_activity}
              </p>
            )}
          </div>
        ))}

        {!canAddPlatforms && (
          <div className="rounded-3xl bg-[#DFAEA1]/20 p-5 text-sm font-bold text-[#895159]">
          <>
            وصلت إلى الحد المسموح في باقة {formatPlan(plan)}.
            <span className="mt-1 block text-xs">
              تستخدم حاليًا {currentPlatformsCount} من أصل {platformLimit} منصة.
            </span>
          </>
          </div>
        )}
      </div>
    </Panel>
  );
}



function Panel({
  eyebrow,
  title,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
   <section className="rounded-[1.2rem] sm:rounded-[1.5rem] border border-[#BABDE2]/40 bg-white p-4 sm:p-6 shadow-sm">
      <div className="mb-4 sm:mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-[#BABDE2]/30 text-[#374375]">
          <div className="scale-90 sm:scale-100">{icon}</div>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-gray-400">{eyebrow}</p>
          <h2 className="text-base sm:text-lg lg:text-xl font-extrabold text-[#374375]">{title}</h2>
        </div>
      </div>

      <div className="text-sm sm:text-base">
        {children}
      </div>
    </section>
  );
}

function ComparisonRow({
  label,
  current,
  previous,
  change,
}: {
  label: string;
  current: any;
  previous: any;
  change: string;
}) {
  return (
    <div className="rounded-2xl bg-[#F8F7F3] p-4">
      <div className="flex items-center justify-between">
        <span className="font-bold text-[#374375]">{label}</span>
        <span className="text-sm text-gray-400">{change}</span>
      </div>
      <div className="mt-3 flex items-center gap-5 text-sm text-gray-500">
        <span>الحالي: {current}</span>
        <span>السابق: {previous}</span>
      </div>
    </div>
  );
}

function AlertItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-[#F8F7F3] p-4">
      <AlertTriangle size={18} className="mt-1 text-[#895159]" />
      <p className="leading-7 text-gray-600">{text}</p>
    </div>
  );
}

function SmallButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="rounded-full border border-[#BABDE2]/60 bg-white px-4 py-2 text-sm font-bold text-[#374375] transition hover:bg-[#374375] hover:text-white">
      {children}
    </button>
  );
}

function formatPlan(plan: string) {
  if (!plan) return "Basic";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function formatPlatform(platform: string) {
  if (platform === "google_maps") return "Google Maps";
  if (platform === "x") return "X";
  if (platform === "tiktok") return "TikTok";
  if (platform === "instagram") return "Instagram";
  return platform;
}

function asObject(value: unknown): Record<string, any> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, any>;
  }

  return {};
}

function asObjectArray(value: unknown): Record<string, any>[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is Record<string, any> =>
      Boolean(item) &&
      typeof item === "object" &&
      !Array.isArray(item)
  );
}

function asNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
