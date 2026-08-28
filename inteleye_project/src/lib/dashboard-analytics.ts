export type DashboardPeriodKey =
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_60_days";

export type DashboardFeedbackRow = {
  source_table: string | null;
  source_record_id: number;
  branch_id: number | null;
  platform_id: number | null;
  platform_name: string | null;
  feedback_text: string | null;
  rating: number | string | null;
  published_at: string | null;
  sentiment: string | null;
  category: string[] | null;
  severity: string | null;
  needs_reply: boolean | null;
  is_sales_opportunity: boolean | null;
  is_complaint: boolean | null;
  suggested_reply: string | null;
};

export type DashboardMetrics = {
  averageRating: number | null;
  totalFeedback: number;
  positivePct: number;
  negativePct: number;
  urgentCount: number;
  needsReplyCount: number;
};

export type DateRange = {
  start: Date;
  end: Date;
  comparisonStart: Date;
  comparisonEnd: Date;
};

export type RatingTrendPoint = {
  label: string;
  value: number;
  date: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeDashboardPeriod(
  value: string | undefined
): DashboardPeriodKey {
  if (
    value === "last_week" ||
    value === "this_month" ||
    value === "last_60_days"
  ) {
    return value;
  }

  return "this_week";
}

export function getDashboardPeriodRange(
  period: DashboardPeriodKey,
  now = new Date()
): DateRange {
  const end = new Date(now);

  if (period === "last_60_days") {
    const start = startOfUtcDay(addDays(end, -59));
    const comparisonEnd = endOfUtcDay(addDays(start, -1));
    const comparisonStart = startOfUtcDay(addDays(comparisonEnd, -59));

    return { start, end, comparisonStart, comparisonEnd };
  }

  if (period === "this_month") {
    const start = new Date(
      Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1)
    );
    const comparisonStart = new Date(
      Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, 1)
    );
    const comparisonEnd = endOfUtcDay(addDays(start, -1));

    return { start, end, comparisonStart, comparisonEnd };
  }

  const thisWeekStart = startOfUtcWeek(end);

  if (period === "last_week") {
    const start = addDays(thisWeekStart, -7);
    const lastWeekEnd = endOfUtcDay(addDays(thisWeekStart, -1));
    const comparisonStart = addDays(start, -7);
    const comparisonEnd = endOfUtcDay(addDays(start, -1));

    return {
      start,
      end: lastWeekEnd,
      comparisonStart,
      comparisonEnd,
    };
  }

  const comparisonStart = addDays(thisWeekStart, -7);
  const comparisonEnd = addDays(end, -7);

  return {
    start: thisWeekStart,
    end,
    comparisonStart,
    comparisonEnd,
  };
}

export function calculateDashboardMetrics(
  feedback: DashboardFeedbackRow[]
): DashboardMetrics {
  const ratings = feedback
    .map((row) => Number(row.rating))
    .filter((value) => Number.isFinite(value) && value > 0);
  const sentiments = feedback
    .map((row) => row.sentiment?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value));
  const positiveCount = sentiments.filter(
    (value) => value === "positive"
  ).length;
  const negativeCount = sentiments.filter(
    (value) => value === "negative"
  ).length;

  return {
    averageRating:
      ratings.length > 0
        ? round(
            ratings.reduce((sum, value) => sum + value, 0) /
              ratings.length,
            2
          )
        : null,
    totalFeedback: feedback.length,
    positivePct:
      sentiments.length > 0
        ? round((positiveCount / sentiments.length) * 100, 1)
        : 0,
    negativePct:
      sentiments.length > 0
        ? round((negativeCount / sentiments.length) * 100, 1)
        : 0,
    urgentCount: feedback.filter((row) =>
      ["high", "critical"].includes(
        row.severity?.trim().toLowerCase() ?? ""
      )
    ).length,
    needsReplyCount: feedback.filter((row) => row.needs_reply === true)
      .length,
  };
}

export function summarizeTopIssues(feedback: DashboardFeedbackRow[]) {
  const counts = new Map<string, number>();

  for (const row of feedback) {
    const isIssue =
      row.is_complaint === true ||
      row.sentiment?.trim().toLowerCase() === "negative";

    if (!isIssue || !Array.isArray(row.category)) continue;

    for (const rawCategory of row.category) {
      const category = rawCategory?.trim();
      if (!category) continue;
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }

  return Array.from(counts, ([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);
}

export function buildRatingTrend(
  feedback: DashboardFeedbackRow[]
): RatingTrendPoint[] {
  const ratingsByDay = new Map<string, number[]>();

  for (const row of feedback) {
    const rating = Number(row.rating);
    if (!row.published_at || !Number.isFinite(rating) || rating <= 0) {
      continue;
    }

    const date = new Date(row.published_at);
    if (Number.isNaN(date.getTime())) continue;

    const key = date.toISOString().slice(0, 10);
    const ratings = ratingsByDay.get(key) ?? [];
    ratings.push(rating);
    ratingsByDay.set(key, ratings);
  }

  return Array.from(ratingsByDay, ([date, ratings]) => ({
    date,
    label: new Intl.DateTimeFormat("ar-SA", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${date}T00:00:00.000Z`)),
    value: round(
      ratings.reduce((sum, value) => sum + value, 0) / ratings.length,
      2
    ),
  }))
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-8);
}

function startOfUtcWeek(value: Date) {
  const result = startOfUtcDay(value);
  const day = result.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  result.setUTCDate(result.getUTCDate() - daysSinceMonday);
  return result;
}

function startOfUtcDay(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  );
}

function endOfUtcDay(value: Date) {
  const result = startOfUtcDay(value);
  result.setUTCHours(23, 59, 59, 999);
  return result;
}

function addDays(value: Date, amount: number) {
  return new Date(value.getTime() + amount * DAY_MS);
}

function round(value: number, precision: number) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
