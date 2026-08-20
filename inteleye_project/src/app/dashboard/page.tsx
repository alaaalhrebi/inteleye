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
  RadioTower,
  Repeat2,
  Settings,
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import LogoutButton from "@/components/dashboard/LogoutButton";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import PrintDashboardButton from "@/components/dashboard/PrintDashboardButton";
import { getSubscriptionPermissions } from "@/lib/subscription-permissions";
import {
  buildRatingTrend,
  calculateDashboardMetrics,
  getDashboardPeriodRange,
  normalizeDashboardPeriod,
  summarizeTopIssues,
  type DashboardFeedbackRow,
  type DashboardMetrics,
  type RatingTrendPoint,
} from "@/lib/dashboard-analytics";

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
  const selectedPeriod = normalizeDashboardPeriod(searchParams?.period);
  
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
    .select("id, branch_id, platform_name, platform_url, username, business_activity, is_active")
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

  const requestedBranchId = Number(selectedBranchId);
  const selectedBranch = branchIds.includes(requestedBranchId)
    ? requestedBranchId
    : null;
  const requestedPlatformId = Number(selectedPlatformId);
  const selectedPlatform = platforms.some(
    (platform) => platform.id === requestedPlatformId
  )
    ? requestedPlatformId
    : null;
  const periodRange = getDashboardPeriodRange(selectedPeriod);
  const dataScope = {
    clientId: client.id,
    branchId: selectedBranch,
    platformId: selectedPlatform,
  };

  const [
    currentFeedbackResult,
    comparisonFeedbackResult,
    reportsResult,
    alertsResult,
  ] = await Promise.all([
    loadDashboardFeedback(supabase, {
      ...dataScope,
      start: periodRange.start,
      end: periodRange.end,
    }),
    loadDashboardFeedback(supabase, {
      ...dataScope,
      start: periodRange.comparisonStart,
      end: periodRange.comparisonEnd,
    }),
    loadDashboardReports(supabase, dataScope),
    loadDashboardAlerts(supabase, dataScope),
  ]);

  const dashboardErrors = [
    currentFeedbackResult.error,
    comparisonFeedbackResult.error,
    reportsResult.error,
    alertsResult.error,
  ].filter(Boolean);

  if (dashboardErrors.length > 0) {
    console.error(
      "Failed to load some dashboard data:",
      dashboardErrors.map((error) => error?.message).join(" | ")
    );
  }

  const currentFeedback = currentFeedbackResult.data;
  const comparisonFeedback = comparisonFeedbackResult.data;
  const reports = reportsResult.data;
  const alerts = alertsResult.data;
  const currentMetrics = calculateDashboardMetrics(currentFeedback);
  const comparisonMetrics = calculateDashboardMetrics(comparisonFeedback);
  const ratingTrend = buildRatingTrend(currentFeedback);

 const currentPlatformsCount = new Set(
  platforms.map((platform) => platform.platform_name)
).size;

const permissions = getSubscriptionPermissions(client, {
  currentPlatformsCount,
});

