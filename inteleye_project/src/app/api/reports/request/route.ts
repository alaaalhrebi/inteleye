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
  const [
    { data: branch, error: branchError },
    { data: platform, error: platformError },
  ] = await Promise.all([
    access.supabase
      .from("branches")
      .select("id")
      .eq("id", validation.value.branchId)
      .eq("client_id", access.client.id)
      .eq("is_active", true)
      .maybeSingle(),
    access.supabase
      .from("client_platforms")
      .select("id, branch_id")
      .eq("id", platformId)
      .eq("client_id", access.client.id)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  if (branchError || !branch) {
    return NextResponse.json(
      { message: "الفرع المحدد غير موجود أو لا ينتمي إلى حسابك" },
      { status: 403 }
    );
  }

  if (platformError || !platform) {
    return NextResponse.json(
      { message: "المنصة المحددة غير موجودة أو غير مفعلة" },
      { status: 403 }
    );
  }

  const platformBranchId =
    platform.branch_id === null || platform.branch_id === undefined
      ? null
      : Number(platform.branch_id);

  const isGlobalPlatform = platformBranchId === null;
  const platformMatchesBranch =
    isGlobalPlatform || platformBranchId === validation.value.branchId;

  if (!platformMatchesBranch) {
    return NextResponse.json(
      { message: "المنصة المحددة مرتبطة بفرع آخر" },
      { status: 403 }
    );
  }

  const workflowBranchId = isGlobalPlatform
    ? null
    : validation.value.branchId;

  try {
    const workflow = await requestReportFromWorkflow({
      ...validation.value,
      branchId: workflowBranchId,
      clientId: access.client.id,
      requestedBy: access.user.id,
    });

    return NextResponse.json(
      {
        request_id: workflow.requestId,
        status: workflow.status,
        branch_id: workflowBranchId,
        platform_id: platformId,
        platform_scope: isGlobalPlatform ? "global" : "branch",
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
