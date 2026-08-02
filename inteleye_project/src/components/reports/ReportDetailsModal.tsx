"use client";

import { BarChart3, CheckCircle2, MessageSquareText, X } from "lucide-react";

import type { JsonRecord, ReportListItem } from "@/lib/reports/types";

const LABELS: Record<string, string> = {
  executive_summary: "الملخص التنفيذي",
  summary: "الملخص",
  sentiment_summary: "ملخص الانطباعات",
  sentiment: "الانطباع العام",
  top_strengths: "أبرز نقاط القوة",
  top_issues: "أبرز الملاحظات",
  recommendations: "التوصيات",
  action_plan: "خطة العمل",
  conclusion: "الخلاصة",
  customer_needs: "احتياجات العملاء",
  sales_opportunities: "فرص المبيعات",
  urgent_cases_summary: "الحالات العاجلة",
  average_rating: "متوسط التقييم",
  google_rating: "تقييم Google",
  positive_count: "الإيجابي",
  neutral_count: "المحايد",
  negative_count: "السلبي",
  complaints_count: "الشكاوى",
  needs_reply_count: "يحتاج ردًا",
  sales_opportunities_count: "فرص المبيعات",
  urgent_cases_count: "الحالات العاجلة",
  total_feedback: "إجمالي التعليقات",
};

const SUMMARY_KEYS = [
  "executive_summary",
  "summary",
  "sentiment_summary",
  "sentiment",
  "top_strengths",
  "top_issues",
  "recommendations",
  "action_plan",
  "customer_needs",
  "sales_opportunities",
  "urgent_cases_summary",
  "conclusion",
];

const STAT_KEYS = [
  "total_feedback",
  "average_rating",
  "google_rating",
  "positive_count",
  "neutral_count",
  "negative_count",
  "complaints_count",
  "needs_reply_count",
  "sales_opportunities_count",
  "urgent_cases_count",
];

export default function ReportDetailsModal({
  report,
  onClose,
}: {
  report: ReportListItem;
  onClose: () => void;
}) {
  const summaryEntries = entriesFor(
    { ...(report.stats ?? {}), ...(report.aiSummary ?? {}) },
    SUMMARY_KEYS
  );
  const statEntries = entriesFor(report.stats, STAT_KEYS);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#16172E]/55 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-details-title"
      dir="rtl"
    >
      <article className="max-h-[95vh] w-full overflow-y-auto rounded-t-[2rem] bg-[#F8F7F3] p-5 shadow-2xl sm:max-w-4xl sm:rounded-[2rem] sm:p-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[#895159]">
              {formatType(report.reportType)} · {report.branchName}
            </p>
            <h2
              id="report-details-title"
              className="mt-1 text-2xl font-extrabold text-[#374375]"
            >
              {report.title}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {formatDate(report.periodStart)} — {formatDate(report.periodEnd)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50"
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </header>

        {statEntries.length ? (
          <section className="mt-7">
            <div className="mb-3 flex items-center gap-2 font-extrabold text-[#374375]">
              <BarChart3 size={20} />
              مؤشرات التقرير
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {statEntries.map(([key, value]) => (
                <div key={key} className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold text-gray-500">{label(key)}</p>
                  <p className="mt-2 text-2xl font-extrabold text-[#374375]">
                    {scalar(value)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-7 space-y-4">
          <div className="flex items-center gap-2 font-extrabold text-[#374375]">
            <MessageSquareText size={20} />
            التحليل والنتائج
          </div>
          {summaryEntries.length ? (
            summaryEntries.map(([key, value]) => (
              <div key={key} className="rounded-3xl bg-white p-5 shadow-sm">
                <h3 className="flex items-center gap-2 font-extrabold text-[#374375]">
                  <CheckCircle2 size={18} className="text-[#895159]" />
                  {label(key)}
                </h3>
                <div className="mt-3 leading-8 text-gray-600">
                  <SafeValue value={value} />
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl bg-white p-8 text-center text-gray-500">
              لا توجد تفاصيل تحليلية إضافية محفوظة لهذا التقرير.
            </div>
          )}
        </section>
      </article>
    </div>
  );
}

function entriesFor(record: JsonRecord | null, keys: string[]) {
  if (!record) return [];
  return keys
    .filter((key) => hasVisibleValue(record[key]))
    .map((key) => [key, record[key]] as const);
}

function hasVisibleValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function SafeValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    return (
      <ul className="space-y-2">
        {value.map((item, index) => (
          <li key={index} className="flex gap-2">
            <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#895159]" />
            <span>{typeof item === "object" ? readableObject(item) : scalar(item)}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (value && typeof value === "object") {
    return (
      <dl className="grid gap-3 sm:grid-cols-2">
        {Object.entries(value as Record<string, unknown>).map(([key, item]) => (
          <div key={key} className="rounded-2xl bg-[#F8F7F3] p-3">
            <dt className="text-xs font-bold text-gray-500">{label(key)}</dt>
            <dd className="mt-1 text-[#374375]">{scalar(item)}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return <p>{scalar(value)}</p>;
}

function readableObject(value: unknown) {
  if (!value || typeof value !== "object") return scalar(value);
  return Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => `${label(key)}: ${scalar(item)}`)
    .join(" — ");
}

function scalar(value: unknown) {
  if (typeof value === "number") return new Intl.NumberFormat("ar-SA").format(value);
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (typeof value === "string") return value;
  return "—";
}

function label(key: string) {
  return LABELS[key] || key.replaceAll("_", " ");
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(
    new Date(`${value.slice(0, 10)}T00:00:00Z`)
  );
}

function formatType(type: string) {
  const labels: Record<string, string> = {
    initial: "أولي",
    initial_historical: "تاريخي أولي",
    weekly: "أسبوعي",
    monthly: "شهري",
    custom: "مخصص",
  };
  return labels[type] || "تقرير";
}
