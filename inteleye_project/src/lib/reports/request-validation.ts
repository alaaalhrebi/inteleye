import type { ReportRequestPayload } from "@/lib/reports/types";

export type RequestValidationResult =
  | { ok: true; value: ReportRequestPayload }
  | { ok: false; status: number; message: string };

function dateOnly(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function positiveInteger(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export function validateReportRequest(
  body: Record<string, unknown>,
  now = new Date()
): RequestValidationResult {
  const branchId = positiveInteger(body.branchId);
  const platformIds = Array.isArray(body.platformIds)
    ? body.platformIds.map(positiveInteger)
    : [];
  const reportType = body.reportType;
  const reportName =
    typeof body.reportName === "string" ? body.reportName.trim() : "";
  const periodStart = dateOnly(body.periodStart);
  const periodEnd = dateOnly(body.periodEnd);

  if (!branchId) {
    return { ok: false, status: 400, message: "اختر فرعًا صحيحًا" };
  }
  if (platformIds.length !== 1 || platformIds[0] === null) {
    return {
      ok: false,
      status: 422,
      message: "خدمة التقرير الحالية تدعم منصة واحدة فقط لكل طلب",
    };
  }
  if (reportType !== "custom") {
    return {
      ok: false,
      status: 422,
      message: "المقارنة بين الفترات غير مدعومة في خدمة التقارير الحالية",
    };
  }
  if (reportName) {
    return {
      ok: false,
      status: 422,
      message: "اسم التقرير غير مدعوم حاليًا ولن يتم تجاهله أو إرساله للخدمة",
    };
  }
  if (!periodStart || !periodEnd) {
    return { ok: false, status: 400, message: "أدخل فترة زمنية صحيحة" };
  }
  if (periodStart.getTime() > periodEnd.getTime()) {
    return {
      ok: false,
      status: 400,
      message: "تاريخ البداية يجب أن يسبق تاريخ النهاية",
    };
  }

  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  if (periodStart > today || periodEnd > today) {
    return {
      ok: false,
      status: 400,
      message: "لا يمكن اختيار تاريخ مستقبلي",
    };
  }

  const latestAllowedEnd = new Date(
    Date.UTC(
      periodStart.getUTCFullYear() + 1,
      periodStart.getUTCMonth(),
      periodStart.getUTCDate()
    )
  );
  if (periodEnd > latestAllowedEnd) {
    return {
      ok: false,
      status: 400,
      message: "يجب ألا تتجاوز فترة التقرير سنة واحدة",
    };
  }

  return {
    ok: true,
    value: {
      branchId,
      platformIds: [platformIds[0] as number],
      reportType: "custom",
      periodStart: body.periodStart as string,
      periodEnd: body.periodEnd as string,
    },
  };
}
