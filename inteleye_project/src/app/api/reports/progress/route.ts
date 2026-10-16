import { NextResponse } from "next/server";
import { getReportsAccess } from "@/lib/reports/access";
import { loadReportProgress } from "@/lib/reports/progress";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const access = await getReportsAccess().catch(() => null);
  if (!access) return NextResponse.json({ message: "تعذر تحديث حالة المعالجة الآن" }, { status: 503, headers });
  if (!access.ok) return NextResponse.json({ message: "غير مصرح" }, { status: access.status, headers });
  if (!access.permissions.canViewReports) return NextResponse.json({ message: "غير مصرح" }, { status: 403, headers });
  const params = new URL(request.url).searchParams;
  const parse = (key: string) => {
    const value = params.get(key);
    if (value === null) return null;
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error("INVALID_SCOPE");
    return Number(value);
  };
  let branchId: number | null, platformId: number | null;
  try { branchId = parse("branch"); platformId = parse("platform"); }
  catch { return NextResponse.json({ message: "نطاق غير صالح" }, { status: 400, headers }); }
  try {
    if (branchId !== null) {
      const branch = await access.supabase.from("branches").select("id")
        .eq("client_id", access.client.id).eq("id", branchId).eq("status", "active").limit(1);
      if (branch.error) throw new Error("PROGRESS_UNAVAILABLE");
      if (!branch.data?.length) return NextResponse.json({ message: "فرع غير متاح" }, { status: 404, headers });
    }
    // Match the dashboard's trial/platform scope. Never accept a client ID from the URL.
    let query = access.supabase.from("client_platforms")
      .select("id,branch_id,connection_status,last_error,last_success_at")
      .eq("client_id", access.client.id).eq("is_active", true).order("id");
    if (access.permissions.isTrialActive) query = query.limit(1);
    const { data, error } = await query;
    if (error) throw new Error("PROGRESS_UNAVAILABLE");
    const platforms = (data ?? []).filter(p =>
      (platformId === null || p.id === platformId) &&
      (branchId === null || p.branch_id === null || p.branch_id === branchId));
    if (!platforms.length) return NextResponse.json({ message: "لا توجد منصة متاحة في هذا النطاق" }, { status: 404, headers });
    const progress = await loadReportProgress(access.supabase, {
      clientId: access.client.id, platforms, branchId, platformId, nextReportAt: access.client.next_report_at,
    });
    return NextResponse.json(progress, { headers });
  } catch {
    return NextResponse.json({ message: "تعذر تحديث حالة المعالجة الآن" }, { status: 503, headers });
  }
}
