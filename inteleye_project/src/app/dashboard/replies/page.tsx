import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  MessageSquareText,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import DashboardSectionHeader from "@/components/dashboard/DashboardSectionHeader";
import RepliesCenter, { type ReplyItem } from "@/components/dashboard/RepliesCenter";
import { getSubscriptionPermissions } from "@/lib/subscription-permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type FeedbackRow = {
  source_table: string | null;
  source_record_id: number;
  branch_id: number | null;
  platform_name: string | null;
  feedback_text: string | null;
  sentiment: string | null;
  category: string[] | null;
  severity: string | null;
  suggested_reply: string | null;
  published_at: string | null;
};

export default async function RepliesPage() {
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

  const permissions = getSubscriptionPermissions(client);
  if (!permissions.canAccessDashboard) {
    redirect("/pricing?reason=subscription_required");
  }

  const [feedbackResult, branchesResult] = await Promise.all([
    supabase
      .from("unified_feedback")
      .select(
        "source_table, source_record_id, branch_id, platform_name, feedback_text, sentiment, category, severity, suggested_reply, published_at",
        { count: "exact" }
      )
      .eq("client_id", client.id)
      .eq("needs_reply", true)
      .order("published_at", { ascending: false })
      .limit(100),
    supabase
      .from("branches")
      .select("id, name")
      .eq("client_id", client.id),
  ]);

  const feedback = (feedbackResult.data ?? []) as FeedbackRow[];
  const branchNames = new Map(
    (branchesResult.data ?? []).map((branch) => [branch.id, branch.name])
  );
  const items: ReplyItem[] = feedback.map((row) => ({
    id: `${row.source_table || "feedback"}-${row.source_record_id}`,
    branchName:
      (row.branch_id !== null ? branchNames.get(row.branch_id) : null) ||
      "على مستوى المنشأة",
    platformName: formatPlatform(row.platform_name),
    feedbackText: row.feedback_text?.trim() || "",
    suggestedReply: row.suggested_reply?.trim() || "",
    sentiment: row.sentiment?.toLowerCase() || "unknown",
    severity: row.severity?.toLowerCase() || "low",
    categories: Array.isArray(row.category)
      ? row.category.filter((value): value is string => typeof value === "string")
      : [],
    publishedAt: row.published_at,
  }));

  const totalPending = feedbackResult.count ?? items.length;
  const urgentCount = items.filter((item) => item.severity === "high").length;
  const negativeCount = items.filter((item) => item.sentiment === "negative").length;
  const readyRepliesCount = items.filter((item) => Boolean(item.suggestedReply)).length;

  return (
    <div dir="rtl" className="min-h-screen bg-[#F8F7F3] text-[#374375]">
      <DashboardSectionHeader
        activePath="/dashboard/replies"
        clientName={client.name || "حساب IntelEye"}
        plan={permissions.plan}
        eyebrow="مركز الردود والمعالجة"
        title="الردود المقترحة"
        description="راجع التعليقات التي تحتاج إلى متابعة، وانسخ الرد المقترح ثم انشره يدويًا من المنصة الأصلية. IntelEye لا ينشر الرد تلقائيًا."
        icon={<MessageSquareText size={29} />}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="تحتاج معالجة" value={totalPending} icon={<MessageSquareText size={21} />} />
          <SummaryCard label="خطورة مرتفعة" value={urgentCount} icon={<ShieldAlert size={21} />} tone="bad" />
          <SummaryCard label="تعليقات سلبية" value={negativeCount} icon={<AlertTriangle size={21} />} tone="warn" />
          <SummaryCard label="ردود جاهزة للنسخ" value={readyRepliesCount} icon={<Sparkles size={21} />} tone="good" />
        </section>

        <div className="mt-6 rounded-2xl border border-[#BABDE2]/35 bg-[#BABDE2]/18 px-5 py-4 text-sm leading-7 text-gray-600">
          <strong className="text-[#374375]">آلية العمل:</strong> انسخ الرد المقترح، راجعه، ثم أرسله من حسابك في المنصة الأصلية. نسخ الرد لا يعني أنه نُشر.
        </div>

        <div className="mt-6">
          <RepliesCenter items={items} />
        </div>
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
  value: number;
  icon: ReactNode;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const iconClass =
    tone === "bad"
      ? "bg-red-50 text-red-700"
      : tone === "warn"
      ? "bg-amber-50 text-amber-700"
      : tone === "good"
      ? "bg-[#DFAEA1]/25 text-[#895159]"
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

function formatPlatform(value: string | null) {
  if (value === "google_maps") return "Google Maps";
  if (value === "x") return "X";
  if (value === "tiktok") return "TikTok";
  if (value === "instagram") return "Instagram";
  return "منصة غير محددة";
}
