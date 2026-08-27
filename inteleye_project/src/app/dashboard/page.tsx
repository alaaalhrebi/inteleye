import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  FileText,
  Lightbulb,
  Plus,
  RadioTower,
  Repeat2,
  Settings,
} from "lucide-react";
import LogoutButton from "@/components/dashboard/LogoutButton";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
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

 const currentPlatformsCount = new Set(
  platforms.map((platform) => platform.platform_name)
).size;

const permissions = getSubscriptionPermissions(client, {
  currentPlatformsCount,
});

const plan = permissions.plan;
const canManagePlatformLinks = permissions.canUsePlatform;
const recommendations = extractRecommendations(reports);
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

  return (
  <div dir="rtl" className="dashboard-print-root min-h-screen bg-[#F8F7F3] text-[#374375]">
    <DashboardHeader clientName={client.name} plan={client.plan} />
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6 lg:flex-row lg:gap-6">
    <DashboardSideMenu
          platforms={platforms}
          branches={branches ?? []}
          canManagePlatformLinks={canManagePlatformLinks}
          currentPlatformsCount={currentPlatformsCount}
          platformLimit={permissions.platformLimit}
          canManageBranches={permissions.canManageBranches}
          canAccessCustomReports={permissions.canAccessCustomReports}
        />

        <main className="min-w-0 flex-1 pb-10">
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
          />

          <section className="mt-6 grid gap-6 xl:grid-cols-2">
            <SmartAlerts alerts={alerts} />
            <AiRecommendations recommendations={recommendations} />
          </section>

          <section className="mt-6">
            <PlatformsSection
              platforms={platforms}
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
  canManagePlatformLinks,
  currentPlatformsCount,
  platformLimit,
  canManageBranches,
  canAccessCustomReports,
}: {
  platforms: any[];
  branches: any[];
  canManagePlatformLinks: boolean;
  currentPlatformsCount: number;
  platformLimit: number;
  canManageBranches: boolean;
  canAccessCustomReports: boolean;
}) {
  return (
    <aside className="no-print w-full shrink-0 rounded-[1.5rem] border border-[#BABDE2]/40 bg-white p-4 shadow-sm lg:sticky lg:top-24 lg:w-[260px] xl:w-[300px]">
      <DashboardFilters branches={branches} platforms={platforms} />

      <div className="mt-6 space-y-3">
        {canManagePlatformLinks ? (
          <Link
            href="/onboarding/platforms"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#BABDE2]/60 bg-[#F8F7F3] px-5 py-3 text-sm font-bold text-[#374375] transition hover:bg-[#BABDE2]/30"
          >
            <Plus size={18} />
            إضافة أو ربط منصة
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
  canManagePlatformLinks,
  plan,
  currentPlatformsCount,
  platformLimit,
}: {
  platforms: any[];
  canManagePlatformLinks: boolean;
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

        {!canManagePlatformLinks && (
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

function formatPriority(priority: string) {
  if (priority.toLowerCase() === "high") return "أولوية مرتفعة";
  if (priority.toLowerCase() === "medium") return "أولوية متوسطة";
  if (priority.toLowerCase() === "low") return "أولوية منخفضة";
  return priority;
}
