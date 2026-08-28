"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  FileText,
  FilterX,
  Hash,
  MessageCircle,
  Quote,
  ShieldAlert,
  Sparkles,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { DashboardFeedbackRow } from "@/lib/dashboard-analytics";

type SentimentFilter = "all" | "positive" | "negative" | "neutral";
type KnownSentiment = Exclude<SentimentFilter, "all">;

type InteractiveDashboardProps = {
  clientName: string;
  feedback: DashboardFeedbackRow[];
  comparisonFeedback: DashboardFeedbackRow[];
  selectedPlatformName: string | null;
  activePlatforms: string[];
  branchNames: Record<string, string>;
  periodStart: string;
  periodEnd: string;
  hasError: boolean;
  priorityContent?: ReactNode;
};

type Snapshot = {
  total: number;
  averageRating: number | null;
  positivePct: number;
  complaints: number;
  urgent: number;
  needsAttention: number;
  fiveStarPct: number;
  topicCount: number;
};

type Kpi = {
  title: string;
  value: string | number;
  previous: number | null;
  current: number | null;
  suffix?: string;
  detail?: string;
  icon: ReactNode;
  tone?: "primary" | "good" | "warn" | "accent";
  lowerIsBetter?: boolean;
};

type ExecutiveIntelligenceValue = {
  summary: string;
  direction: string;
  strength: string;
  issue: string;
  emerging: string;
  priority: string;
  improving: boolean;
};

