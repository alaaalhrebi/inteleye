import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Lightbulb,
} from "lucide-react";
import LogoutButton from "@/components/dashboard/LogoutButton";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import PrintDashboardButton from "@/components/dashboard/PrintDashboardButton";
import InteractiveDashboard from "@/components/dashboard/InteractiveDashboard";
import { getSubscriptionPermissions } from "@/lib/subscription-permissions";
import {
  getDashboardPeriodRange,
  normalizeDashboardPeriod,
  type DashboardFeedbackRow,
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
    .select("id, branch_id, platform_name, platform_url, username, business_activity, is_active, connection_status, last_sync_at, last_success_at, last_error")
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

 const currentPlatformsCount = new Set(
  platforms.map((platform) => platform.platform_name)
).size;

const permissions = getSubscriptionPermissions(client, {
  currentPlatformsCount,
});

const plan = permissions.plan;
const canManagePlatformLinks = permissions.canUsePlatform;
const recommendations = extractRecommendations(reports);
const topActions = buildTopActions(currentFeedback, recommendations);
const branchNames = Object.fromEntries(
  (branches ?? []).map((branch) => [String(branch.id), branch.name])
);
const selectedPlatformName =
  selectedPlatform === null
    ? null
    : platforms.find((platform) => platform.id === selectedPlatform)
        ?.platform_name ?? null;
const activePlatforms = Array.from(
  new Set(platforms.map((platform) => platform.platform_name).filter(Boolean))
);
const selectedBranchName =
  selectedBranch === null
    ? null
    : branchNames[String(selectedBranch)] ?? null;

  return (
  <div dir="rtl" className="dashboard-print-root min-h-screen bg-[#F8F7F3] text-[#374375]">
    <DashboardHeader clientName={client.name} plan={client.plan} />
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-3 py-3 sm:px-5 sm:py-4 lg:flex-row lg:gap-4">
    <DashboardSidebar
          platforms={platforms}
          branches={branches ?? []}
          canManagePlatformLinks={canManagePlatformLinks}
          currentPlatformsCount={currentPlatformsCount}
          platformLimit={permissions.platformLimit}
          canManageBranches={permissions.canManageBranches}
          canAccessCustomReports={permissions.canAccessCustomReports}
        />

        <main className="min-w-0 flex-1 pb-8">
          <ActiveScopeBar
            branchName={selectedBranchName}
            platformName={selectedPlatformName}
            period={selectedPeriod}
          />

          <InteractiveDashboard
            clientName={client.name}
            feedback={currentFeedback}
            comparisonFeedback={comparisonFeedback}
            selectedPlatformName={selectedPlatformName}
            activePlatforms={activePlatforms}
            branchNames={branchNames}
            periodStart={periodRange.start.toISOString()}
            periodEnd={periodRange.end.toISOString()}
            hasError={dashboardErrors.length > 0}
            priorityContent={
              <section className="mt-4 grid gap-4 xl:grid-cols-2">
                <SmartAlerts alerts={alerts} />
                <TopActions actions={topActions} />
              </section>
            }
          />

          <section className="mt-4">
            <PlatformsSection
              platforms={platforms}
              branchNames={branchNames}
              canManagePlatformLinks={canManagePlatformLinks}
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
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
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

function ActiveScopeBar({
  branchName,
  platformName,
  period,
}: {
  branchName: string | null;
  platformName: string | null;
  period: "this_week" | "last_week" | "this_month" | "last_60_days";
}) {
  const periodLabels = {
    this_week: "هذا الأسبوع",
    last_week: "الأسبوع الماضي",
    this_month: "هذا الشهر",
    last_60_days: "آخر شهرين",
  };
  const hasFilters = Boolean(branchName || platformName || period !== "this_week");

  return (
    <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#BABDE2]/35 bg-white px-3 py-2 text-sm font-bold text-[#374375] shadow-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-[#F8F7F3] px-3 py-1.5">
          {branchName || "كل الفروع"}
        </span>
        <span className="text-[#BABDE2]">•</span>
        <span className="rounded-full bg-[#F8F7F3] px-3 py-1.5">
          {platformName ? formatPlatform(platformName) : "كل المنصات"}
        </span>
        <span className="text-[#BABDE2]">•</span>
        <span className="rounded-full bg-[#BABDE2]/20 px-3 py-1.5">
          {periodLabels[period]}
        </span>
      </div>
      {hasFilters ? (
        <Link
          href="/dashboard"
          className="rounded-full px-3 py-1.5 text-[#895159] transition hover:bg-[#DFAEA1]/15"
        >
          مسح الفلاتر
        </Link>
      ) : null}
    </div>
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

function TopActions({
  actions,
}: {
  actions: { title: string; text: string; tone: "risk" | "warn" | "opportunity" | "info" }[];
}) {
  return (
    <Panel eyebrow="قرار هذا الأسبوع" title="أهم 3 إجراءات" icon={<Lightbulb size={22} />}>
      <div className="space-y-3">
        {actions.map((item, index) => (
          <div
            key={`${item.title}-${index}`}
            className={`rounded-2xl border-r-4 p-4 ${
              item.tone === "risk"
                ? "border-r-[#895159] bg-[#DFAEA1]/12"
                : item.tone === "warn"
                  ? "border-r-amber-500 bg-amber-50"
                  : item.tone === "opportunity"
                    ? "border-r-emerald-600 bg-emerald-50"
                    : "border-r-[#374375] bg-[#F8F7F3]"
            }`}
          >
            <p className="font-extrabold text-[#374375]">
              {index + 1}. {item.title}
            </p>
            <p className="mt-1.5 text-sm leading-6 text-gray-600">{item.text}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function PlatformsSection({
  platforms,
  branchNames,
  canManagePlatformLinks,
  plan,
  currentPlatformsCount,
  platformLimit,
}: {
  platforms: any[];
  branchNames: Record<string, string>;
  canManagePlatformLinks: boolean;
  plan: string;
  currentPlatformsCount: number;
  platformLimit: number;
}) {
  return (
    <Panel eyebrow="صحة مصادر البيانات" title="حالة المنصات والمزامنة" icon={<BarChart3 size={22} />}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {platforms.map((platform) => {
          const status = getPlatformConnectionState(platform);
          const accountUrl = safePlatformUrl(platform.platform_url);
          const lastSync = platform.last_success_at || platform.last_sync_at;

          return (
            <div key={platform.id} className="rounded-2xl border border-[#BABDE2]/30 bg-[#F8F7F3] p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-[#374375]">
                    {formatPlatform(platform.platform_name)}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {platform.branch_id === null
                      ? "شاملة لجميع الفروع"
                      : `مرتبطة بفرع: ${
                          branchNames[String(platform.branch_id)] || "فرع غير مسمى"
                        }`}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status.className}`}>
                  {status.label}
                </span>
              </div>

              <p className="mt-4 text-sm font-bold text-gray-500">
                آخر مزامنة: {formatRelativeSync(lastSync)}
              </p>
              {platform.last_error ? (
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#895159]">
                  توجد ملاحظة في آخر مزامنة. راجع صفحة حالة المنصات.
                </p>
              ) : null}

              <div className="mt-4 flex items-center gap-2">
                {accountUrl ? (
                  <a
                    href={accountUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-extrabold text-[#374375] underline decoration-[#BABDE2] underline-offset-4"
                  >
                    فتح الحساب
                  </a>
                ) : null}
                <Link
                  href="/dashboard/platforms"
                  className="text-sm font-bold text-gray-500 hover:text-[#374375]"
                >
                  التفاصيل
                </Link>
              </div>
            </div>
          );
        })}

        {!canManagePlatformLinks && (
          <div className="rounded-2xl bg-[#DFAEA1]/20 p-4 text-sm font-bold text-[#895159] md:col-span-2 xl:col-span-4">
          <>
            وصلت إلى الحد المسموح في باقة {formatPlan(plan)}.
            <span className="mt-1 block text-sm">
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
          <p className="text-xs sm:text-sm text-gray-500">{eyebrow}</p>
          <h2 className="text-base sm:text-lg lg:text-xl font-extrabold text-[#374375]">{title}</h2>
        </div>
      </div>

      <div className="text-sm sm:text-base">
        {children}
      </div>
    </section>
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
            <span className="rounded-full bg-[#DFAEA1]/25 px-2.5 py-1 text-xs font-bold text-[#895159]">
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

function safePlatformUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function getPlatformConnectionState(platform: {
  connection_status?: string | null;
  last_error?: string | null;
  is_active?: boolean;
}) {
  const value = platform.connection_status?.trim().toLowerCase();
  if (platform.last_error || ["error", "failed"].includes(value ?? "")) {
    return { label: "خطأ بالمزامنة", className: "bg-[#DFAEA1]/25 text-[#895159]" };
  }
  if (["reauth_required", "needs_reconnect", "disconnected"].includes(value ?? "")) {
    return { label: "يحتاج إعادة ربط", className: "bg-amber-100 text-amber-800" };
  }
  if (platform.is_active) {
    return { label: "متصل", className: "bg-emerald-50 text-emerald-700" };
  }
  return { label: "غير متصل", className: "bg-gray-100 text-gray-500" };
}

function formatRelativeSync(value: unknown) {
  if (typeof value !== "string") return "لم تتم بعد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير معروف";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
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
        "source_table, source_record_id, branch_id, platform_id, platform_name, feedback_text, rating, published_at, sentiment, category, severity, needs_reply, is_sales_opportunity, is_complaint, suggested_reply"
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

function buildTopActions(
  feedback: DashboardFeedbackRow[],
  recommendations: { title: string; text: string }[]
) {
  const actions: {
    title: string;
    text: string;
    tone: "risk" | "warn" | "opportunity" | "info";
  }[] = [];
  const urgentCount = feedback.filter((row) =>
    ["high", "critical"].includes(row.severity?.trim().toLowerCase() ?? "")
  ).length;
  const needsReplyCount = feedback.filter((row) => row.needs_reply === true).length;
  const opportunityCount = feedback.filter(
    (row) => row.is_sales_opportunity === true
  ).length;

  if (urgentCount > 0 || needsReplyCount > 0) {
    actions.push({
      title: `معالجة ${Math.max(urgentCount, needsReplyCount)} حالة ذات أولوية`,
      text: `توجد ${urgentCount} حالة مرتفعة الخطورة و${needsReplyCount} حالة تحتاج ردًا ضمن الفترة الحالية. ابدأ بالأعلى خطورة من مركز الردود.`,
      tone: "risk",
    });
  }

  const negativeTopics = new Map<string, number>();
  for (const row of feedback) {
    const negative =
      row.is_complaint === true ||
      row.sentiment?.trim().toLowerCase() === "negative";
    if (!negative) continue;
    for (const rawCategory of row.category ?? []) {
      const category = rawCategory.trim();
      if (category) {
        negativeTopics.set(category, (negativeTopics.get(category) ?? 0) + 1);
      }
    }
  }
  const leadingIssue = Array.from(negativeTopics, ([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)[0];

  if (leadingIssue) {
    actions.push({
      title: `مراجعة ${leadingIssue.label}`,
      text: `بناءً على ${leadingIssue.count} تعليقًا سلبيًا أو شكوى مرتبطة بـ${leadingIssue.label}، راجع السبب التشغيلي وراقب أثر المعالجة في الفترة القادمة.`,
      tone: "warn",
    });
  }

  if (opportunityCount > 0) {
    actions.push({
      title: `متابعة ${opportunityCount} فرصة مكتشفة`,
      text: "رُصدت إشارات تحمل نية شراء أو فرصة تجارية. راجع العينات الإيجابية وحوّلها إلى إجراء تسويقي أو متابعة مباشرة.",
      tone: "opportunity",
    });
  }

  for (const recommendation of recommendations) {
    if (actions.length >= 3 || recommendation.title === "لا توجد توصيات بعد") break;
    actions.push({ ...recommendation, tone: "info" });
  }

  if (actions.length === 0) {
    actions.push({
      title: "استمر في مراقبة التجربة",
      text: "لا توجد حالات حرجة أو اتجاهات سلبية واضحة في الفترة الحالية. راقب التغيرات مع وصول بيانات جديدة.",
      tone: "info",
    });
  }

  return actions.slice(0, 3);
}

function formatPriority(priority: string) {
  if (priority.toLowerCase() === "high") return "أولوية مرتفعة";
  if (priority.toLowerCase() === "medium") return "أولوية متوسطة";
  if (priority.toLowerCase() === "low") return "أولوية منخفضة";
  return priority;
}
