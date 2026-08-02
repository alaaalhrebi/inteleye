import { NextResponse } from "next/server";

import { getReportsAccess } from "@/lib/reports/access";
import {
  ReportWorkflowError,
  requestReportFromWorkflow,
} from "@/lib/reports/n8n";
import { validateReportRequest } from "@/lib/reports/request-validation";

export async function POST(request: Request) {
  const access = await getReportsAccess();
  if (!access.ok) {
    return NextResponse.json(
      { message: access.status === 401 ? "يجب تسجيل الدخول أولًا" : "غير مصرح" },
      { status: access.status }
    );
  }
  if (!access.permissions.canCreateCustomReport) {
    return NextResponse.json(
      { message: "إنشاء التقارير المخصصة متاح لباقتي Pro وEnterprise فقط" },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "بيانات الطلب غير صالحة" }, { status: 400 });
  }

  const validation = validateReportRequest(body);
  if (!validation.ok) {
    return NextResponse.json(
      { message: validation.message },
      { status: validation.status }
    );
  }

  const platformId = validation.value.platformIds[0];
  const [{ data: branch }, { data: platform }] = await Promise.all([
    access.supabase
      .from("branches")
      .select("id")
      .eq("id", validation.value.branchId)
      .eq("client_id", access.client.id)
      .maybeSingle(),
    access.supabase
      .from("client_platforms")
      .select("id")
      .eq("id", platformId)
      .eq("client_id", access.client.id)
      .eq("branch_id", validation.value.branchId)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  if (!branch || !platform) {
    return NextResponse.json(
      { message: "الفرع أو المنصة لا ينتميان إلى حسابك أو غير مرتبطين معًا" },
      { status: 403 }
    );
  }

  try {
    const workflow = await requestReportFromWorkflow({
      ...validation.value,
      clientId: access.client.id,
      requestedBy: access.user.id,
    });

    return NextResponse.json(
      {
        request_id: workflow.requestId,
        status: workflow.status,
        message: "تم استلام طلب التقرير وبدأت معالجته.",
      },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof ReportWorkflowError) {
      console.error("Report workflow request failed", {
        code: error.code,
        status: error.status,
      });
      return NextResponse.json(
        { message: error.message, code: error.code },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { message: "تعذر إنشاء طلب التقرير" },
      { status: 500 }
    );
  }
}