export default function InteractiveDashboard({
  clientName,
  feedback,
  comparisonFeedback,
  selectedPlatformName,
  activePlatforms,
  branchNames,
  periodStart,
  periodEnd,
  hasError,
  priorityContent,
}: InteractiveDashboardProps) {
  const [sentimentFilter, setSentimentFilter] =
    useState<SentimentFilter>("all");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  const platformKey = normalizePlatform(selectedPlatformName);
  const profile = getPlatformProfile(platformKey);
  const current = useMemo(() => buildSnapshot(feedback), [feedback]);
  const previous = useMemo(
    () => buildSnapshot(comparisonFeedback),
    [comparisonFeedback]
  );
  const topics = useMemo(() => buildTopics(feedback), [feedback]);
  const activity = useMemo(
    () => buildActivity(feedback, periodStart, periodEnd),
    [feedback, periodStart, periodEnd]
  );
  const sentiment = useMemo(() => buildSentiment(feedback), [feedback]);
  const ratingDistribution = useMemo(
    () => buildRatingDistribution(feedback),
    [feedback]
  );
  const platformBreakdown = useMemo(
    () => buildPlatformBreakdown(feedback),
    [feedback]
  );
  const executive = useMemo(
    () =>
      buildExecutiveIntelligence(
        feedback,
        comparisonFeedback,
        current,
        previous,
        periodEnd
      ),
    [comparisonFeedback, current, feedback, periodEnd, previous]
  );
  const activityInsight = useMemo(
    () => buildActivityInsight(activity, feedback, selectedPlatformName),
    [activity, feedback, selectedPlatformName]
  );
  const advancedSignals = useMemo(
    () => ({
      emerging: executive.emerging,
      opportunities: feedback.filter(
        (row) => row.is_sales_opportunity === true
      ).length,
      reputationRisks: feedback.filter((row) => {
        const severity = row.severity?.trim().toLowerCase();
        return severity === "critical" || severity === "high";
      }).length,
    }),
    [executive.emerging, feedback]
  );

  const samples = useMemo(() => {
    return feedback
      .filter((row) => Boolean(row.feedback_text?.trim()))
      .filter(
        (row) =>
          sentimentFilter === "all" ||
          normalizeSentiment(row.sentiment) === sentimentFilter
      )
      .filter((row) => !selectedDay || dateKey(row.published_at) === selectedDay)
      .filter(
        (row) =>
          !selectedTopic ||
          (row.category ?? []).some(
            (category) => category.trim() === selectedTopic
          )
      )
      .filter(
        (row) =>
          selectedRating === null || Number(row.rating) === selectedRating
      )
      .slice(0, 6);
  }, [feedback, selectedDay, selectedRating, selectedTopic, sentimentFilter]);

  const hasInteractiveFilter =
    sentimentFilter !== "all" ||
    selectedDay !== null ||
    selectedTopic !== null ||
    selectedRating !== null;

  const resetInteractiveFilters = () => {
    setSentimentFilter("all");
    setSelectedDay(null);
    setSelectedTopic(null);
    setSelectedRating(null);
  };

  const kpis = buildKpis(platformKey, current, previous, activePlatforms.length);

  return (
    <>
      <section className="relative overflow-hidden rounded-[1.35rem] border border-[#374375]/10 bg-[#374375] p-5 text-white shadow-sm sm:rounded-[1.6rem] sm:p-6">
        <div className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-[#BABDE2]/20 blur-3xl" />
        <div className="absolute -bottom-24 right-1/3 h-52 w-52 rounded-full bg-[#DFAEA1]/15 blur-3xl" />
        <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-bold text-[#F8F7F3]">
              <Sparkles size={14} />
              {profile.eyebrow}
            </div>
            <h2 className="max-w-4xl text-2xl font-black leading-tight sm:text-3xl">
              نظرة عامة على تجربة العملاء
            </h2>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-white/80 sm:text-base">
              {executive.summary}
            </p>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-white/65">
              {clientName} · {profile.description}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center sm:flex">
            <HeroBadge
              value={current.total}
              label={profile.volumeLabel}
            />
            <HeroBadge
              value={current.urgent}
              label="تحتاج تدخلاً"
              alert={current.urgent > 0}
            />
          </div>
        </div>
      </section>

      <PeriodSummary
        start={periodStart}
        end={periodEnd}
        hasError={hasError}
        platformName={selectedPlatformName}
      />

      <ExecutiveIntelligence intelligence={executive} />

      <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <MetricCard key={kpi.title} {...kpi} />
        ))}
      </section>

      {priorityContent}

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
        <DashboardPanel
          eyebrow="حركة التفاعل"
          title={`النشاط اليومي — ${profile.volumeLabel}`}
          icon={<Activity size={21} />}
        >
          <ActivityChart
            points={activity}
            selectedDay={selectedDay}
            onSelectDay={(day) =>
              setSelectedDay((currentDay) =>
                currentDay === day ? null : day
              )
            }
            insight={activityInsight}
          />
        </DashboardPanel>

        <DashboardPanel
          eyebrow="صوت العملاء"
          title="توزيع المشاعر"
          icon={<MessageCircle size={21} />}
        >
          <SentimentChart
            counts={sentiment}
            selected={sentimentFilter}
            onSelect={setSentimentFilter}
          />
        </DashboardPanel>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <PlatformContextPanel
          platformKey={platformKey}
          feedback={feedback}
          breakdown={platformBreakdown}
          ratingDistribution={ratingDistribution}
          selectedRating={selectedRating}
          onSelectRating={(rating) =>
            setSelectedRating((currentRating) =>
              currentRating === rating ? null : rating
            )
          }
        />

        <DashboardPanel
          eyebrow="محاور الحديث"
          title="الموضوعات الأكثر حضورًا"
          icon={<Hash size={21} />}
        >
          <TopicsChart
            topics={topics}
            selectedTopic={selectedTopic}
            onSelectTopic={(topic) =>
              setSelectedTopic((currentTopic) =>
                currentTopic === topic ? null : topic
              )
            }
          />
        </DashboardPanel>
      </section>

      <AdvancedSignals {...advancedSignals} />

      <section className="mt-4 rounded-[1.35rem] border border-[#BABDE2]/40 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#DFAEA1]/25 text-[#895159]">
              <Quote size={21} />
            </div>
            <div>
              <p className="text-sm text-gray-500">عينات حقيقية من البيانات</p>
              <h2 className="text-lg font-extrabold text-[#374375] sm:text-xl">
                ماذا يقول عملاؤك؟
              </h2>
            </div>
          </div>
          {hasInteractiveFilter && (
            <button
              type="button"
              onClick={resetInteractiveFilters}
              className="no-print inline-flex items-center justify-center gap-2 rounded-full border border-[#BABDE2]/60 px-4 py-2 text-sm font-bold text-[#374375] transition hover:bg-[#F8F7F3]"
            >
              <FilterX size={15} />
              مسح التصفية التفاعلية
            </button>
          )}
        </div>

        <SentimentTabs
          counts={sentiment}
          selected={sentimentFilter}
          onSelect={setSentimentFilter}
        />

        <ActiveFilterSummary
          selectedDay={selectedDay}
          selectedTopic={selectedTopic}
          selectedRating={selectedRating}
        />

        {samples.length === 0 ? (
          <div className="mt-5 rounded-3xl bg-[#F8F7F3] p-10 text-center">
            <p className="font-extrabold text-[#374375]">
              لا توجد تعليقات تطابق التصفية الحالية
            </p>
            <p className="mt-2 text-sm text-gray-500">
              جرّب اختيار شعور أو يوم أو موضوع آخر.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {samples.map((row) => (
              <FeedbackSampleCard
                key={`${row.source_table ?? "feedback"}-${row.source_record_id}`}
                row={row}
                branchName={
                  row.branch_id === null
                    ? "على مستوى المنشأة"
                    : branchNames[String(row.branch_id)] ?? "فرع غير مسمى"
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="no-print mt-4 flex flex-col gap-4 rounded-[1.35rem] border border-[#BABDE2]/45 bg-[#374375] p-5 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#DFAEA1]">
            <FileText size={21} />
          </div>
          <div>
            <h2 className="font-extrabold">التقارير</h2>
            <p className="mt-1 text-sm text-white/70">
              لمشاهدة التقارير الكاملة والمخصصة انتقل إلى صفحة إدارة التقارير.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/reports"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-[#374375] transition hover:bg-[#F8F7F3]"
        >
          إدارة التقارير
        </Link>
      </section>
    </>
  );
}

function HeroBadge({
  value,
  label,
  alert = false,
}: {
  value: number;
  label: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`min-w-28 rounded-2xl border px-4 py-3 backdrop-blur-sm ${
        alert
          ? "border-[#DFAEA1]/35 bg-[#DFAEA1]/15"
          : "border-white/10 bg-white/10"
      }`}
    >
      <p className="text-2xl font-black">{formatNumber(value)}</p>
      <p className="mt-1 text-[11px] text-white/65">{label}</p>
    </div>
  );
}

function PeriodSummary({
  start,
  end,
  hasError,
  platformName,
}: {
  start: string;
  end: string;
  hasError: boolean;
  platformName: string | null;
}) {
  const formatter = new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div
      className={`mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-sm font-bold leading-7 ${
        hasError
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-[#BABDE2]/35 bg-white text-gray-500"
      }`}
    >
      <span>
        {hasError
          ? "تعذر تحميل بعض أقسام اللوحة، وستبقى البيانات المتاحة ظاهرة."
          : `البيانات من ${formatter.format(new Date(start))} إلى ${formatter.format(
              new Date(end)
            )}.`}
      </span>
      <span className="rounded-full bg-[#BABDE2]/20 px-3 py-1 text-sm text-[#374375]">
        {platformName ? formatPlatform(platformName) : "جميع المنصات"}
      </span>
    </div>
  );
}

function ExecutiveIntelligence({
  intelligence,
}: {
  intelligence: ExecutiveIntelligenceValue;
}) {
  const items = [
    {
      label: "الاتجاه العام",
      value: intelligence.direction,
      icon: intelligence.improving ? <TrendingUp size={18} /> : <TrendingDown size={18} />,
      className: intelligence.improving
        ? "bg-emerald-50 text-emerald-700"
        : "bg-[#DFAEA1]/20 text-[#895159]",
    },
    {
      label: "أكبر نقطة قوة",
      value: intelligence.strength,
      icon: <Sparkles size={18} />,
      className: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "أكبر مشكلة",
      value: intelligence.issue,
      icon: <ShieldAlert size={18} />,
      className: "bg-[#DFAEA1]/20 text-[#895159]",
    },
    {
      label: "إشارة ناشئة",
      value: intelligence.emerging,
      icon: <Activity size={18} />,
      className: "bg-amber-50 text-amber-800",
    },
    {
      label: "أولوية اليوم",
      value: intelligence.priority,
      icon: <Target size={18} />,
      className: "bg-[#BABDE2]/25 text-[#374375]",
    },
  ];

  return (
    <section className="mt-4 rounded-[1.35rem] border border-[#BABDE2]/40 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-base font-extrabold text-[#895159] sm:text-lg">
          خلاصة IntelEye
        </p>
        <span className="rounded-full bg-[#374375] px-3 py-1 text-xs font-bold text-white">
          قراءة آلية من البيانات الحالية
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl bg-[#F8F7F3] p-3">
            <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${item.className}`}>
              {item.icon}
            </div>
            <p className="text-xs text-gray-500">{item.label}</p>
            <p className="mt-1 line-clamp-2 text-sm font-extrabold leading-6 text-[#374375]">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AdvancedSignals({
  emerging,
  opportunities,
  reputationRisks,
}: {
  emerging: string;
  opportunities: number;
  reputationRisks: number;
}) {
  const items = [
    {
      title: "إشارات ناشئة",
      value: emerging,
      icon: <Activity size={19} />,
      className: "bg-amber-50 text-amber-800",
    },
    {
      title: "فرص مكتشفة",
      value:
        opportunities > 0
          ? `${formatNumber(opportunities)} تعليقًا يحمل نية شراء أو فرصة متابعة.`
          : "لا توجد فرص شراء واضحة في الفترة الحالية.",
      icon: <Target size={19} />,
      className: "bg-emerald-50 text-emerald-700",
    },
    {
      title: "مخاطر السمعة",
      value:
        reputationRisks > 0
          ? `${formatNumber(reputationRisks)} حالة عالية الأولوية تحتاج مراجعة.`
          : "لا توجد مخاطر سمعة عالية في الفترة الحالية.",
      icon: <ShieldAlert size={19} />,
      className: "bg-[#DFAEA1]/20 text-[#895159]",
    },
  ];

  return (
    <section className="mt-4 grid gap-3 lg:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.title}
          className="rounded-[1.2rem] border border-[#BABDE2]/35 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${item.className}`}
            >
              {item.icon}
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#374375]">
                {item.title}
              </h3>
              <p className="mt-1.5 text-sm font-medium leading-6 text-gray-500">
                {item.value}
              </p>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function MetricCard({
  title,
  value,
  previous,
  current,
  suffix,
  detail,
  icon,
  tone = "primary",
  lowerIsBetter = false,
}: Kpi) {
  const toneClasses = {
    primary: "bg-[#BABDE2]/30 text-[#374375]",
    good: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    accent: "bg-[#DFAEA1]/25 text-[#895159]",
  };

  return (
    <article className="group rounded-[1.2rem] border border-[#BABDE2]/30 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClasses[tone]}`}
        >
          {icon}
        </div>
        <ChangeBadge
          current={current}
          previous={previous}
          suffix={suffix}
          lowerIsBetter={lowerIsBetter}
        />
      </div>
      <p className="mt-5 text-sm font-semibold text-gray-500">{title}</p>
      <p className="mt-2 text-2xl font-black text-[#374375] sm:text-3xl">
        {value}
      </p>
      {detail ? <p className="mt-1 text-xs font-bold text-gray-500">{detail}</p> : null}
    </article>
  );
}

function ChangeBadge({
  current,
  previous,
  suffix = "",
  lowerIsBetter = false,
}: {
  current: number | null;
  previous: number | null;
  suffix?: string;
  lowerIsBetter?: boolean;
}) {
  if (current === null || previous === null) {
    return <span className="text-xs font-bold text-gray-400">لا توجد مقارنة</span>;
  }

  const difference = round(current - previous, 1);
  const direction = difference > 0 ? "↑" : difference < 0 ? "↓" : "";
  const improved = lowerIsBetter ? difference < 0 : difference > 0;

  return (
    <span
      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-extrabold sm:text-sm ${
        difference === 0
          ? "bg-gray-50 text-gray-400"
          : improved
          ? "bg-emerald-50 text-emerald-700"
          : "bg-[#DFAEA1]/20 text-[#895159]"
      }`}
      title="مقارنة بالفترة السابقة"
    >
      {direction} {formatNumber(Math.abs(difference))}
      {suffix} عن السابقة
    </span>
  );
}

function DashboardPanel({
  eyebrow,
  title,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.5rem] border border-[#BABDE2]/40 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#BABDE2]/30 text-[#374375]">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-gray-500">{eyebrow}</p>
          <h2 className="truncate text-lg font-extrabold text-[#374375] sm:text-xl">
            {title}
          </h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function ActivityChart({
  points,
  selectedDay,
  onSelectDay,
  insight,
}: {
  points: { date: string; label: string; count: number }[];
  selectedDay: string | null;
  onSelectDay: (day: string) => void;
  insight: string | null;
}) {
  const max = Math.max(...points.map((point) => point.count), 1);

  return (
    <div>
      <div className="flex h-56 items-end gap-1.5 rounded-3xl bg-[#F8F7F3] px-3 pb-4 pt-6 sm:gap-2 sm:px-5">
        {points.map((point) => {
          const selected = point.date === selectedDay;
          const height = point.count === 0 ? 4 : Math.max(10, (point.count / max) * 100);

          return (
            <button
              key={point.date}
              type="button"
              onClick={() => onSelectDay(point.date)}
              className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end"
              title={`${point.label}: ${point.count}`}
            >
              <span
                className={`mb-2 text-xs font-extrabold transition ${
                  selected ? "text-[#895159]" : "text-[#374375]"
                }`}
              >
                {point.count}
              </span>
              <span
                className={`w-full max-w-10 rounded-t-xl transition-all duration-300 group-hover:bg-[#895159] ${
                  selected ? "bg-[#895159]" : "bg-[#BABDE2]"
                }`}
                style={{ height: `${height}%` }}
              />
              <span
                className={`mt-2 w-full truncate text-[11px] sm:text-xs ${
                  selected ? "font-bold text-[#895159]" : "text-gray-400"
                }`}
              >
                {point.label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-sm text-gray-500">
        اضغط على أي يوم لعرض التعليقات المسجلة فيه.
      </p>
      {insight ? (
        <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900">
          {insight}
        </p>
      ) : null}
    </div>
  );
}

function SentimentChart({
  counts,
  selected,
  onSelect,
}: {
  counts: Record<KnownSentiment, number>;
  selected: SentimentFilter;
  onSelect: (sentiment: SentimentFilter) => void;
}) {
  const total = counts.positive + counts.negative + counts.neutral;
  const positiveEnd = total > 0 ? (counts.positive / total) * 100 : 0;
  const neutralEnd =
    total > 0 ? positiveEnd + (counts.neutral / total) * 100 : 0;

  return (
    <div className="grid gap-5 sm:grid-cols-[150px_1fr] sm:items-center xl:grid-cols-1 2xl:grid-cols-[150px_1fr]">
      <div className="relative mx-auto h-36 w-36">
        <div
          className="h-full w-full rounded-full"
          style={{
            background:
              total > 0
                ? `conic-gradient(#2f855a 0 ${positiveEnd}%, #BABDE2 ${positiveEnd}% ${neutralEnd}%, #895159 ${neutralEnd}% 100%)`
                : "#F1F0EC",
          }}
        />
        <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white">
          <strong className="text-2xl font-black text-[#374375]">
            {formatNumber(total)}
          </strong>
          <span className="text-xs text-gray-500">مصنّف</span>
        </div>
      </div>
      <div className="space-y-2">
        <SentimentLegendButton
          label="إيجابي"
          count={counts.positive}
          total={total}
          color="bg-emerald-600"
          selected={selected === "positive"}
          onClick={() => onSelect(selected === "positive" ? "all" : "positive")}
        />
        <SentimentLegendButton
          label="محايد"
          count={counts.neutral}
          total={total}
          color="bg-[#BABDE2]"
          selected={selected === "neutral"}
          onClick={() => onSelect(selected === "neutral" ? "all" : "neutral")}
        />
        <SentimentLegendButton
          label="سلبي"
          count={counts.negative}
          total={total}
          color="bg-[#895159]"
          selected={selected === "negative"}
          onClick={() => onSelect(selected === "negative" ? "all" : "negative")}
        />
      </div>
    </div>
  );
}

function SentimentLegendButton({
  label,
  count,
  total,
  color,
  selected,
  onClick,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
        selected
          ? "border-[#374375]/25 bg-[#F8F7F3]"
          : "border-transparent hover:bg-[#F8F7F3]"
      }`}
    >
      <span className="flex items-center gap-2 font-bold text-[#374375]">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        {label}
      </span>
      <span className="text-gray-400">
        {formatNumber(count)} · {total > 0 ? round((count / total) * 100, 1) : 0}%
      </span>
    </button>
  );
}

function PlatformContextPanel({
  platformKey,
  feedback,
  breakdown,
  ratingDistribution,
  selectedRating,
  onSelectRating,
}: {
  platformKey: string;
  feedback: DashboardFeedbackRow[];
  breakdown: ReturnType<typeof buildPlatformBreakdown>;
  ratingDistribution: ReturnType<typeof buildRatingDistribution>;
  selectedRating: number | null;
  onSelectRating: (rating: number) => void;
}) {
  if (platformKey === "google_maps") {
    const max = Math.max(...ratingDistribution.map((item) => item.count), 1);

    return (
      <DashboardPanel
        eyebrow="Google Maps"
        title="توزيع التقييمات بالنجوم"
        icon={<Star size={21} />}
      >
        <div className="space-y-3">
          {ratingDistribution.map((item) => (
            <button
              key={item.rating}
              type="button"
              onClick={() => onSelectRating(item.rating)}
              className={`grid w-full grid-cols-[70px_1fr_38px] items-center gap-3 rounded-xl p-2 text-right transition ${
                selectedRating === item.rating
                  ? "bg-[#DFAEA1]/15"
                  : "hover:bg-[#F8F7F3]"
              }`}
            >
              <span className="flex items-center gap-1 font-extrabold text-[#374375]">
                {item.rating}
                <Star size={14} className="fill-amber-400 text-amber-400" />
              </span>
              <span className="h-3 overflow-hidden rounded-full bg-[#F1F0EC]">
                <span
                  className="block h-full rounded-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </span>
              <span className="text-sm text-gray-500">{item.count}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-gray-500">
          اضغط على عدد النجوم لتصفية عينات آراء العملاء.
        </p>
      </DashboardPanel>
    );
  }

  if (platformKey === "all") {
    return (
      <DashboardPanel
        eyebrow="مقارنة المنصات"
        title="أين يدور الحديث؟"
        icon={<BarChart3 size={21} />}
      >
        {breakdown.length === 0 ? (
          <EmptyChart message="لا توجد بيانات منصات ضمن الفترة الحالية." />
        ) : (
          <div className="space-y-4">
            {breakdown.map((item) => (
              <div key={item.platform} className="rounded-2xl border border-[#BABDE2]/30 bg-[#F8F7F3] p-3">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="font-extrabold text-[#374375]">
                    {formatPlatform(item.platform)}
                  </span>
                  <span className="text-gray-400">{item.total} تفاعل</span>
                </div>
                <div className="flex h-3 overflow-hidden rounded-full bg-[#F1F0EC]">
                  <span
                    className="bg-emerald-600"
                    style={{ width: `${item.positivePct}%` }}
                  />
                  <span
                    className="bg-[#BABDE2]"
                    style={{ width: `${item.neutralPct}%` }}
                  />
                  <span
                    className="bg-[#895159]"
                    style={{ width: `${item.negativePct}%` }}
                  />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-white px-2 py-2">
                    <strong className="block text-emerald-700">{round(item.positivePct, 1)}%</strong>
                    <span className="text-gray-400">رضا</span>
                  </div>
                  <div className="rounded-xl bg-white px-2 py-2">
                    <strong className="block text-[#895159]">{round(item.negativePct, 1)}%</strong>
                    <span className="text-gray-400">سلبي</span>
                  </div>
                  <div className="rounded-xl bg-white px-2 py-2">
                    <strong className="block truncate text-[#374375]">{item.topTopic || "—"}</strong>
                    <span className="text-gray-400">أبرز موضوع</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardPanel>
    );
  }

  const attention = [
    {
      label: "شكاوى",
      count: feedback.filter((row) => row.is_complaint === true).length,
      color: "bg-[#895159]",
    },
    {
      label: "تحتاج متابعة",
      count: feedback.filter((row) => row.needs_reply === true).length,
      color: "bg-amber-500",
    },
    {
      label: "تفاعل عام",
      count: feedback.filter(
        (row) => row.is_complaint !== true && row.needs_reply !== true
      ).length,
      color: "bg-[#BABDE2]",
    },
  ];
  const max = Math.max(...attention.map((item) => item.count), 1);

  return (
    <DashboardPanel
      eyebrow="طبيعة المحادثة"
      title="ما الذي يحتاج انتباهك؟"
      icon={<AlertTriangle size={21} />}
    >
      <div className="space-y-5">
        {attention.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-bold text-[#374375]">{item.label}</span>
              <span className="text-gray-400">{item.count}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#F1F0EC]">
              <div
                className={`h-full rounded-full transition-all duration-300 ${item.color}`}
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </DashboardPanel>
  );
}

function TopicsChart({
  topics,
  selectedTopic,
  onSelectTopic,
}: {
  topics: { label: string; count: number; positivePct: number; negativePct: number }[];
  selectedTopic: string | null;
  onSelectTopic: (topic: string) => void;
}) {
  if (topics.length === 0) {
    return <EmptyChart message="لم تُصنّف موضوعات كافية ضمن الفترة الحالية." />;
  }

  return (
    <div className="space-y-3">
      {topics.map((topic) => (
        <button
          key={topic.label}
          type="button"
          onClick={() => onSelectTopic(topic.label)}
          className={`w-full rounded-2xl border p-3 text-right transition ${
            selectedTopic === topic.label
              ? "border-[#895159]/30 bg-[#DFAEA1]/10"
              : "border-transparent hover:bg-[#F8F7F3]"
          }`}
        >
          <span className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="font-bold text-[#374375]">{topic.label}</span>
            <span className="text-left text-xs text-gray-500">
              {topic.count} ذكر ·{" "}
              <span className={topic.negativePct > topic.positivePct ? "text-[#895159]" : "text-emerald-700"}>
                {round(Math.max(topic.positivePct, topic.negativePct), 1)}% {topic.negativePct > topic.positivePct ? "سلبي" : "إيجابي"}
              </span>
            </span>
          </span>
          <span className="flex h-2.5 overflow-hidden rounded-full bg-[#F1F0EC]">
            <span
              className="h-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${topic.positivePct}%` }}
            />
            <span
              className="h-full bg-[#BABDE2] transition-all duration-300"
              style={{ width: `${Math.max(0, 100 - topic.positivePct - topic.negativePct)}%` }}
            />
            <span
              className="h-full bg-[#895159] transition-all duration-300"
              style={{ width: `${topic.negativePct}%` }}
            />
          </span>
        </button>
      ))}
      <p className="pt-1 text-sm text-gray-500">
        اضغط على الموضوع لاستعراض التعليقات المرتبطة به.
      </p>
    </div>
  );
}