const plan = permissions.plan;
const canAddPlatforms = permissions.canAddPlatform;
const reportIssues = extractReportIssues(reports);
const liveIssues = summarizeTopIssues(currentFeedback);
const topIssues = liveIssues.length > 0 ? liveIssues : reportIssues;
const recommendations = extractRecommendations(reports);
const branchNames = new Map(
  (branches ?? []).map((branch) => [branch.id, branch.name])
);
const suggestedReplies = currentFeedback
  .filter(
    (row) => row.needs_reply === true && Boolean(row.suggested_reply?.trim())
  )
  .slice(0, 3)
  .map((row) => ({
    id: `${row.source_table ?? "feedback"}-${row.source_record_id}`,
    branchName:
      (row.branch_id !== null ? branchNames.get(row.branch_id) : null) ??
      "على مستوى المنشأة",
    platformName: formatPlatform(row.platform_name ?? ""),
    feedbackText: row.feedback_text?.trim() || "لا يتوفر نص للتعليق.",
    suggestedReply: row.suggested_reply?.trim() || "",
  }));

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

          <PeriodSummary
            start={periodRange.start}
            end={periodRange.end}
            hasError={dashboardErrors.length > 0}
          />

          <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              title="متوسط التقييم"
              value={currentMetrics.averageRating ?? "—"}
              icon={<Star size={22} />}
            />
            <KpiCard
              title="تعليقات الفترة"
              value={currentMetrics.totalFeedback}
              icon={<MessageSquareText size={22} />}
            />
            <KpiCard
              title="نسبة السلبي"
              value={`${currentMetrics.negativePct}%`}
              icon={<TrendingDown size={22} />}
              tone="bad"
            />
            <KpiCard
              title="رضا العملاء"
              value={`${currentMetrics.positivePct}%`}
              icon={<CheckCircle2 size={22} />}
              tone="good"
            />
            <KpiCard
              title="تحتاج تدخل سريع"
              value={currentMetrics.urgentCount}
              icon={<AlertTriangle size={22} />}
              tone="warn"
            />
            <KpiCard
              title="ردود مقترحة"
              value={currentMetrics.needsReplyCount}
              icon={<Repeat2 size={22} />}
            />
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            <WeeklyComparison
              current={currentMetrics}
              previous={comparisonMetrics}
            />
            <RatingTrend points={ratingTrend} />
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            <TopIssues issues={topIssues} />
            <SmartAlerts alerts={alerts} />
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            <SuggestedReplies replies={suggestedReplies} />
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
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#BABDE2]/60 bg-[#F8F7F3] px-5 py-3 text-sm font-bold text-[#374375] transition hover:bg-[#BABDE2]/30"
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

        <Link
          href="/dashboard/replies"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#BABDE2]/60 bg-[#F8F7F3] px-5 py-3 text-sm font-bold text-[#374375] transition hover:bg-[#BABDE2]/30"
        >
          <Repeat2 size={18} />
          مركز الردود
        </Link>

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

        <div className="border-t border-[#BABDE2]/30 pt-3">
          <p className="mb-2 px-2 text-xs font-bold text-gray-400">إدارة الحساب</p>
          <div className="space-y-2">
            <DashboardMenuLink
              href="/dashboard/platforms"
              label="حالة المنصات"
              icon={<RadioTower size={18} />}
            />
            <DashboardMenuLink
              href="/dashboard/settings"
              label="الإعدادات"
              icon={<Settings size={18} />}
            />
          </div>
        </div>

      </div>
    </aside>
  );
}

function DashboardMenuLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold text-gray-500 transition hover:bg-[#BABDE2]/25 hover:text-[#374375]"
    >
      {icon}
      {label}
    </Link>
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

function PeriodSummary({
  start,
  end,
  hasError,
}: {
  start: Date;
  end: Date;
  hasError: boolean;
}) {
  const formatter = new Intl.DateTimeFormat("ar-SA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div
      className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-bold leading-7 ${
        hasError
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-[#BABDE2]/35 bg-white text-gray-500"
      }`}
    >
      {hasError
        ? "تعذر تحميل بعض أقسام اللوحة. أعد المحاولة، وستبقى البيانات المتاحة ظاهرة."
        : `البيانات المعروضة من ${formatter.format(start)} إلى ${formatter.format(end)}.`}
    </div>
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

function WeeklyComparison({
  current,
  previous,
}: {
  current: DashboardMetrics;
  previous: DashboardMetrics;
}) {
  return (
    <Panel
      eyebrow="مقارنة الأداء"
      title="الفترة الحالية مقارنة بالفترة السابقة"
      icon={<TrendingUp size={22} />}
    >
      <div className="space-y-4">
        <ComparisonRow
          label="متوسط التقييم"
          current={current.averageRating ?? "—"}
          previous={previous.averageRating ?? "—"}
          change={formatMetricChange(
            current.averageRating,
            previous.averageRating,
            "نقطة"
          )}
        />
        <ComparisonRow
          label="عدد التعليقات"
          current={current.totalFeedback}
          previous={previous.totalFeedback}
          change={formatMetricChange(
            current.totalFeedback,
            previous.totalFeedback,
            "تعليق"
          )}
        />
        <ComparisonRow
          label="نسبة السلبي"
          current={`${current.negativePct}%`}
          previous={`${previous.negativePct}%`}
          change={formatMetricChange(
            current.negativePct,
            previous.negativePct,
            "نقطة مئوية",
            true
          )}
        />
      </div>
    </Panel>
  );
}

function RatingTrend({ points }: { points: RatingTrendPoint[] }) {
  return (
    <Panel eyebrow="الاتجاه العام" title="اتجاه التقييمات خلال الفترة" icon={<BarChart3 size={22} />}>
      {points.length === 0 ? (
        <div className="rounded-2xl bg-[#F8F7F3] p-8 text-center text-sm font-bold text-gray-500">
          لا توجد تقييمات رقمية ضمن الفترة والفلاتر المحددة.
        </div>
      ) : (
        <div className="flex h-56 items-end gap-2 rounded-3xl bg-[#F8F7F3] p-4 sm:gap-3 sm:p-5">
          {points.map((point) => (
            <div key={point.date} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center">
              <span className="mb-2 text-xs font-extrabold text-[#374375]">
                {point.value}
              </span>
              <div
                className="mx-auto w-full max-w-12 rounded-t-xl bg-[#BABDE2]"
                style={{ height: `${Math.max(8, (point.value / 5) * 78)}%` }}
              />
              <span className="mt-2 truncate text-[10px] text-gray-400">
                {point.label}
              </span>
            </div>
          ))}
        </div>
      )}
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

function SmartAlerts({
  alerts,
}: {
  alerts: {
    id: number;
    title: string | null;
    message: string | null;
    priority: string | null;
  }[];
}) {
  return (
    <Panel eyebrow="تنبيهات ذكية" title="تنبيهات تحتاج انتباهك" icon={<Lightbulb size={22} />}>
      {alerts.length === 0 ? (
        <div className="rounded-2xl bg-[#F8F7F3] p-6 text-center text-sm font-bold text-gray-500">
          لا توجد تنبيهات مفتوحة تحتاج إلى متابعة.
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertItem
              key={alert.id}
              title={alert.title || "تنبيه يحتاج متابعة"}
              text={alert.message || "راجع الحالة من مركز الردود."}
              priority={alert.priority}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

function SuggestedReplies({
  replies,
}: {
  replies: {
    id: string;
    branchName: string;
    platformName: string;
    feedbackText: string;
    suggestedReply: string;
  }[];
}) {
  return (
    <Panel eyebrow="اقتراح الردود" title="ردود مقترحة جاهزة" icon={<MessageSquareText size={22} />}>
      {replies.length === 0 ? (
        <div className="rounded-2xl bg-[#F8F7F3] p-6 text-center text-sm font-bold text-gray-500">
          لا توجد ردود مقترحة ضمن الفترة والفلاتر المحددة.
        </div>
      ) : (
        <div className="space-y-4">
          {replies.map((reply) => (
            <article key={reply.id} className="rounded-3xl bg-[#F8F7F3] p-5">
              <p className="text-xs font-bold text-gray-400">
                {reply.branchName} · {reply.platformName}
              </p>
              <p className="mt-2 line-clamp-2 font-bold leading-7 text-[#374375]">
                {reply.feedbackText}
              </p>
              <div className="mt-4 rounded-2xl border border-[#BABDE2]/40 bg-white p-4">
                <p className="text-xs font-bold text-gray-400">الرد المقترح</p>
                <p className="mt-2 line-clamp-3 leading-7 text-gray-600">
                  {reply.suggestedReply}
                </p>
              </div>
            </article>
          ))}
          <Link
            href="/dashboard/replies"
            className="inline-flex rounded-full bg-[#374375] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#895159]"
          >
            عرض مركز الردود
          </Link>
        </div>
      )}
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

function AlertItem({
  title,
  text,
  priority,
}: {
  title: string;
  text: string;
  priority: string | null;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-[#F8F7F3] p-4">
      <AlertTriangle size={18} className="mt-1 text-[#895159]" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-extrabold text-[#374375]">{title}</p>
          {priority && (
            <span className="rounded-full bg-[#DFAEA1]/25 px-2.5 py-1 text-[10px] font-bold text-[#895159]">
              {formatPriority(priority)}
            </span>
          )}
        </div>
        <p className="mt-1 whitespace-pre-line leading-7 text-gray-600">{text}</p>
      </div>
    </div>
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

type DashboardQueryScope = {
  clientId: number;
  branchId: number | null;
  platformId: number | null;
};

type DashboardFeedbackScope = DashboardQueryScope & {
  start: Date;
  end: Date;
};

type QueryError = { message: string } | null;

async function loadDashboardFeedback(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  scope: DashboardFeedbackScope
): Promise<{ data: DashboardFeedbackRow[]; error: QueryError }> {
  const pageSize = 1000;
  const rows: DashboardFeedbackRow[] = [];

  for (let from = 0; ; from += pageSize) {
    let query = supabase
      .from("unified_feedback")
      .select(
        "source_table, source_record_id, branch_id, platform_id, platform_name, feedback_text, rating, published_at, sentiment, category, severity, needs_reply, is_complaint, suggested_reply"
      )
      .eq("client_id", scope.clientId)
      .gte("published_at", scope.start.toISOString())
      .lte("published_at", scope.end.toISOString())
      .order("published_at", { ascending: false });

    if (scope.branchId !== null) {
      query = query.or(
        `branch_id.eq.${scope.branchId},branch_id.is.null`
      );
    }

    if (scope.platformId !== null) {
      query = query.eq("platform_id", scope.platformId);
    }

    const { data, error } = await query.range(from, from + pageSize - 1);

    if (error) {
      return { data: rows, error: { message: error.message } };
    }

    const page = (data ?? []) as DashboardFeedbackRow[];
    rows.push(...page);

    if (page.length < pageSize) {
      return { data: rows, error: null };
    }
  }
}

async function loadDashboardReports(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  scope: DashboardQueryScope
): Promise<{ data: any[]; error: QueryError }> {
  let query = supabase
    .from("reports")
    .select(
      "id, branch_id, platform_id, report_type, period_start, period_end, stats, ai_summary, created_at"
    )
    .eq("client_id", scope.clientId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(30);

  if (scope.branchId !== null) {
    query = query.or(`branch_id.eq.${scope.branchId},branch_id.is.null`);
  }

  if (scope.platformId !== null) {
    query = query.eq("platform_id", scope.platformId);
  }

  const { data, error } = await query;
  return {
    data: data ?? [],
    error: error ? { message: error.message } : null,
  };
}

async function loadDashboardAlerts(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  scope: DashboardQueryScope
): Promise<{
  data: {
    id: number;
    title: string | null;
    message: string | null;
    priority: string | null;
  }[];
  error: QueryError;
}> {
  let query = supabase
    .from("alerts")
    .select("id, title, message, priority")
    .eq("client_id", scope.clientId)
    .in("status", ["new", "sent"])
    .order("created_at", { ascending: false })
    .limit(5);

  if (scope.branchId !== null) {
    query = query.or(`branch_id.eq.${scope.branchId},branch_id.is.null`);
  }

  if (scope.platformId !== null) {
    query = query.eq("platform_id", scope.platformId);
  }

  const { data, error } = await query;
  return {
    data: data ?? [],
    error: error ? { message: error.message } : null,
  };
}

function latestReportsByPlatform(reports: any[]) {
  const seen = new Set<string>();

  return reports.filter((report) => {
    const key = `${report.platform_id ?? "all"}:${report.branch_id ?? "all"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractReportIssues(reports: any[]) {
  const counts = new Map<string, number>();

  for (const report of latestReportsByPlatform(reports)) {
    const aiSummary = asObject(report.ai_summary);
    const stats = asObject(report.stats);
    const issues = [
      ...asObjectArray(aiSummary.top_issues),
      ...asObjectArray(stats.top_issues),
    ];

    for (const issue of issues) {
      const label = String(
        issue.title ?? issue.name ?? issue.label ?? ""
      ).trim();
      if (!label) continue;
      counts.set(label, (counts.get(label) ?? 0) + asNumber(issue.count || 1));
    }
  }

  return Array.from(counts, ([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);
}

function extractRecommendations(reports: any[]) {
  const recommendations: { title: string; text: string }[] = [];
  const seen = new Set<string>();

  for (const report of latestReportsByPlatform(reports)) {
    const aiSummary = asObject(report.ai_summary);
    const values = Array.isArray(aiSummary.recommendations)
      ? aiSummary.recommendations
      : [];

    for (const value of values) {
      const item = asObject(value);
      const text =
        typeof value === "string"
          ? value.trim()
          : [item.description, item.suggested_action, item.text]
              .filter(
                (part): part is string =>
                  typeof part === "string" && part.trim().length > 0
              )
              .join(" — ");
      if (!text || seen.has(text)) continue;

      seen.add(text);
      recommendations.push({
        title:
          typeof value === "string"
            ? "توصية"
            : String(item.title ?? "توصية"),
        text,
      });
    }
  }

  return recommendations.length > 0
    ? recommendations.slice(0, 5)
    : [
        {
          title: "لا توجد توصيات بعد",
          text: "ستظهر التوصيات بعد توفر تقرير مكتمل يحتوي على بيانات كافية.",
        },
      ];
}

function formatMetricChange(
  current: number | null,
  previous: number | null,
  unit: string,
  lowerIsBetter = false
) {
  if (current === null || previous === null) return "لا توجد مقارنة كافية";

  const difference = Math.round((current - previous) * 10) / 10;
  if (difference === 0) return "دون تغيير";

  const improved = lowerIsBetter ? difference < 0 : difference > 0;
  return `${improved ? "تحسن" : "تراجع"} ${Math.abs(difference)} ${unit}`;
}

function formatPriority(priority: string) {
  if (priority.toLowerCase() === "high") return "أولوية مرتفعة";
  if (priority.toLowerCase() === "medium") return "أولوية متوسطة";
  if (priority.toLowerCase() === "low") return "أولوية منخفضة";
  return priority;
}
