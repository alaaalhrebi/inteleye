"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, CheckCircle2, Clock3, AlertTriangle } from "lucide-react";
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
  const Icon = progress.stage === "ready" ? CheckCircle2 : progress.stage === "error" ? AlertTriangle : Activity;
  return (
    <section aria-label="حالة تجهيز التقرير" aria-live="polite" className="mt-4 rounded-[1.35rem] border border-[#BABDE2]/40 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <Icon aria-hidden="true" size={23} className={`mt-1 shrink-0 ${progress.stage === "error" ? "text-[#895159]" : "text-[#374375]"}`} />
          <div>
            <h2 className="text-lg font-extrabold text-[#374375]">{progress.title}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-7 text-gray-500">{progress.description}</p>
          </div>
        </div>
        <Link href="/dashboard/reports" className="shrink-0 self-start rounded-full border border-[#BABDE2]/60 px-4 py-2 text-sm font-bold text-[#374375] hover:bg-[#F8F7F3]">
          عرض التقارير
        </Link>
      </div>
      <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="مراحل تجهيز التقرير">
        {steps.map((step, index) => (
          <li key={step} aria-current={progress.step === index ? "step" : undefined}
            className={`rounded-xl px-3 py-2 text-center text-xs font-bold leading-6 ${progress.step === index ? "bg-[#374375] text-white" : "bg-[#F8F7F3] text-gray-500"}`}>
            {index + 1}. {step}
          </li>
        ))}
      </ol>
      <div className="mt-3 flex items-start gap-2 text-xs leading-6 text-gray-500">
        <Clock3 size={15} aria-hidden="true" className="mt-1 shrink-0" />
        <p>{nextDate
          ? `${progress.nextReportDue ? "موعد التقرير المسجل" : "موعد التقرير التالي المسجل"}: ${nextDate} بتوقيت الرياض.${progress.nextReportDue ? " ما زلنا ننتظر تأكيد اكتمال متطلباته." : " يعتمد توفره على اكتمال المزامنة والتحليل."}`
          : "لم يُحدّد موعد التقرير التالي بعد."}</p>
      </div>
      {progress.shouldRefresh && <p className="mt-2 text-xs leading-6 text-gray-400">تُحدّث الحالة مؤقتًا أثناء فتح الصفحة. إذا توقف التحديث، أعد تحميل الصفحة لمتابعة النتيجة.</p>}
      {refreshError && <p role="status" className="mt-2 text-xs leading-6 text-[#895159]">تعذر تحديث الحالة الآن. آخر حالة معروضة قد تكون تغيرت؛ أعد تحميل الصفحة لاحقًا.</p>}
    </section>
  );
}