function SentimentTabs({
  counts,
  selected,
  onSelect,
}: {
  counts: Record<KnownSentiment, number>;
  selected: SentimentFilter;
  onSelect: (sentiment: SentimentFilter) => void;
}) {
  const tabs: { key: SentimentFilter; label: string; count: number }[] = [
    {
      key: "all",
      label: "الكل",
      count: counts.positive + counts.negative + counts.neutral,
    },
    { key: "positive", label: "إيجابي", count: counts.positive },
    { key: "negative", label: "سلبي", count: counts.negative },
    { key: "neutral", label: "محايد", count: counts.neutral },
  ];

  return (
    <div className="no-print mt-6 flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onSelect(tab.key)}
          className={`rounded-full px-4 py-2 text-sm font-bold transition ${
            selected === tab.key
              ? "bg-[#374375] text-white"
              : "bg-[#F8F7F3] text-gray-500 hover:bg-[#BABDE2]/30 hover:text-[#374375]"
          }`}
        >
          {tab.label} · {tab.count}
        </button>
      ))}
    </div>
  );
}

function ActiveFilterSummary({
  selectedDay,
  selectedTopic,
  selectedRating,
}: {
  selectedDay: string | null;
  selectedTopic: string | null;
  selectedRating: number | null;
}) {
  const filters = [
    selectedDay ? `اليوم: ${formatShortDate(selectedDay)}` : null,
    selectedTopic ? `الموضوع: ${selectedTopic}` : null,
    selectedRating ? `التقييم: ${selectedRating} نجوم` : null,
  ].filter((value): value is string => Boolean(value));

  if (filters.length === 0) return null;

  return (
    <p className="mt-4 text-sm font-bold text-[#895159]">
      التصفية الحالية: {filters.join(" · ")}
    </p>
  );
}

