"use client";

import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleCheckBig,
  Lightbulb,
  MinusCircle,
  MessageSquareQuote,
  Sparkles,
  Target,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";

import type { JsonRecord, ReportListItem } from "@/lib/reports/types";

const LABELS: Record<string, string> = {
  executive_summary: "الملخص التنفيذي",
  summary: "الملخص",
  sentiment_summary: "ملخص الانطباعات",
  sentiment: "الانطباع العام",
  top_strengths: "أبرز نقاط القوة",
  top_issues: "أبرز الملاحظات",
  recommendations: "التوصيات",
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

const STAT_KEYS = [
  "total_feedback",
  "average_rating",
  "google_rating",
  "complaints_count",
  "needs_reply_count",
  "sales_opportunities_count",
  "urgent_cases_count",
];

const ADDITIONAL_KEYS = [
  "customer_needs",
  "sales_opportunities",
  "conclusion",
];

type InsightItem = {
  title: string;
  description: string | null;
  count: number | null;
  priority: string | null;
  suggestedAction: string | null;
};

export default function ReportDetailsModal({
  report,
  onClose,
}: {
  report: ReportListItem;
  onClose: () => void;
}) {
  const merged = { ...(report.stats ?? {}), ...(report.aiSummary ?? {}) };
  const statEntries = entriesFor(report.stats, STAT_KEYS);
  const executiveSummary = firstVisibleValue(merged, [
    "executive_summary",
    "summary",
  ]);
  const strengths = insightItems(merged.top_strengths);
  const issues = insightItems(merged.top_issues);
  const recommendations = insightItems(merged.recommendations, true);
  const urgentSummary = merged.urgent_cases_summary;
  const additionalEntries = entriesFor(merged, ADDITIONAL_KEYS);
  const sentimentMetrics = buildSentimentMetrics(report.stats, merged);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#16172E]/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-details-title"
      dir="rtl"
    >
      <article className="max-h-[96vh] w-full overflow-y-auto rounded-t-[2rem] bg-[#F8F7F3] shadow-2xl sm:max-w-5xl sm:rounded-[2rem]">
        <header className="relative overflow-hidden bg-[#374375] p-5 text-white sm:p-8">
          <div className="absolute -left-20 -top-24 h-60 w-60 rounded-full bg-[#BABDE2]/20 blur-3xl" />
          <div className="absolute -bottom-24 right-1/3 h-52 w-52 rounded-full bg-[#DFAEA1]/15 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80">
                <Sparkles size={14} />
                {formatType(report.reportType)} · {report.platformName}
              </div>
              <h2
                id="report-details-title"
                className="mt-4 max-w-3xl text-2xl font-black leading-tight sm:text-3xl"
              >
                {report.title}
              </h2>
              <p className="mt-3 text-sm text-white/65">
                {report.branchName} · {formatDate(report.periodStart)} — {formatDate(report.periodEnd)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/15 bg-white/10 p-2 text-white transition hover:bg-white/20"
              aria-label="إغلاق"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="p-5 sm:p-8">
          {statEntries.length ? (
            <section>
              <SectionHeading
                eyebrow="قراءة سريعة"
                title="مؤشرات التقرير"
                icon={<BarChart3 size={20} />}
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {statEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="rounded-2xl border border-[#BABDE2]/25 bg-white p-4 shadow-sm"
                  >
                    <p className="text-xs font-bold text-gray-500">{label(key)}</p>
                    <p className="mt-2 text-2xl font-black text-[#374375]">
                      {scalar(value)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {sentimentMetrics ? (
            <SentimentMetricsSection metrics={sentimentMetrics} />
          ) : null}

          {hasVisibleValue(executiveSummary) ? (
            <section className="mt-7 rounded-[1.5rem] border border-[#BABDE2]/35 bg-white p-5 shadow-sm sm:p-6">
              <SectionHeading
                eyebrow="الخلاصة"
                title="الملخص التنفيذي"
                icon={<MessageSquareQuote size={20} />}
              />
              <div className="mt-4 text-base leading-8 text-gray-600">
                <SafeValue value={executiveSummary} />
              </div>
            </section>
          ) : null}

          {(strengths.length > 0 || issues.length > 0) && (
            <section className="mt-7 grid gap-6 xl:grid-cols-2">
              <InsightSection
                kind="strength"
                title="أبرز نقاط القوة"
                eyebrow="ما يستحق البناء عليه"
                items={strengths}
              />
              <InsightSection
                kind="issue"
                title="أبرز الملاحظات"
                eyebrow="ما يحتاج إلى تحسين"
                items={issues}
              />
            </section>
          )}

          <UrgentCasesSection report={report} summary={urgentSummary} />

          {recommendations.length > 0 && (
            <RecommendationsSection items={recommendations} />
          )}

          {additionalEntries.length > 0 && (
            <section className="mt-7 rounded-[1.5rem] border border-[#BABDE2]/35 bg-white p-5 shadow-sm sm:p-6">
              <SectionHeading
                eyebrow="تفاصيل داعمة"
                title="تحليلات إضافية"
                icon={<BarChart3 size={20} />}
              />
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {additionalEntries.map(([key, value]) => (
                  <div key={key} className="rounded-2xl bg-[#F8F7F3] p-4">
                    <h3 className="font-extrabold text-[#374375]">
                      {label(key)}
                    </h3>
                    <div className="mt-3 leading-8 text-gray-600">
                      <SafeValue value={value} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </article>
    </div>
  );
}

function SentimentMetricsSection({
  metrics,
}: {
  metrics: Record<
    "positive" | "neutral" | "negative",
    { count: number; percentage: number | null }
  >;
}) {
  const cards = [
    {
      key: "positive" as const,
      label: "إيجابي",
      icon: <ThumbsUp size={21} />,
      card: "border-emerald-100 bg-emerald-50/65",
      iconStyle: "bg-emerald-100 text-emerald-700",
      valueStyle: "text-emerald-800",
    },
    {
      key: "neutral" as const,
      label: "محايد",
      icon: <MinusCircle size={21} />,
      card: "border-[#BABDE2]/45 bg-[#BABDE2]/15",
      iconStyle: "bg-[#BABDE2]/35 text-[#374375]",
      valueStyle: "text-[#374375]",
    },
    {
      key: "negative" as const,
      label: "سلبي",
      icon: <ThumbsDown size={21} />,
      card: "border-red-100 bg-red-50/65",
      iconStyle: "bg-red-100 text-red-700",
      valueStyle: "text-red-800",
    },
  ];

  return (
    <section className="mt-7 rounded-[1.5rem] border border-[#BABDE2]/35 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeading
        eyebrow="نبرة آراء العملاء"
        title="توزيع الانطباعات"
        icon={<MessageSquareQuote size={20} />}
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {cards.map((card) => {
          const metric = metrics[card.key];
          return (
            <article
              key={card.key}
              className={`rounded-2xl border p-4 ${card.card}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.iconStyle}`}
                >
                  {card.icon}
                </span>
                {metric.percentage !== null ? (
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-extrabold text-gray-500">
                    {metric.percentage}%
                  </span>
                ) : null}
              </div>
              <p className="mt-4 text-sm font-bold text-gray-500">{card.label}</p>
              <p className={`mt-1 text-3xl font-black ${card.valueStyle}`}>
                {new Intl.NumberFormat("en-US").format(metric.count)}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  icon,
}: {
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#BABDE2]/25 text-[#374375]">
        {icon}
      </span>
      <div>
        <p className="text-xs font-bold text-gray-400">{eyebrow}</p>
        <h3 className="text-lg font-black text-[#374375] sm:text-xl">{title}</h3>
      </div>
    </div>
  );
}

function InsightSection({
  kind,
  title,
  eyebrow,
  items,
}: {
  kind: "strength" | "issue";
  title: string;
  eyebrow: string;
  items: InsightItem[];
}) {
  const isStrength = kind === "strength";

  return (
    <div className="rounded-[1.5rem] border border-[#BABDE2]/35 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        icon={
          isStrength ? (
            <CircleCheckBig size={20} />
          ) : (
            <Target size={20} />
          )
        }
      />
      {items.length > 0 ? (
        <div className="mt-5 space-y-3">
          {items.map((item, index) => (
            <article
              key={`${item.title}-${index}`}
              className={`rounded-2xl border p-4 ${
                isStrength
                  ? "border-emerald-100 bg-emerald-50/55"
                  : "border-[#DFAEA1]/35 bg-[#DFAEA1]/10"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    isStrength
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-[#DFAEA1]/30 text-[#895159]"
                  }`}
                >
                  {isStrength ? (
                    <CheckCircle2 size={17} />
                  ) : (
                    <AlertTriangle size={17} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-extrabold text-[#374375]">{item.title}</h4>
                    <div className="flex items-center gap-2">
                      {item.priority && !isStrength ? (
                        <PriorityBadge priority={item.priority} />
                      ) : null}
                      {item.count !== null ? (
                        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-gray-500">
                          {formatCount(item.count)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {item.description ? (
                    <p className="mt-2 leading-7 text-gray-600">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl bg-[#F8F7F3] p-6 text-center text-sm font-bold text-gray-500">
          لا توجد عناصر مسجلة في هذا القسم.
        </div>
      )}
    </div>
  );
}

function UrgentCasesSection({
  report,
  summary,
}: {
  report: ReportListItem;
  summary: unknown;
}) {
  const summaryRecord = asRecord(summary);
  const summaryText = textValue(summaryRecord?.summary) || textValue(summary);
  const storedCount = numberOrNull(summaryRecord?.count);
  const statsCount = numberOrNull(report.stats?.urgent_cases_count);
  const urgentCount = Math.max(
    report.urgentCases.length,
    storedCount ?? 0,
    statsCount ?? 0
  );

  if (urgentCount === 0 && !summaryText) return null;

  return (
    <section className="mt-7 overflow-hidden rounded-[1.5rem] border border-red-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-red-100 bg-red-50/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <SectionHeading
          eyebrow="تتطلب انتباهًا فوريًا"
          title="الحالات العاجلة"
          icon={<AlertTriangle size={20} />}
        />
        <span className="w-fit rounded-full bg-red-100 px-3 py-1.5 text-xs font-extrabold text-red-700">
          {urgentCount} {urgentCount === 1 ? "حالة" : "حالات"}
        </span>
      </div>

      <div className="p-5 sm:p-6">
        {summaryText ? (
          <p className="rounded-2xl bg-[#F8F7F3] px-4 py-3 leading-7 text-gray-600">
            {summaryText}
          </p>
        ) : null}

        {report.urgentCases.length > 0 ? (
          <div className="mt-4 space-y-3">
            {report.urgentCases.map((item, index) => (
              <article
                key={item.key}
                className="rounded-2xl border border-red-100 border-r-4 border-r-red-400 bg-red-50/35 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2 font-bold text-gray-500">
                    <span className="text-[#374375]">حالة {index + 1}</span>
                    <span>·</span>
                    <span>{formatPlatform(item.platformName)}</span>
                    {item.publishedAt ? (
                      <>
                        <span>·</span>
                        <span>{formatDateTime(item.publishedAt)}</span>
                      </>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {item.needsReply ? (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800">
                        يحتاج متابعة
                      </span>
                    ) : null}
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-bold text-red-700">
                      {item.severity === "critical" ? "حرجة" : "عاجلة"}
                    </span>
                  </div>
                </div>
                <blockquote className="mt-3 whitespace-pre-line font-bold leading-8 text-[#374375]">
                  “{item.text}”
                </blockquote>
                {item.categories.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.categories.map((category) => (
                      <span
                        key={category}
                        className="rounded-full bg-white px-2.5 py-1 text-[10px] text-gray-500"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            لا تتوفر نصوص الحالات التاريخية لهذا التقرير.
          </p>
        )}
      </div>
    </section>
  );
}

function RecommendationsSection({ items }: { items: InsightItem[] }) {
  return (
    <section className="mt-7 rounded-[1.5rem] border border-[#BABDE2]/35 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeading
        eyebrow="خطوات قابلة للتنفيذ"
        title="التوصيات"
        icon={<Lightbulb size={20} />}
      />
      <div className="mt-5 space-y-4">
        {items.map((item, index) => (
          <article
            key={`${item.title}-${index}`}
            className="grid gap-4 rounded-3xl border border-[#BABDE2]/30 bg-[#F8F7F3] p-4 sm:grid-cols-[48px_1fr] sm:p-5"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#374375] text-lg font-black text-white">
              {index + 1}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-lg font-extrabold text-[#374375]">
                  {item.title}
                </h4>
                {item.priority ? <PriorityBadge priority={item.priority} /> : null}
              </div>
              {item.description ? (
                <p className="mt-2 leading-7 text-gray-600">{item.description}</p>
              ) : null}
              {item.suggestedAction ? (
                <div className="mt-4 rounded-2xl border border-[#BABDE2]/35 bg-white p-4">
                  <p className="text-xs font-bold text-[#895159]">الإجراء المقترح</p>
                  <p className="mt-1 font-bold leading-7 text-[#374375]">
                    {item.suggestedAction}
                  </p>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const value = priority.trim().toLowerCase();
  const style =
    value === "high" || value === "critical"
      ? "bg-red-100 text-red-700"
      : value === "medium"
        ? "bg-amber-100 text-amber-800"
        : "bg-emerald-100 text-emerald-700";

  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${style}`}>
      {priorityLabel(value)}
    </span>
  );
}

function insightItems(value: unknown, recommendations = false): InsightItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): InsightItem | null => {
      if (typeof item === "string" && item.trim()) {
        return {
          title: item.trim(),
          description: null,
          count: null,
          priority: null,
          suggestedAction: null,
        };
      }

      const record = asRecord(item);
      if (!record) return null;
      const title =
        textValue(record.title) ||
        textValue(record.name) ||
        textValue(record.label) ||
        (recommendations ? textValue(record.action) : null);
      if (!title) return null;

      return {
        title,
        description:
          textValue(record.description) ||
          textValue(record.details) ||
          textValue(record.summary),
        count: numberOrNull(record.count),
        priority: textValue(record.priority),
        suggestedAction:
          textValue(record.suggested_action) ||
          (recommendations ? textValue(record.action) : null),
      };
    })
    .filter((item): item is InsightItem => item !== null);
}

function buildSentimentMetrics(stats: JsonRecord | null, merged: JsonRecord) {
  const statsSentiment = asRecord(stats?.sentiment);
  const summarySentiment = asRecord(merged.sentiment_summary);
  const keys = ["positive", "neutral", "negative"] as const;
  const metrics = Object.fromEntries(
    keys.map((key) => {
      const count =
        numberFromValue(statsSentiment?.[key]) ??
        numberFromValue(summarySentiment?.[key]) ??
        numberFromValue(merged[`${key}_count`]) ??
        0;
      const percentage = numberFromValue(
        statsSentiment?.[`${key}_percentage`]
      );
      return [key, { count, percentage }];
    })
  ) as Record<
    "positive" | "neutral" | "negative",
    { count: number; percentage: number | null }
  >;

  const hasSentimentData =
    statsSentiment !== null ||
    summarySentiment !== null ||
    keys.some((key) => merged[`${key}_count`] !== undefined);

  return hasSentimentData ? metrics : null;
}

function entriesFor(record: JsonRecord | null, keys: string[]) {
  if (!record) return [];
  return keys
    .filter((key) => hasVisibleValue(record[key]))
    .map((key) => [key, record[key]] as const);
}

function firstVisibleValue(record: JsonRecord, keys: string[]) {
  for (const key of keys) {
    if (hasVisibleValue(record[key])) return record[key];
  }
  return null;
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
          <div key={key} className="rounded-2xl bg-white p-3">
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
  if (typeof value === "number") return new Intl.NumberFormat("en-US").format(value);
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (typeof value === "string") return value;
  return "—";
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function textValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberOrNull(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function numberFromValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const match = value.replaceAll(",", "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function label(key: string) {
  return LABELS[key] || key.replaceAll("_", " ");
}

function formatCount(count: number) {
  return `${new Intl.NumberFormat("en-US").format(count)} ${count === 1 ? "مرة" : "مرات"}`;
}

function priorityLabel(priority: string) {
  if (priority === "critical") return "حرجة";
  if (priority === "high") return "مرتفعة";
  if (priority === "medium") return "متوسطة";
  if (priority === "low") return "منخفضة";
  return priority;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-SA-u-nu-latn", { dateStyle: "medium" }).format(
    new Date(`${value.slice(0, 10)}T00:00:00Z`)
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
    dateStyle: "medium",
    timeZone: "Asia/Riyadh",
  }).format(new Date(value));
}

function formatPlatform(platform: string) {
  const value = platform.trim().toLowerCase();
  if (value === "google_maps") return "Google Maps";
  if (value === "x") return "X";
  if (value === "tiktok") return "TikTok";
  if (value === "instagram") return "Instagram";
  return platform;
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
