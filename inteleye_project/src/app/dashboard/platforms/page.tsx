import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  LockKeyhole,
  MessageSquareText,
  Plus,
  RadioTower,
} from "lucide-react";

import DashboardSectionHeader from "@/components/dashboard/DashboardSectionHeader";
import { getSubscriptionPermissions } from "@/lib/subscription-permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type PlatformRow = {
  id: number;
  branch_id: number | null;
  platform_name: string;
  is_active: boolean | null;
  connection_status: string | null;
  last_sync_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  created_at: string | null;
};

type FeedbackRow = {
  platform_name: string | null;
  published_at: string | null;
};

const platformDefinitions = [
  { key: "google_maps", name: "Google Maps", mark: "G", tone: "bg-[#DFAEA1]/25 text-[#895159]" },
  { key: "x", name: "X", mark: "X", tone: "bg-[#374375] text-white" },
  { key: "tiktok", name: "TikTok", mark: "T", tone: "bg-[#BABDE2]/35 text-[#374375]" },
  { key: "instagram", name: "Instagram", mark: "I", tone: "bg-pink-50 text-pink-700" },
] as const;

export default async function PlatformsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: client } = await supabase
    .from("clients")
    .select(
      "id, name, plan, subscription_status, trial_ends_at, current_period_end, allowed_platforms_count"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!client) redirect("/signup");

  const basePermissions = getSubscriptionPermissions(client);
  if (!basePermissions.canAccessDashboard) {
    redirect("/pricing?reason=subscription_required");
  }

  let platformsQuery = supabase
    .from("client_platforms")
    .select(
      "id, branch_id, platform_name, is_active, connection_status, last_sync_at, last_success_at, last_error, created_at"
    )
    .eq("client_id", client.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (basePermissions.isTrialActive) {
    platformsQuery = platformsQuery.limit(1);
  }

  const [platformsResult, branchesResult, feedbackResult] = await Promise.all([
    platformsQuery,
    supabase
      .from("branches")
      .select("id, name")
      .eq("client_id", client.id)
      .eq("is_active", true),
    supabase
      .from("unified_feedback")
      .select("platform_name, published_at")
      .eq("client_id", client.id)
      .limit(5000),
  ]);

  const platforms = (platformsResult.data ?? []) as PlatformRow[];
  const branches = branchesResult.data ?? [];
  const feedback = (feedbackResult.data ?? []) as FeedbackRow[];
  const branchNames = new Map(branches.map((branch) => [branch.id, branch.name]));
  const currentPlatformTypes = new Set(platforms.map((row) => row.platform_name));
  const permissions = getSubscriptionPermissions(client, {
    currentPlatformsCount: currentPlatformTypes.size,
  });

  const cards = platformDefinitions.map((definition) => {
    const linkedRows = platforms.filter((row) => row.platform_name === definition.key);
    const platformFeedback = feedback.filter((row) => row.platform_name === definition.key);
    const linkedBranchIds = new Set(
      linkedRows.flatMap((row) => (row.branch_id === null ? [] : [row.branch_id]))
    );
    const isLinked = linkedRows.length > 0;
    const isAvailable = isLinked || permissions.canAddPlatform;
    const hasConnectionError = linkedRows.some(
      (row) =>
        Boolean(row.last_error) ||
        ["error", "disconnected", "reauth_required"].includes(
          row.connection_status?.toLowerCase() ?? ""
        )
    );
    const isConnected = linkedRows.some(
      (row) => row.connection_status?.toLowerCase() === "connected"
    );
    const state = !isAvailable
      ? "locked"
      : !isLinked
      ? "available"
      : hasConnectionError
      ? "attention"
      : isConnected
      ? "connected"
      : "pending";

    return {
      ...definition,
      state,
      branchCount: linkedBranchIds.size,
      branchNames: Array.from(linkedBranchIds)
        .map((id) => branchNames.get(id))
        .filter((name): name is string => Boolean(name)),
      feedbackCount: platformFeedback.length,
      lastActivity: latestDate([
        ...linkedRows.flatMap((row) => [
          row.last_success_at,
          row.last_sync_at,
          row.created_at,
        ]),
        ...platformFeedback.map((row) => row.published_at),
      ]),
      hasAccountLevelLink: linkedRows.some((row) => row.branch_id === null),
    };
  });

  const connectedCount = cards.filter((card) => card.state === "connected").length;
  const attentionCount = cards.filter((card) => card.state === "attention").length;
  const linkedBranchesCount = new Set(
    platforms.flatMap((platform) =>
      platform.branch_id === null ? [] : [platform.branch_id]
    )
  ).size;

  return (
    <div dir="rtl" className="min-h-screen bg-[#F8F7F3] text-[#374375]">
      <DashboardSectionHeader
        activePath="/dashboard/platforms"
        clientName={client.name || "حساب IntelEye"}
        plan={permissions.plan}
        eyebrow="مركز المراقبة"
        title="حالة المنصات"
        description="راقب تغطية المنصات وصحة الاتصال وآخر نشاط في مكان واحد. إدارة الربط التفصيلية تبقى ضمن إعداد المنصة أو الفروع."
        icon={<RadioTower size={29} />}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="المنصات المستخدمة"
            value={`${currentPlatformTypes.size} / ${permissions.platformLimit}`}
            icon={<Activity size={21} />}
          />
          <SummaryCard
            label="اتصال سليم"
            value={connectedCount}
            icon={<CheckCircle2 size={21} />}
            tone="good"
          />
          <SummaryCard
            label="الفروع المغطاة"
            value={linkedBranchesCount}
            icon={<Building2 size={21} />}
          />
          <SummaryCard
            label="تحتاج متابعة"
            value={attentionCount}
            icon={<AlertTriangle size={21} />}
            tone={attentionCount > 0 ? "warn" : "default"}
          />
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          {cards.map((card) => (
            <PlatformCard
              key={card.key}
              card={card}
              canManageBranches={permissions.canManageBranches}
            />
          ))}
        </section>

        <section className="mt-6 flex flex-col gap-4 rounded-[1.75rem] border border-[#BABDE2]/35 bg-[#374375] p-6 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold text-[#BABDE2]">تغطية الحساب</p>
            <h2 className="mt-2 text-xl font-extrabold">هل تريد ربط منصة جديدة؟</h2>
            <p className="mt-2 text-sm leading-7 text-white/70">
              باقتك الحالية تسمح باستخدام {permissions.platformLimit} منصة، وتستخدم الآن {currentPlatformTypes.size}.
            </p>
          </div>
          <Link
            href={permissions.canUsePlatform ? "/onboarding/platforms" : "/pricing"}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#374375] transition hover:bg-[#DFAEA1]"
          >
            {permissions.canUsePlatform ? <Plus size={18} /> : <LockKeyhole size={18} />}
            {permissions.canUsePlatform ? "إضافة أو ربط منصة" : "عرض الباقات"}
          </Link>
        </section>
      </main>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: "default" | "good" | "warn";
}) {
  const iconClass =
    tone === "good"
      ? "bg-[#DFAEA1]/25 text-[#895159]"
      : tone === "warn"
      ? "bg-amber-50 text-amber-700"
      : "bg-[#BABDE2]/30 text-[#374375]";

  return (
    <article className="rounded-[1.5rem] border border-[#BABDE2]/30 bg-white p-5 shadow-sm">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconClass}`}>
        {icon}
      </div>
      <p className="mt-5 text-sm text-gray-400">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-[#374375]">{value}</p>
    </article>
  );
}

function PlatformCard({
  card,
  canManageBranches,
}: {
  card: (typeof platformDefinitions)[number] & {
    state: string;
    branchCount: number;
    branchNames: string[];
    feedbackCount: number;
    lastActivity: string | null;
    hasAccountLevelLink: boolean;
  };
  canManageBranches: boolean;
}) {
  const status = platformStatus(card.state);
  const action = platformAction(card.state, canManageBranches);

  return (
    <article className="rounded-[1.75rem] border border-[#BABDE2]/35 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className={`flex h-[52px] w-[52px] items-center justify-center rounded-2xl text-lg font-black ${card.tone}`}>
            {card.mark}
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-[#374375]">{card.name}</h2>
            <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${status.className}`}>
              {status.label}
            </span>
          </div>
        </div>
        <RadioTower size={21} className="text-[#BABDE2]" />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <MiniStat label="الفروع" value={card.branchCount || (card.hasAccountLevelLink ? "عام" : 0)} />
        <MiniStat label="التعليقات" value={card.feedbackCount} />
        <MiniStat label="آخر نشاط" value={formatRelativeDate(card.lastActivity)} />
      </div>

      <div className="mt-5 min-h-[52px] rounded-2xl bg-[#F8F7F3] px-4 py-3 text-xs leading-6 text-gray-500">
        {card.state === "attention"
          ? "توجد مشكلة في الاتصال وتحتاج المنصة إلى مراجعة الربط."
          : card.branchNames.length > 0
          ? `مرتبطة بـ ${card.branchNames.slice(0, 2).join("، ")}${card.branchNames.length > 2 ? " وغيرها" : ""}.`
          : card.hasAccountLevelLink
          ? "مرتبطة على مستوى المنشأة بالكامل."
          : status.description}
      </div>

      <Link
        href={action.href}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#374375] px-5 py-2.5 text-sm font-bold text-[#374375] transition hover:bg-[#374375] hover:text-white"
      >
        {action.icon}
        {action.label}
      </Link>
    </article>
  );
}

