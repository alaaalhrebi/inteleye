export type ProcessingStage =
  | "queued"
  | "collecting"
  | "analyzing"
  | "awaiting_report"
  | "reporting"
  | "ready"
  | "error"
  | "unknown";

export type ReportProgress = {
  stage: ProcessingStage;
  step: number | null;
  title: string;
  description: string;
  nextReportAt: string | null;
  nextReportDue: boolean;
  shouldRefresh: boolean;
};

export type ProgressPlatform = {
  id: number;
  branch_id: number | null;
  connection_status?: string | null;
  last_error?: string | null;
  last_success_at?: string | null;
};

type ProgressReport = {
  client_id: number;
  platform_id: number | null;
  branch_id: number | null;
  report_type: string;
  status: string;
  created_at: string;
};

const messages: Record<ProcessingStage, [number | null, string, string]> = {
  queued: [0, "المزامنة في قائمة الانتظار", "لم تبدأ مزامنة إحدى المنصات المختارة بعد. لا تحتاج إلى إضافتها مرة أخرى."],
  collecting: [0, "جارٍ مزامنة المنصة", "المزامنة جارية وقد تشمل جمع التعليقات وتحليلها. لا تتوفر بعد إشارة تؤكد اكتمال هذه المرحلة."],
  analyzing: [1, "تحليل التعليقات لم يكتمل بعد", "توجد تعليقات محفوظة بانتظار اكتمال التحليل. لا تحتاج إلى إعادة سحبها أو ربط المنصة."],
  awaiting_report: [2, "بانتظار التقرير", "لم يظهر تقرير مكتمل للفترة المستحقة بعد. قد يكون في الانتظار أو قيد الإعداد؛ سنعرضه عند تأكيد اكتماله."],
  reporting: [2, "جارٍ إعداد التقرير", "توجد عملية إعداد تقرير مسجلة. لا تعِد إرسال طلب أو سحب البيانات أثناء انتظار النتيجة."],
  ready: [3, "تقريرك متاح للمشاهدة", "يمكنك فتح صفحة التقارير للاطلاع على آخر تقرير مكتمل للمنصات المختارة."],
  error: [null, "تحتاج المعالجة إلى متابعة", "سُجل تعثر في إحدى المنصات أو التقارير المختارة. قد تستمر بقية المنصات بصورة طبيعية. راجع حالة المنصة أو تواصل مع الدعم، دون إعادة السحب بشكل متكرر."],
  unknown: [null, "لا يمكن تأكيد حالة المعالجة الآن", "لا تتوفر بيانات كافية لتحديد المرحلة بدقة. أعد تحديث الصفحة لاحقًا؛ لم نبدأ أي عملية جديدة."],
};

export function deriveReportProgress(input: {
  clientId: number;
  platforms: ProgressPlatform[];
  reports: ProgressReport[];
  hasPendingAnalysis: boolean;
  nextReportAt?: string | null;
  readError?: boolean;
  now?: number;
}): ReportProgress {
  const now = input.now ?? Date.now();
  const next = Date.parse(input.nextReportAt || "");
  const nextReportAt = Number.isFinite(next) ? new Date(next).toISOString() : null;
  const nextReportDue = nextReportAt !== null && next <= now;
  const result = (stage: ProcessingStage): ReportProgress => ({
    stage, step: messages[stage][0], title: messages[stage][1], description: messages[stage][2],
    nextReportAt, nextReportDue,
    shouldRefresh: ["queued", "collecting", "analyzing", "awaiting_report", "reporting"].includes(stage),
  });
  if (input.readError || !input.platforms.length) return result("unknown");
  const statuses = input.platforms.map(p => p.connection_status?.trim().toLowerCase());
  if (input.platforms.some(p => Boolean(p.last_error)) || statuses.some(s => ["error", "failed", "disconnected"].includes(s || ""))) return result("error");
  // These are facts about saved data, not a claim that an AI request is executing now.
  if (input.hasPendingAnalysis) return result("analyzing");
  if (statuses.includes("syncing")) return result("collecting");
  if (statuses.includes("pending")) return result("queued");
  if (statuses.some(s => s !== "connected")) return result("unknown");

  const latest = input.platforms.map(platform => input.reports
    .filter(report => report.client_id === input.clientId && report.platform_id === platform.id &&
      (report.branch_id ?? null) === (platform.branch_id ?? null) &&
      ["weekly", "initial_historical", "initial"].includes(report.report_type))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0]);
  if (latest.some(r => r?.status === "failed")) return result("error");
  if (latest.some(r => r?.status === "processing")) return result("reporting");
  if (latest.some(r => r?.status === "pending")) return result("awaiting_report");
  if (nextReportDue) {
    if (input.platforms.some(p => !(Date.parse(p.last_success_at || "") >= next))) return result("queued");
    return result("awaiting_report");
  }
  if (latest.every(r => r?.status === "completed")) return result("ready");
  if (input.platforms.every(p => Number.isFinite(Date.parse(p.last_success_at || "")))) return result("awaiting_report");
  return result("unknown");
}

// Uses the authenticated session and existing RLS, including completed-only trial reads.
// No service role, n8n call, write, or new RPC is needed to display progress.
export async function loadReportProgress(
  supabase: { from: (table: string) => any },
  input: {
    clientId: number;
    platforms: ProgressPlatform[];
    branchId: number | null;
    platformId: number | null;
    nextReportAt?: string | null;
  }
): Promise<ReportProgress> {
  const platforms = input.platforms.filter(p =>
    (input.platformId === null || p.id === input.platformId) &&
    (input.branchId === null || p.branch_id === null || p.branch_id === input.branchId));
  if (!platforms.length) return deriveReportProgress({ ...input, platforms, reports: [], hasPendingAnalysis: false });
  try {
    const ids = platforms.map(p => p.id);
    const [reports, pending] = await Promise.all([
      supabase.from("reports")
        .select("client_id,platform_id,branch_id,report_type,status,created_at")
        .eq("client_id", input.clientId).in("platform_id", ids)
        .in("report_type", ["initial_historical", "initial", "weekly"])
        .order("created_at", { ascending: false }).limit(1000),
      supabase.from("unified_feedback").select("platform_id")
        .eq("client_id", input.clientId).in("platform_id", ids)
        // unified_feedback left-joins analysis: a newly collected comment can be NULL here.
        .or("analysis_status.is.null,analysis_status.in.(pending,processing)").limit(1),
    ]);
    return deriveReportProgress({ ...input, platforms, reports: reports.data ?? [],
      hasPendingAnalysis: Boolean(pending.data?.length),
      readError: Boolean(reports.error || pending.error || reports.data?.length === 1000) });
  } catch {
    return deriveReportProgress({ ...input, platforms, reports: [], hasPendingAnalysis: false, readError: true });
  }
}
