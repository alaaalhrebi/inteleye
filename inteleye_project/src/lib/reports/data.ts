import type {
  BranchOption,
  JsonRecord,
  PlatformOption,
  ReportListItem,
  ReportsSnapshot,
  ReportStatus,
} from "@/lib/reports/types";

type SupabaseClientLike = {
  from: (table: string) => any;
};

function objectValue(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizedStatus(value: unknown): ReportStatus {
  const status = stringValue(value);
  if (
    status === "queued" ||
    status === "pending" ||
    status === "processing" ||
    status === "completed" ||
    status === "no_data" ||
    status === "failed"
  ) {
    return status;
  }
  return "pending";
}

function titleForReport(report: Record<string, unknown>) {
  const aiSummary = objectValue(report.ai_summary);
  return (
    stringValue(aiSummary?.report_title) ||
    stringValue(aiSummary?.title) ||
    "تقرير أداء السمعة"
  );
}

export async function loadReportsSnapshot(
  supabase: SupabaseClientLike,
  clientId: number
): Promise<ReportsSnapshot> {
  const [reportsResult, requestsResult, branchesResult, platformsResult] =
    await Promise.all([
      supabase
        .from("reports")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false }),
      supabase
        .from("report_requests")
        .select(
          "id, branch_id, platform_id, period_start, period_end, status, created_at, updated_at"
        )
        .eq("client_id", clientId)
        .order("created_at", { ascending: false }),
      supabase
        .from("branches")
        .select("id, name")
        .eq("client_id", clientId)
        .order("name"),
      supabase
        .from("client_platforms")
        .select("id, branch_id, platform_name")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
    ]);

  const firstError = [
    reportsResult.error,
    requestsResult.error,
    branchesResult.error,
    platformsResult.error,
  ].find(Boolean);

  if (firstError) {
    throw new Error("REPORTS_DATA_UNAVAILABLE");
  }

  const branches: BranchOption[] = (branchesResult.data ?? []).map(
    (branch: Record<string, unknown>) => ({
      id: Number(branch.id),
      name: stringValue(branch.name) || "فرع بدون اسم",
    })
  );
  const platforms: PlatformOption[] = (platformsResult.data ?? []).map(
    (platform: Record<string, unknown>) => ({
      id: Number(platform.id),
      branchId:
        typeof platform.branch_id === "number" ? platform.branch_id : null,
      name: stringValue(platform.platform_name) || "منصة",
    })
  );

  const branchNames = new Map(branches.map((branch) => [branch.id, branch.name]));
  const platformNames = new Map(
    platforms.map((platform) => [platform.id, platform.name])
  );
  const coveredRequestIds = new Set<string>();

  const reports: ReportListItem[] = (reportsResult.data ?? []).map(
    (raw: Record<string, unknown>) => {
      const requestId = stringValue(raw.request_id);
      if (requestId) coveredRequestIds.add(requestId);
      const branchId = typeof raw.branch_id === "number" ? raw.branch_id : null;
      const platformId =
        typeof raw.platform_id === "number" ? raw.platform_id : null;
      const storedPlatforms = Array.isArray(raw.platforms)
        ? raw.platforms.filter(
            (value): value is string => typeof value === "string" && Boolean(value)
          )
        : [];

      return {
        key: `report-${String(raw.id)}`,
        reportId: Number(raw.id),
        requestId,
        title: titleForReport(raw),
        reportType: stringValue(raw.report_type) || "custom",
        branchId,
        branchName: branchId ? branchNames.get(branchId) || "فرع" : "كل الفروع",
        platformId,
        platformName: platformId
          ? platformNames.get(platformId) || "منصة"
          : storedPlatforms[0] || "كل المنصات",
        periodStart: stringValue(raw.period_start),
        periodEnd: stringValue(raw.period_end),
        createdAt: stringValue(raw.created_at) || new Date(0).toISOString(),
        updatedAt: stringValue(raw.updated_at),
        status: normalizedStatus(raw.status),
        totalFeedback: numberValue(raw.total_feedback),
        stats: objectValue(raw.stats),
        aiSummary: objectValue(raw.ai_summary),
      };
    }
  );

  for (const raw of requestsResult.data ?? []) {
    const requestId = String(raw.id);
    if (coveredRequestIds.has(requestId)) continue;
    const branchId = typeof raw.branch_id === "number" ? raw.branch_id : null;
    const platformId =
      typeof raw.platform_id === "number" ? raw.platform_id : null;

    reports.push({
      key: `request-${requestId}`,
      reportId: null,
      requestId,
      title: "تقرير مخصص قيد الإنشاء",
      reportType: "custom",
      branchId,
      branchName: branchId ? branchNames.get(branchId) || "فرع" : "فرع",
      platformId,
      platformName: platformId
        ? platformNames.get(platformId) || "منصة"
        : "منصة",
      periodStart: stringValue(raw.period_start),
      periodEnd: stringValue(raw.period_end),
      createdAt: stringValue(raw.created_at) || new Date(0).toISOString(),
      updatedAt: stringValue(raw.updated_at),
      status: normalizedStatus(raw.status),
      totalFeedback: 0,
      stats: null,
      aiSummary: null,
    });
  }

  reports.sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );

  return { reports, branches, platforms };
}
