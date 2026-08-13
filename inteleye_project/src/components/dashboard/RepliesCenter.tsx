"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Clipboard,
  Filter,
  MessageSquareText,
  Search,
  Sparkles,
} from "lucide-react";

export type ReplyItem = {
  id: string;
  branchName: string;
  platformName: string;
  feedbackText: string;
  suggestedReply: string;
  sentiment: string;
  severity: string;
  categories: string[];
  publishedAt: string | null;
};

export default function RepliesCenter({ items }: { items: ReplyItem[] }) {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);

  const platforms = useMemo(
    () => Array.from(new Set(items.map((item) => item.platformName))).sort(),
    [items]
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        item.feedbackText.toLowerCase().includes(normalizedQuery) ||
        item.suggestedReply.toLowerCase().includes(normalizedQuery) ||
        item.branchName.toLowerCase().includes(normalizedQuery);
      const matchesPlatform =
        platform === "all" || item.platformName === platform;
      const matchesSeverity = severity === "all" || item.severity === severity;

      return matchesQuery && matchesPlatform && matchesSeverity;
    });
  }, [items, platform, query, severity]);

  async function copyReply(item: ReplyItem) {
    if (!item.suggestedReply) return;

    try {
      await navigator.clipboard.writeText(item.suggestedReply);
      setCopyError(false);
      setCopiedId(item.id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setCopyError(true);
    }
  }

  return (
    <>
      <section className="rounded-[1.75rem] border border-[#BABDE2]/35 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
          <label className="flex-1">
            <span className="mb-2 block text-xs font-bold text-gray-400">
              البحث في التعليقات والردود
            </span>
            <span className="flex items-center gap-3 rounded-2xl border border-[#BABDE2]/45 bg-[#F8F7F3] px-4 py-3 focus-within:border-[#374375]">
              <Search size={18} className="text-gray-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث باسم الفرع أو نص التعليق"
                className="w-full bg-transparent text-sm text-[#374375] outline-none placeholder:text-gray-400"
              />
            </span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[430px]">
            <FilterSelect
              label="المنصة"
              value={platform}
              onChange={setPlatform}
              options={platforms.map((value) => ({ value, label: value }))}
            />
            <FilterSelect
              label="درجة الخطورة"
              value={severity}
              onChange={setSeverity}
              options={[
                { value: "high", label: "مرتفعة" },
                { value: "medium", label: "متوسطة" },
                { value: "low", label: "منخفضة" },
              ]}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#BABDE2]/25 pt-4 text-sm">
          <span className="inline-flex items-center gap-2 font-bold text-[#374375]">
            <Filter size={16} />
            {filteredItems.length} حالة ظاهرة
          </span>
          {(query || platform !== "all" || severity !== "all") && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setPlatform("all");
                setSeverity("all");
              }}
              className="font-bold text-[#895159] hover:underline"
            >
              مسح الفلاتر
            </button>
          )}
        </div>
      </section>

      {copyError && (
        <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          تعذر نسخ الرد تلقائيًا. حاول مرة أخرى أو انسخه يدويًا.
        </p>
      )}

      {filteredItems.length === 0 ? (
        <section className="mt-6 rounded-[2rem] border border-dashed border-[#BABDE2] bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#BABDE2]/30 text-[#374375]">
            <MessageSquareText size={26} />
          </div>
          <h2 className="mt-5 text-xl font-extrabold text-[#374375]">
            لا توجد حالات مطابقة
          </h2>
          <p className="mt-2 text-sm leading-7 text-gray-500">
            غيّر خيارات البحث، أو عد لاحقًا بعد وصول تعليقات جديدة تحتاج إلى معالجة.
          </p>
        </section>
      ) : (
        <section className="mt-6 space-y-5">
          {filteredItems.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-[1.75rem] border border-[#BABDE2]/35 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="flex flex-col gap-3 border-b border-[#BABDE2]/25 bg-[#F8F7F3] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-extrabold text-[#374375]">{item.branchName}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {item.platformName} · {formatDate(item.publishedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge label={formatSentiment(item.sentiment)} tone={sentimentTone(item.sentiment)} />
                  <StatusBadge label={`خطورة ${formatSeverity(item.severity)}`} tone={severityTone(item.severity)} />
                  {item.categories.slice(0, 2).map((category) => (
                    <StatusBadge key={category} label={category} tone="neutral" />
                  ))}
                </div>
              </div>

              <div className="grid gap-5 p-5 lg:grid-cols-2 lg:p-6">
                <div>
                  <p className="text-xs font-bold text-gray-400">تعليق العميل</p>
                  <blockquote className="mt-3 rounded-2xl border-r-4 border-[#DFAEA1] bg-[#DFAEA1]/15 p-4 text-sm leading-8 text-gray-700">
                    “{item.feedbackText || "لا يتوفر نص للتعليق."}”
                  </blockquote>
                </div>

                <div className="rounded-2xl bg-[#BABDE2]/18 p-4">
                  <div className="flex items-center gap-2 text-[#374375]">
                    <Sparkles size={18} />
                    <p className="text-xs font-extrabold">الرد المقترح بالذكاء الاصطناعي</p>
                  </div>
                  <p className="mt-3 text-sm leading-8 text-gray-700">
                    {item.suggestedReply || "لم يتوفر رد مقترح لهذه الحالة بعد."}
                  </p>
                  <button
                    type="button"
                    disabled={!item.suggestedReply}
                    onClick={() => copyReply(item)}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#374375] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#895159] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {copiedId === item.id ? <Check size={17} /> : <Clipboard size={17} />}
                    {copiedId === item.id ? "تم النسخ" : "نسخ الرد"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-bold text-gray-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-[#BABDE2]/45 bg-[#F8F7F3] px-4 py-3 text-sm font-bold text-[#374375] outline-none focus:border-[#374375]"
      >
        <option value="all">الكل</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "good" | "bad" | "warn" | "neutral";
}) {
  const className =
    tone === "bad"
      ? "bg-red-50 text-red-700"
      : tone === "warn"
      ? "bg-amber-50 text-amber-700"
      : tone === "good"
      ? "bg-[#DFAEA1]/25 text-[#895159]"
      : "bg-white text-gray-500";

  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${className}`}>{label}</span>;
}

function formatDate(value: string | null) {
  if (!value) return "تاريخ غير متوفر";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "تاريخ غير متوفر";

  return new Intl.DateTimeFormat("ar-SA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Riyadh",
  }).format(date);
}

function formatSentiment(value: string) {
  if (value === "negative") return "سلبي";
  if (value === "positive") return "إيجابي";
  if (value === "neutral") return "محايد";
  return "غير مصنف";
}

function formatSeverity(value: string) {
  if (value === "high") return "مرتفعة";
  if (value === "medium") return "متوسطة";
  return "منخفضة";
}

function sentimentTone(value: string): "good" | "bad" | "neutral" {
  if (value === "negative") return "bad";
  if (value === "positive") return "good";
  return "neutral";
}

function severityTone(value: string): "bad" | "warn" | "neutral" {
  if (value === "high") return "bad";
  if (value === "medium") return "warn";
  return "neutral";
}
