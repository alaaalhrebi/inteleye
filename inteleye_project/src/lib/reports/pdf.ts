import { getReportsAccess } from "@/lib/reports/access";

type SignedReportResult =
  | { ok: true; signedUrl: string }
  | { ok: false; status: number; message: string };

export async function createOwnedReportSignedUrl(
  reportId: string,
  download: boolean
): Promise<SignedReportResult> {
  if (!/^\d+$/.test(reportId)) {
    return { ok: false, status: 404, message: "التقرير غير موجود" };
  }

  const access = await getReportsAccess();
  if (!access.ok) {
    return {
      ok: false,
      status: access.status,
      message: access.status === 401 ? "يجب تسجيل الدخول أولًا" : "غير مصرح",
    };
  }
  const allowed = download
    ? access.permissions.canDownloadReportPdf
    : access.permissions.canViewReportPdf;
  if (!allowed) {
    return {
      ok: false,
      status: 403,
      message: "ملفات PDF متاحة لباقتي Pro وEnterprise فقط",
    };
  }

  const { data: report } = await access.supabase
    .from("reports")
    .select("*")
    .eq("id", Number(reportId))
    .eq("client_id", access.client.id)
    .maybeSingle();

  if (!report) {
    return { ok: false, status: 404, message: "التقرير غير موجود" };
  }
  if (report.status !== "completed") {
    return { ok: false, status: 409, message: "التقرير لم يكتمل بعد" };
  }

  const storagePath =
    typeof (report as Record<string, unknown>).storage_path === "string"
      ? String((report as Record<string, unknown>).storage_path).trim()
      : "";
  const bucket = process.env.SUPABASE_REPORTS_BUCKET?.trim();
  if (!storagePath || !bucket) {
    return {
      ok: false,
      status: 404,
      message: "ملف PDF غير متوفر لهذا التقرير",
    };
  }

  const { data, error } = await access.supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, 60, { download });

  if (error || !data?.signedUrl) {
    return {
      ok: false,
      status: error?.message.toLowerCase().includes("not found") ? 404 : 403,
      message: "تعذر الوصول إلى ملف التقرير",
    };
  }

  return { ok: true, signedUrl: data.signedUrl };
}
