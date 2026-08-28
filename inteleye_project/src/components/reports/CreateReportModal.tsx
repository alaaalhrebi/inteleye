"use client";

import { FormEvent, useMemo, useState } from "react";
import { CalendarDays, Loader2, X } from "lucide-react";

import type { BranchOption, PlatformOption } from "@/lib/reports/types";

type CreateReportModalProps = {
  branches: BranchOption[];
  platforms: PlatformOption[];
  onClose: () => void;
  onAccepted: (result: {
    message: string;
    requestId: string;
    branchId: number | null;
    platformId: number;
    periodStart: string;
    periodEnd: string;
  }) => Promise<void> | void;
};

const FIELD_CLASS =
  "w-full rounded-2xl border border-[#BABDE2]/50 bg-[#F8F7F3] px-4 py-3 text-sm font-bold text-[#374375] outline-none transition focus:border-[#374375] focus:ring-4 focus:ring-[#BABDE2]/30";

function localDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function todayValue() {
  return localDateValue(new Date());
}

function daysAgoValue(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);

  return localDateValue(date);
}

export default function CreateReportModal({
  branches,
  platforms,
  onClose,
  onAccepted,
}: CreateReportModalProps) {
  const initialBranchId =
    branches.length === 1 ? String(branches[0].id) : "";

  const initialPlatforms = platforms.filter(
    (platform) =>
      platform.branchId === null ||
      platform.branchId === Number(initialBranchId)
  );

  const initialPlatformId =
    initialBranchId && initialPlatforms.length === 1
      ? String(initialPlatforms[0].id)
      : "";

  const [branchId, setBranchId] = useState(initialBranchId);
  const [platformId, setPlatformId] = useState(initialPlatformId);

  const [periodStart, setPeriodStart] = useState(() =>
    daysAgoValue(6)
  );

  const [periodEnd, setPeriodEnd] = useState(() =>
    todayValue()
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const today = todayValue();

  const branchPlatforms = useMemo(() => {
    if (!branchId) return [];

    return platforms.filter(
      (platform) =>
        platform.branchId === null ||
        platform.branchId === Number(branchId)
    );
  }, [branchId, platforms]);

  const selectedPlatform = useMemo(
    () =>
      branchPlatforms.find(
        (platform) => platform.id === Number(platformId)
      ) ?? null,
    [branchPlatforms, platformId]
  );

  const isGlobalPlatform =
    selectedPlatform?.branchId === null;

  const formReady = Boolean(
    branchId &&
      platformId &&
      periodStart &&
      periodEnd
  );

  function handleBranchChange(nextBranchId: string) {
    setBranchId(nextBranchId);
    setError("");

    const matchingPlatforms = platforms.filter(
      (platform) =>
        platform.branchId === null ||
        platform.branchId === Number(nextBranchId)
    );

    setPlatformId(
      matchingPlatforms.length === 1
        ? String(matchingPlatforms[0].id)
        : ""
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!formReady) {
      setError("أكمل الفرع والمنصة والفترة الزمنية");
      return;
    }

    if (periodStart > periodEnd) {
      setError("تاريخ البداية يجب أن يسبق تاريخ النهاية");
      return;
    }

    if (periodStart > today || periodEnd > today) {
      setError("لا يمكن اختيار تاريخ مستقبلي");
      return;
    }

    const latestAllowed = new Date(
      `${periodStart}T00:00:00Z`
    );

    latestAllowed.setUTCFullYear(
      latestAllowed.getUTCFullYear() + 1
    );

    if (
      new Date(`${periodEnd}T00:00:00Z`) >
      latestAllowed
    ) {
      setError("يجب ألا تتجاوز فترة التقرير سنة واحدة");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        "/api/reports/request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            branchId: Number(branchId),
            platformIds: [Number(platformId)],
            reportType: "custom",
            periodStart,
            periodEnd,
          }),
        }
      );

      const data = (await response.json()) as {
        message?: string;
        request_id?: string | number;
        branch_id?: number | null;
      };

      if (!response.ok) {
        setError(
          data.message || "تعذر إرسال طلب التقرير"
        );
        return;
      }

      if (
        data.request_id === undefined ||
        String(data.request_id).trim() === ""
      ) {
        setError("استجابة خدمة التقارير غير مكتملة");
        return;
      }

      const acceptedBranchId =
        data.branch_id === null
          ? null
          : Number(data.branch_id ?? branchId);

      await onAccepted({
        message:
          data.message ||
          "تم استلام طلب التقرير وبدأت معالجته.",
        requestId: String(data.request_id),
        branchId:
          acceptedBranchId === null
            ? null
            : Number.isFinite(acceptedBranchId)
              ? acceptedBranchId
              : Number(branchId),
        platformId: Number(platformId),
        periodStart,
        periodEnd,
      });

      onClose();
    } catch {
      setError(
        "تعذر الاتصال بالخادم. تحقق من الشبكة وحاول مجددًا"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#16172E]/55 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-report-title"
      dir="rtl"
    >
      <div className="max-h-[95vh] w-full overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-[2rem] sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[#895159]">
              تقرير عند الطلب
            </p>

            <h2
              id="create-report-title"
              className="mt-1 text-2xl font-extrabold text-[#374375]"
            >
              إنشاء تقرير جديد
            </h2>

            <p className="mt-2 leading-7 text-gray-500">
              اختر فرعًا ومنصة وفترة لا تتجاوز سنة.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={submit}
          className="mt-7 space-y-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الفرع">
              <select
                required
                value={branchId}
                onChange={(event) =>
                  handleBranchChange(event.target.value)
                }
                className={FIELD_CLASS}
              >
                <option value="">اختر الفرع</option>

                {branches.map((branch) => (
                  <option
                    key={branch.id}
                    value={branch.id}
                  >
                    {branch.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="المنصة">
              <select
                required
                value={platformId}
                onChange={(event) => {
                  setPlatformId(event.target.value);
                  setError("");
                }}
                disabled={!branchId}
                className={`${FIELD_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <option value="">
                  {!branchId
                    ? "اختر الفرع أولًا"
                    : "اختر منصة واحدة"}
                </option>

                {branchPlatforms.map((platform) => (
                  <option
                    key={platform.id}
                    value={platform.id}
                  >
                    {formatPlatform(platform.name)}
                    {platform.branchId === null
                      ? " — شاملة لجميع الفروع"
                      : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {branchId &&
          branchPlatforms.length === 0 ? (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              لا توجد منصة نشطة مرتبطة بهذا الفرع،
              ولا توجد منصة عامة للمنشأة.
            </p>
          ) : null}

          {isGlobalPlatform ? (
            <p className="rounded-2xl bg-[#BABDE2]/20 px-4 py-3 text-sm font-bold leading-6 text-[#374375]">
              هذه منصة عامة على مستوى المنشأة.
              سيشمل التقرير بيانات الحساب العام، وليس
              بيانات فرع منفصل فقط.
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="من تاريخ"
              icon={<CalendarDays size={16} />}
            >
              <input
                required
                type="date"
                value={periodStart}
                max={today}
                onChange={(event) =>
                  setPeriodStart(event.target.value)
                }
                className={FIELD_CLASS}
              />
            </Field>

            <Field
              label="إلى تاريخ"
              icon={<CalendarDays size={16} />}
            >
              <input
                required
                type="date"
                value={periodEnd}
                min={periodStart || undefined}
                max={today}
                onChange={(event) =>
                  setPeriodEnd(event.target.value)
                }
                className={FIELD_CLASS}
              />
            </Field>
          </div>

          {!formReady && !error ? (
            <p className="rounded-2xl bg-[#F8F7F3] px-4 py-3 text-sm font-bold text-gray-500">
              اختر الفرع والمنصة والفترة لتفعيل زر
              إنشاء التقرير.
            </p>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-full border border-[#374375] px-6 py-3 font-bold text-[#374375] disabled:opacity-50"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={submitting || !formReady}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#374375] px-7 py-3 font-bold text-white transition hover:bg-[#895159] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <Loader2
                  className="animate-spin"
                  size={18}
                />
              ) : null}

              {submitting
                ? "جارٍ الإرسال..."
                : "إنشاء التقرير"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-bold text-[#374375]">
        {icon}
        {label}
      </span>

      {children}
    </label>
  );
}

function formatPlatform(platform: string) {
  const labels: Record<string, string> = {
    google_maps: "Google Maps",
    x: "X",
    tiktok: "TikTok",
    instagram: "Instagram",
  };

  return labels[platform] || platform;
}