function FeedbackSampleCard({
  row,
  branchName,
}: {
  row: DashboardFeedbackRow;
  branchName: string;
}) {
  const sentiment = normalizeSentiment(row.sentiment);
  const sentimentStyle = {
    positive: {
      label: "إيجابي",
      badge: "bg-emerald-50 text-emerald-700",
      border: "border-r-emerald-500",
    },
    negative: {
      label: "سلبي",
      badge: "bg-[#DFAEA1]/20 text-[#895159]",
      border: "border-r-[#895159]",
    },
    neutral: {
      label: "محايد",
      badge: "bg-[#BABDE2]/25 text-[#374375]",
      border: "border-r-[#BABDE2]",
    },
    unknown: {
      label: "غير مصنّف",
      badge: "bg-gray-100 text-gray-500",
      border: "border-r-gray-300",
    },
  }[sentiment];
  const classifications = buildFeedbackLabels(row);

  return (
    <article
      className={`rounded-3xl border border-[#BABDE2]/30 border-r-4 bg-[#F8F7F3] p-5 ${sentimentStyle.border}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <span className="font-extrabold text-[#374375]">
            {formatPlatform(row.platform_name ?? "") || "منصة غير محددة"}
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Building2 size={12} />
            {branchName}
          </span>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${sentimentStyle.badge}`}
          >
            {sentimentStyle.label}
          </span>
          {classifications.map((item) => (
            <span
              key={item.label}
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.className}`}
            >
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-4 line-clamp-4 min-h-[3.5rem] font-bold leading-7 text-[#374375]">
        “{row.feedback_text?.trim()}”
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(row.category ?? []).slice(0, 3).map((category) => (
            <span
              key={category}
              className="rounded-full bg-white px-2.5 py-1 text-xs text-gray-500"
            >
              {category}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {Number(row.rating) > 0 && (
            <span className="inline-flex items-center gap-1 font-bold text-amber-600">
              {Number(row.rating)}
              <Star size={11} className="fill-current" />
            </span>
          )}
          {row.published_at && <span>{formatDateTime(row.published_at)}</span>}
        </div>
      </div>
    </article>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="rounded-3xl bg-[#F8F7F3] p-8 text-center text-sm font-bold text-gray-500">
      {message}
    </div>
  );
}

function buildKpis(
  platformKey: string,
  current: Snapshot,
  previous: Snapshot,
  activePlatformsCount: number
): Kpi[] {
  const urgentKpi: Kpi = {
    title: "تحتاج تدخلاً سريعًا",
    value: current.urgent,
    current: current.urgent,
    previous: previous.urgent,
    icon: <AlertTriangle size={21} />,
    tone: "warn",
    lowerIsBetter: true,
  };

  if (platformKey === "google_maps") {
    return [
      {
        title: "متوسط التقييم",
        value: current.averageRating ?? "—",
        current: current.averageRating,
        previous: previous.averageRating,
        icon: <Star size={21} />,
      },
      {
        title: "التقييمات خلال الفترة",
        value: current.total,
        current: current.total,
        previous: previous.total,
        detail: "مقارنة بالفترة السابقة",
        icon: <BarChart3 size={21} />,
      },
      {
        title: "تقييمات 5 نجوم",
        value: `${current.fiveStarPct}%`,
        current: current.fiveStarPct,
        previous: previous.fiveStarPct,
        suffix: " نقطة",
        icon: <CheckCircle2 size={21} />,
        tone: "good",
      },
      urgentKpi,
    ];
  }

  return [
    {
      title:
        platformKey === "x"
          ? "الإشارات خلال الفترة"
          : platformKey === "tiktok" || platformKey === "instagram"
            ? "التعليقات خلال الفترة"
            : "إجمالي التفاعلات",
      value: current.total,
      current: current.total,
      previous: previous.total,
      detail: `من ${activePlatformsCount} منصات نشطة`,
      icon: <Activity size={21} />,
    },
    {
      title: "رضا العملاء",
      value: `${current.positivePct}%`,
      current: current.positivePct,
      previous: previous.positivePct,
      suffix: " نقطة",
      icon: <CheckCircle2 size={21} />,
      tone: "good",
    },
    {
      title: "الاتجاه العام",
      value: reputationDirectionLabel(current, previous),
      current: current.positivePct,
      previous: previous.positivePct,
      suffix: " نقطة",
      icon:
        current.positivePct >= previous.positivePct ? (
          <TrendingUp size={21} />
        ) : (
          <TrendingDown size={21} />
        ),
      tone: current.positivePct >= previous.positivePct ? "good" : "accent",
    },
    urgentKpi,
  ];
}

function buildSnapshot(feedback: DashboardFeedbackRow[]): Snapshot {
  const ratings = feedback
    .map((row) => Number(row.rating))
    .filter((rating) => Number.isFinite(rating) && rating > 0);
  const knownSentiments = feedback
    .map((row) => normalizeSentiment(row.sentiment))
    .filter((sentiment) => sentiment !== "unknown");
  const positive = knownSentiments.filter(
    (sentiment) => sentiment === "positive"
  ).length;
  const topics = new Set(
    feedback.flatMap((row) =>
      (row.category ?? []).map((category) => category.trim()).filter(Boolean)
    )
  );

  return {
    total: feedback.length,
    averageRating:
      ratings.length > 0
        ? round(
            ratings.reduce((total, rating) => total + rating, 0) /
              ratings.length,
            2
          )
        : null,
    positivePct:
      knownSentiments.length > 0
        ? round((positive / knownSentiments.length) * 100, 1)
        : 0,
    complaints: feedback.filter((row) => row.is_complaint === true).length,
    urgent: feedback.filter((row) =>
      ["high", "critical"].includes(row.severity?.trim().toLowerCase() ?? "")
    ).length,
    needsAttention: feedback.filter((row) => row.needs_reply === true).length,
    fiveStarPct:
      ratings.length > 0
        ? round(
            (ratings.filter((rating) => rating === 5).length / ratings.length) *
              100,
            1
          )
        : 0,
    topicCount: topics.size,
  };
}

function buildActivity(
  feedback: DashboardFeedbackRow[],
  periodStart: string,
  periodEnd: string
) {
  const counts = new Map<string, number>();
  for (const row of feedback) {
    const key = dateKey(row.published_at);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const start = startOfUtcDay(new Date(periodStart));
  const end = startOfUtcDay(new Date(periodEnd));
  const totalDays = Math.max(
    1,
    Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1
  );
  const visibleDays = Math.min(totalDays, 14);
  const visibleStart = new Date(end);
  visibleStart.setUTCDate(end.getUTCDate() - visibleDays + 1);

  return Array.from({ length: visibleDays }, (_, index) => {
    const date = new Date(visibleStart);
    date.setUTCDate(visibleStart.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return {
      date: key,
      label: new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }).format(date),
      count: counts.get(key) ?? 0,
    };
  });
}

function buildSentiment(feedback: DashboardFeedbackRow[]) {
  return feedback.reduce<Record<KnownSentiment, number>>(
    (counts, row) => {
      const sentiment = normalizeSentiment(row.sentiment);
      if (sentiment !== "unknown") counts[sentiment] += 1;
      return counts;
    },
    { positive: 0, negative: 0, neutral: 0 }
  );
}

function buildTopics(feedback: DashboardFeedbackRow[]) {
  const rowsByTopic = new Map<string, DashboardFeedbackRow[]>();
  for (const row of feedback) {
    for (const rawCategory of row.category ?? []) {
      const category = rawCategory.trim();
      if (!category) continue;
      const rows = rowsByTopic.get(category) ?? [];
      rows.push(row);
      rowsByTopic.set(category, rows);
    }
  }

  return Array.from(rowsByTopic, ([label, rows]) => {
    const sentiments = rows
      .map((row) => normalizeSentiment(row.sentiment))
      .filter((sentiment) => sentiment !== "unknown");
    const denominator = sentiments.length || 1;
    return {
      label,
      count: rows.length,
      positivePct:
        (sentiments.filter((sentiment) => sentiment === "positive").length /
          denominator) *
        100,
      negativePct:
        (sentiments.filter((sentiment) => sentiment === "negative").length /
          denominator) *
        100,
    };
  })
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);
}

function buildRatingDistribution(feedback: DashboardFeedbackRow[]) {
  return [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: feedback.filter((row) => Number(row.rating) === rating).length,
  }));
}

function buildPlatformBreakdown(feedback: DashboardFeedbackRow[]) {
  const rowsByPlatform = new Map<string, DashboardFeedbackRow[]>();
  for (const row of feedback) {
    const platform = row.platform_name?.trim() || "غير محددة";
    const rows = rowsByPlatform.get(platform) ?? [];
    rows.push(row);
    rowsByPlatform.set(platform, rows);
  }

  return Array.from(rowsByPlatform, ([platform, rows]) => {
    const sentiments = rows
      .map((row) => normalizeSentiment(row.sentiment))
      .filter((sentiment) => sentiment !== "unknown");
    const denominator = sentiments.length || 1;
    const topicCounts = new Map<string, number>();
    for (const row of rows) {
      for (const rawCategory of row.category ?? []) {
        const category = rawCategory.trim();
        if (category) topicCounts.set(category, (topicCounts.get(category) ?? 0) + 1);
      }
    }
    const topTopic = Array.from(topicCounts, ([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count)[0]?.label ?? null;
    return {
      platform,
      total: rows.length,
      topTopic,
      positivePct:
        (sentiments.filter((sentiment) => sentiment === "positive").length /
          denominator) *
        100,
      neutralPct:
        (sentiments.filter((sentiment) => sentiment === "neutral").length /
          denominator) *
        100,
      negativePct:
        (sentiments.filter((sentiment) => sentiment === "negative").length /
          denominator) *
        100,
    };
  }).sort((left, right) => right.total - left.total);
}

function buildExecutiveIntelligence(
  feedback: DashboardFeedbackRow[],
  comparisonFeedback: DashboardFeedbackRow[],
  current: Snapshot,
  previous: Snapshot,
  periodEnd: string
): ExecutiveIntelligenceValue {
  const satisfactionDelta = round(current.positivePct - previous.positivePct, 1);
  const complaintDelta = current.complaints - previous.complaints;
  const positiveTopic = leadingTopic(feedback, (row) => normalizeSentiment(row.sentiment) === "positive");
  const negativeTopic = leadingTopic(
    feedback,
    (row) => row.is_complaint === true || normalizeSentiment(row.sentiment) === "negative"
  );
  const emerging = buildEmergingSignal([...comparisonFeedback, ...feedback], periodEnd);
  const improving = satisfactionDelta >= 0 && complaintDelta <= 0;
  const summary =
    current.total === 0
      ? "لا توجد بيانات كافية في الفترة الحالية لبناء قراءة تنفيذية."
      : satisfactionDelta >= 3
        ? `الرضا يتحسن بارتفاع ${Math.abs(satisfactionDelta)} نقطة، مع ضرورة متابعة ${current.urgent} حالة عاجلة.`
        : satisfactionDelta <= -3
          ? `تراجع الرضا ${Math.abs(satisfactionDelta)} نقطة عن الفترة السابقة، وتحتاج المشكلات الأعلى تكرارًا إلى تدخل.`
          : complaintDelta > 0
            ? `الرضا مستقر نسبيًا، لكن الشكاوى ارتفعت بمقدار ${complaintDelta} عن الفترة السابقة.`
            : "الرضا مستقر ولا يظهر تغير حاد، مع استمرار الحاجة لمراقبة الحالات ذات الأولوية.";

  return {
    summary,
    direction:
      satisfactionDelta > 1
        ? `السمعة تتحسن +${satisfactionDelta} نقطة`
        : satisfactionDelta < -1
          ? `تراجع طفيف ${Math.abs(satisfactionDelta)} نقطة`
          : "الاتجاه مستقر",
    strength: positiveTopic
      ? `${positiveTopic.label} (${positiveTopic.count} إشارات إيجابية)`
      : "لا توجد نقطة قوة بارزة بعد",
    issue: negativeTopic
      ? `${negativeTopic.label} (${negativeTopic.count} ملاحظات سلبية)`
      : "لا توجد مشكلة متكررة واضحة",
    emerging,
    priority:
      current.urgent > 0
        ? `${current.urgent} حالات مرتفعة الخطورة`
        : current.needsAttention > 0
          ? `${current.needsAttention} حالات تحتاج ردًا`
          : "لا توجد حالة عاجلة اليوم",
    improving,
  };
}

function leadingTopic(
  feedback: DashboardFeedbackRow[],
  include: (row: DashboardFeedbackRow) => boolean
) {
  const counts = new Map<string, number>();
  for (const row of feedback) {
    if (!include(row)) continue;
    for (const rawCategory of row.category ?? []) {
      const category = rawCategory.trim();
      if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }
  return Array.from(counts, ([label, count]) => ({ label, count })).sort(
    (left, right) => right.count - left.count
  )[0];
}

function buildEmergingSignal(feedback: DashboardFeedbackRow[], periodEnd: string) {
  const end = startOfUtcDay(new Date(periodEnd));
  const recentStart = new Date(end);
  recentStart.setUTCDate(end.getUTCDate() - 9);
  const previousEnd = new Date(recentStart);
  previousEnd.setUTCDate(recentStart.getUTCDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setUTCDate(previousEnd.getUTCDate() - 9);

  const recentRows = feedback.filter((row) => isWithin(row.published_at, recentStart, end));
  const previousRows = feedback.filter((row) =>
    isWithin(row.published_at, previousStart, previousEnd)
  );
  if (recentRows.length < 3 || previousRows.length < 3) {
    return "لا توجد بيانات كافية لرصد تغير آخر 10 أيام";
  }

  const recentCounts = countNegativeTopics(recentRows);
  const previousCounts = countNegativeTopics(previousRows);
  const changes = Array.from(recentCounts, ([label, count]) => ({
    label,
    count,
    increase: count - (previousCounts.get(label) ?? 0),
  })).sort((left, right) => right.increase - left.increase);
  const leading = changes[0];

  return leading && leading.increase >= 2
    ? `ارتفاع ${leading.label} بـ${leading.increase} إشارات خلال آخر 10 أيام`
    : "لا توجد إشارة ناشئة مقلقة خلال آخر 10 أيام";
}

function countNegativeTopics(feedback: DashboardFeedbackRow[]) {
  const counts = new Map<string, number>();
  for (const row of feedback) {
    if (row.is_complaint !== true && normalizeSentiment(row.sentiment) !== "negative") continue;
    for (const rawCategory of row.category ?? []) {
      const category = rawCategory.trim();
      if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }
  return counts;
}

function isWithin(value: string | null, start: Date, end: Date) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time >= start.getTime() && time < end.getTime() + 86_400_000;
}

function buildActivityInsight(
  activity: { date: string; label: string; count: number }[],
  feedback: DashboardFeedbackRow[],
  selectedPlatformName: string | null
) {
  if (activity.length < 3) return null;
  const average = activity.reduce((sum, point) => sum + point.count, 0) / activity.length;
  const peak = [...activity].sort((left, right) => right.count - left.count)[0];
  if (!peak || peak.count < 5 || peak.count < average * 1.8) return null;

  const peakRows = feedback.filter((row) => dateKey(row.published_at) === peak.date);
  const platform = leadingValue(peakRows.map((row) => row.platform_name));
  const topic = leadingValue(peakRows.flatMap((row) => row.category ?? []));
  const reason = selectedPlatformName
    ? topic
      ? `وتركزت حول موضوع ${topic}`
      : "ضمن المنصة المحددة"
    : platform
      ? `وجاء الجزء الأكبر من ${formatPlatform(platform)}`
      : "عبر المنصات";

  return `ارتفاع غير معتاد في ${peak.label}: سُجل ${peak.count} تفاعلًا، ${reason}.`;
}

function leadingValue(values: Array<string | null>) {
  const counts = new Map<string, number>();
  for (const rawValue of values) {
    const value = rawValue?.trim();
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts, ([value, count]) => ({ value, count })).sort(
    (left, right) => right.count - left.count
  )[0]?.value;
}

function buildFeedbackLabels(row: DashboardFeedbackRow) {
  const labels: { label: string; className: string }[] = [];
  const severity = row.severity?.trim().toLowerCase();
  const categories = (row.category ?? []).join(" ").toLowerCase();
  const feedbackText = row.feedback_text?.trim() ?? "";
  if (severity === "critical" || severity === "high") {
    labels.push({ label: "خطر سمعة", className: "bg-[#895159] text-white" });
  }
  if (row.is_complaint === true) {
    labels.push({ label: "شكوى", className: "bg-[#DFAEA1]/25 text-[#895159]" });
  }
  if (row.is_sales_opportunity === true) {
    labels.push({ label: "نية شراء", className: "bg-emerald-100 text-emerald-800" });
  }
  if (
    labels.length < 2 &&
    (categories.includes("سؤال") ||
      categories.includes("استفسار") ||
      categories.includes("question") ||
      categories.includes("inquiry") ||
      feedbackText.includes("؟") ||
      feedbackText.endsWith("?"))
  ) {
    labels.push({ label: "سؤال", className: "bg-[#BABDE2]/30 text-[#374375]" });
  }
  if (normalizeSentiment(row.sentiment) === "positive" && row.is_sales_opportunity !== true) {
    labels.push({ label: "مدح", className: "bg-emerald-50 text-emerald-700" });
  }
  if (row.needs_reply === true && labels.length === 0) {
    labels.push({ label: "يحتاج ردًا", className: "bg-amber-100 text-amber-800" });
  }
  return labels.slice(0, 2);
}

function reputationDirectionLabel(current: Snapshot, previous: Snapshot) {
  const delta = current.positivePct - previous.positivePct;
  if (delta > 1) return "↗ تتحسن";
  if (delta < -1) return "↘ تراجع طفيف";
  return "→ مستقرة";
}

function getPlatformProfile(platformKey: string) {
  if (platformKey === "google_maps") {
    return {
      eyebrow: "قراءة Google Maps",
      title: "صورة أوضح لتجربة عملاء {name}",
      description:
        "تابع حجم التقييمات وتوزيع النجوم والموضوعات المتكررة، ثم انتقل مباشرة إلى آراء العملاء التي تقف خلف الأرقام.",
      volumeLabel: "تقييم",
    };
  }

  if (platformKey === "x") {
    return {
      eyebrow: "نبض المحادثة على X",
      title: "ماذا يُقال الآن عن {name}؟",
      description:
        "راقب الإشارات اليومية واتجاه مشاعر الجمهور والموضوعات التي تصنع الحديث حول علامتك.",
      volumeLabel: "إشارة",
    };
  }

  if (platformKey === "tiktok") {
    return {
      eyebrow: "تفاعل TikTok",
      title: "اكتشف رد فعل جمهور {name}",
      description:
        "استكشف حركة التعليقات والمشاعر والموضوعات الأكثر حضورًا، مع عينات تساعدك على فهم سياق التفاعل.",
      volumeLabel: "تعليق",
    };
  }

  if (platformKey === "instagram") {
    return {
      eyebrow: "تفاعل Instagram",
      title: "اقرأ تفاعل مجتمع {name}",
      description:
        "شاهد حركة التعليقات والمشاعر والموضوعات المتكررة في تجربة واحدة مرتبطة ببياناتك الحالية.",
      volumeLabel: "تعليق",
    };
  }

  return {
    eyebrow: "نبض السمعة الرقمية",
    title: "كل ما يهم سمعة {name} في مكان واحد",
    description:
      "قارن حركة التفاعل بين المنصات، افهم مشاعر العملاء، واكتشف الموضوعات والآراء التي تستحق انتباهك.",
    volumeLabel: "تفاعل",
  };
}

function normalizePlatform(platform: string | null) {
  if (!platform) return "all";
  const value = platform.trim().toLowerCase().replace(/\s+/g, "_");
  if (["google", "google_maps", "googlemaps"].includes(value)) {
    return "google_maps";
  }
  return value;
}

function normalizeSentiment(value: string | null) {
  const sentiment = value?.trim().toLowerCase();
  if (sentiment === "positive" || sentiment === "إيجابي") return "positive";
  if (sentiment === "negative" || sentiment === "سلبي") return "negative";
  if (sentiment === "neutral" || sentiment === "محايد") return "neutral";
  return "unknown";
}

function formatPlatform(platform: string) {
  const key = normalizePlatform(platform);
  if (key === "google_maps") return "Google Maps";
  if (key === "x") return "X";
  if (key === "tiktok") return "TikTok";
  if (key === "instagram") return "Instagram";
  return platform;
}

function dateKey(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Riyadh",
  }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
    value
  );
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