function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl bg-[#BABDE2]/14 px-3 py-3 text-center">
      <p className="text-[11px] text-gray-400">{label}</p>
      <p className="mt-1 truncate text-sm font-extrabold text-[#374375]">{value}</p>
    </div>
  );
}

function platformStatus(state: string) {
  if (state === "connected") {
    return { label: "متصل", description: "الاتصال يعمل بصورة طبيعية.", className: "bg-[#DFAEA1]/25 text-[#895159]" };
  }
  if (state === "attention") {
    return { label: "يحتاج إعادة ربط", description: "راجع بيانات الاتصال.", className: "bg-red-50 text-red-700" };
  }
  if (state === "pending") {
    return { label: "قيد التحقق", description: "تم الربط وننتظر أول مزامنة ناجحة.", className: "bg-amber-50 text-amber-700" };
  }
  if (state === "available") {
    return { label: "متاحة", description: "متاحة في باقتك ولم يتم ربطها بعد.", className: "bg-[#BABDE2]/30 text-[#374375]" };
  }
  return { label: "غير متاحة في الباقة", description: "تحتاج إلى ترقية الباقة لإضافتها.", className: "bg-gray-100 text-gray-500" };
}

function platformAction(state: string, canManageBranches: boolean) {
  if (state === "locked") {
    return { href: "/pricing", label: "ترقية الباقة", icon: <LockKeyhole size={17} /> };
  }
  if (state === "available") {
    return { href: "/onboarding/platforms", label: "ربط المنصة", icon: <Plus size={17} /> };
  }
  if (canManageBranches) {
    return { href: "/dashboard/branches", label: "عرض الفروع المرتبطة", icon: <Building2 size={17} /> };
  }
  return { href: "/dashboard", label: "عرض في لوحة التحكم", icon: <MessageSquareText size={17} /> };
}

function latestDate(values: (string | null)[]) {
  const timestamps = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite);

  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps)).toISOString();
}

function formatRelativeDate(value: string | null) {
  if (!value) return "—";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "—";

  const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
  if (days === 0) return "اليوم";
  if (days === 1) return "أمس";
  if (days < 7) return `${days} أيام`;
  return new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Riyadh",
  }).format(new Date(value));
}
