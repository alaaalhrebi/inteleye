"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, AlertTriangle } from "lucide-react";
import type { ReportProgress } from "@/lib/reports/progress";

const steps = ["جمع التعليقات", "تحليل الآراء", "إعداد التقرير", "التقرير جاهز"];

export default function ReportProcessingStatus({ progress: initialProgress, branchId, platformId }: {
  progress: ReportProgress;
  branchId: number | null;
  platformId: number | null;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState(initialProgress);
  const [refreshError, setRefreshError] = useState(false);
  useEffect(() => { setProgress(initialProgress); setRefreshError(false); }, [initialProgress]);
  useEffect(() => {
    if (!initialProgress.shouldRefresh) return;
    let stopped = false, inFlight = false, refreshCount = 0;
    let controller: AbortController | null = null;
    const params = new URLSearchParams();
    if (branchId !== null) params.set("branch", String(branchId));
    if (platformId !== null) params.set("platform", String(platformId));
    // A small authenticated read, not a full-dashboard refresh or an n8n execution.
    // At most 30 visible requests, no catch-up burst, one in flight, ten-second timeout.
    const timer = window.setInterval(async () => {
      if (refreshCount >= 30) { window.clearInterval(timer); return; }
      if (stopped || document.visibilityState !== "visible" || inFlight) return;
      inFlight = true; refreshCount += 1; controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 10000);
      try {
        const response = await fetch(`/api/reports/progress?${params}`, { cache: "no-store", signal: controller.signal });
        if ([401, 403, 404].includes(response.status)) { setRefreshError(true); stopped = true; window.clearInterval(timer); }
        if (!response.ok) throw new Error("PROGRESS_UNAVAILABLE");
        const next = await response.json() as ReportProgress;
        if (stopped) return;
        setProgress(next); setRefreshError(false);
        if (!next.shouldRefresh) { stopped = true; window.clearInterval(timer); }
        // Refresh feedback and report links once, only when completion is confirmed.
        if (next.stage === "ready") router.refresh();
      } catch { if (!stopped) setRefreshError(true); }
      finally { window.clearTimeout(timeout); inFlight = false; }
    }, 20000);
    return () => { stopped = true; window.clearInterval(timer); controller?.abort(); };
  }, [initialProgress.shouldRefresh, branchId, platformId, router]);

  const nextDate = progress.nextReportAt ? new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Riyadh",
  }).format(new Date(progress.nextReportAt)) : null;
  return (
    <section aria-label="حالة تجهيز التقرير" aria-live="polite" className="my-3 min-w-0">
      <h2 className="sr-only">{progress.title}</h2>
      <ol className="grid grid-cols-4 gap-1 rounded-xl border border-[#BABDE2]/35 bg-white/80 p-1 sm:gap-2" aria-label="مراحل تجهيز التقرير">
        {steps.map((step, index) => (
          <li key={step} aria-current={progress.step === index ? "step" : undefined}
            className={`flex min-h-9 min-w-0 items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-center text-[11px] font-bold leading-4 sm:gap-2 sm:px-2 sm:text-xs ${progress.step === index ? "bg-[#374375] text-white" : "text-gray-500"}`}>
            <span aria-hidden="true" className={`hidden h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] sm:inline-flex ${progress.step === index ? "bg-white/20" : "bg-[#F8F7F3]"}`}>{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] leading-5 text-gray-500">
        <p className="flex min-w-0 items-start gap-1.5">
          <Clock3 size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>{nextDate ? `التقرير القادم: ${nextDate} بتوقيت الرياض` : "التقرير القادم: لم يُحدّد بعد"}
            {nextDate && progress.nextReportDue && <span className="mr-1 text-[#895159]">— بانتظار الاكتمال</span>}
          </span>
        </p>
        <Link href="/dashboard/reports" className="shrink-0 font-bold text-[#374375] underline-offset-4 hover:underline">عرض التقارير</Link>
      </div>
      {progress.stage !== "ready" && <p className="mt-1 text-[11px] leading-5 text-gray-500">تعليقاتك محفوظة، وسيظهر التقرير تلقائيًا بعد اكتمال المعالجة.</p>}
      {progress.step === null && <p className="mt-1 flex items-center gap-1.5 text-[11px] leading-5 text-[#895159]"><AlertTriangle size={13} aria-hidden="true" className="shrink-0" />{progress.title}</p>}
      {refreshError && <p role="status" className="mt-1 text-[11px] leading-5 text-[#895159]">تعذر تحديث الحالة؛ المعروض هو آخر حالة معروفة.</p>}
    </section>
  );
}
