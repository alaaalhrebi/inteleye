import { NextResponse } from "next/server";

import { getReportsAccess } from "@/lib/reports/access";
import { loadReportsSnapshot } from "@/lib/reports/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await getReportsAccess();
  if (!access.ok) {
    return NextResponse.json(
      { message: access.status === 401 ? "يجب تسجيل الدخول أولًا" : "غير مصرح" },
      { status: access.status }
    );
  }
  if (!access.permissions.canViewReports) {
    return NextResponse.json(
      { message: "عرض التقارير متاح ضمن الاشتراكات المدفوعة" },
      { status: 403 }
    );
  }

  try {
    const snapshot = await loadReportsSnapshot(access.supabase, access.client.id);
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { message: "تعذر تحديث قائمة التقارير" },
      { status: 500 }
    );
  }
}
