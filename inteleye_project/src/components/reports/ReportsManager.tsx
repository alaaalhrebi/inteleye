"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FilePlus2,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";

import CreateReportModal from "@/components/reports/CreateReportModal";
import ReportDetailsModal from "@/components/reports/ReportDetailsModal";
import type {
  ReportListItem,
  ReportsSnapshot,
  ReportStatus,
} from "@/lib/reports/types";

type ReportsManagerProps = {
  initialSnapshot: ReportsSnapshot;
  canCreateCustomReport: boolean;
};

const ACTIVE_STATUSES = new Set<ReportStatus>([
  "queued",
  "pending",
  "processing",
]);

export default function ReportsManager({
  initialSnapshot,
  canCreateCustomReport,
}: ReportsManagerProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportListItem | null>(null);
  const [notice, setNotice] = useState("");
  const [pollError, setPollError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [branch, setBranch] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  const refreshReports = useCallback(async (visible = false) => {
    if (visible) setIsRefreshing(true);
    try {
      const response = await fetch("/api/reports", { cache: "no-store" });
      const data = (await response.json()) as ReportsSnapshot & { message?: string };
      if (!response.ok) throw new Error(data.message || "تعذر التحديث");
      setSnapshot((current) => {
        const serverRequestIds = new Set(
          data.reports.map((report) => report.requestId).filter(Boolean)
        );
        const optimisticRequests = current.reports.filter(
          (report) =>
            report.key.startsWith("optimistic-") &&
            report.requestId &&
            !serverRequestIds.has(report.requestId) &&
            Date.now() - new Date(report.createdAt).getTime() < 120000
        );
        return {
          ...data,
          reports: [...optimisticRequests, ...data.reports],
        };
      });
      setPollError("");
    } catch {
      setPollError("تعذر تحديث حالة التقارير الآن. سنحاول تلقائيًا.");
    } finally {
      if (visible) setIsRefreshing(false);
    }
  }, []);

  const hasActiveRequest = snapshot.reports.some((report) =>
    ACTIVE_STATUSES.has(report.status)
  );

  useEffect(() => {
    if (!hasActiveRequest) return;
    let inFlight = false;
    const interval = window.setInterval(async () => {
      if (inFlight || document.visibilityState !== "visible") return;
      inFlight = true;
      await refreshReports();
      inFlight = false;
    }, 5000);
    return () => window.clearInterval(interval);
  }, [hasActiveRequest, refreshReports]);

  const filteredReports = useMemo(
    () =>
      snapshot.reports.filter((report) => {
        const query = search.trim().toLowerCase();
        if (
          branch !== "all" &&
          report.branchId !== null &&
          report.branchId !== Number(branch)
        ) {
          return false;
        }
        if (platform !== "all" && report.platformId !== Number(platform)) return false;
        if (type !== "all" && report.reportType !== type) return false;
        if (status !== "all") {
          if (status === "processing") {
            if (!ACTIVE_STATUSES.has(report.status)) return false;
          } else if (report.status !== status) return false;
        }
        if (dateFrom && (report.periodEnd || "") < dateFrom) return false;
        if (dateTo && (report.periodStart || "") > dateTo) return false;
        if (
          query &&
          !`${report.title} ${report.branchName} ${report.platformName}`
            .toLowerCase()
            .includes(query)
        ) {
          return false;
        }
        return true;
      }),
    [branch, dateFrom, dateTo, platform, search, snapshot.reports, status, type]
  );

  const counts = useMemo(
    () => ({
      total: snapshot.reports.length,
      completed: snapshot.reports.filter((item) => item.status === "completed").length,
      processing: snapshot.reports.filter((item) => ACTIVE_STATUSES.has(item.status)).length,
      failed: snapshot.reports.filter((item) => item.status === "failed").length,
    }),
    [snapshot.reports]
  );

  function resetFilters() {
    setBranch("all");
    setPlatform("all");
    setType("all");
    setStatus("all");
    setDateFrom("");
    setDateTo("");
    setSearch("");
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#F8F7F3] px-4 py-8 text-[#374375] sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold text-[#895159]">أرشيف الأداء والتحليلات</p>
            <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">إدارة التقارير</h1>
            <p className="mt-3 max-w-3xl leading-7 text-gray-500">
              عرض التقارير السابقة ومتابعة طلبات التقارير الجديدة.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#374375] bg-white px-5 py-3 text-sm font-bold text-[#374375] transition hover:bg-[#374375] hover:text-white sm:flex-none"
            >
              <ArrowRight size={18} />
              الرجوع للداشبورد
            </Link>

            {canCreateCustomReport ? (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#374375] px-6 py-3 font-bold text-white shadow-sm transition hover:bg-[#895159] sm:flex-none"
              >
                <FilePlus2 size={19} />
                إنشاء تقرير حسب الطلب
              </button>
            ) : (
              <Link
                href="/pricing"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#374375] px-6 py-3 font-bold text-white sm:flex-none"
              >
                <FilePlus2 size={19} />
                الترقية لإنشاء تقرير
              </Link>
            )}
          </div>
        </header>

        {notice ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            <CheckCircle2 className="mt-0.5 shrink-0" size={19} />
            <span>{notice}</span>
          </div>
        ) : null}
        {pollError ? (
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            <AlertCircle className="mt-0.5 shrink-0" size={19} />
            <span>{pollError}</span>
          </div>
        ) : null}

        <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="إجمالي التقارير" value={counts.total} icon={<FileText />} tone="violet" />
          <StatCard label="جاهزة" value={counts.completed} icon={<CheckCircle2 />} tone="green" />
          <StatCard label="قيد المعالجة" value={counts.processing} icon={<Clock3 />} tone="amber" />
          <StatCard label="فشلت" value={counts.failed} icon={<XCircle />} tone="red" />
        </section>

        <section className="mt-6 rounded-[2rem] border border-[#BABDE2]/40 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#BABDE2]/30">
                <Filter size={21} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400">تصفية وبحث</p>
                <h2 className="font-extrabold">حدد التقارير المطلوبة</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="text-sm font-bold text-[#895159] hover:underline"
            >
              مسح الفلاتر
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect value={branch} onChange={setBranch} label="الفرع">
              <option value="all">كل الفروع</option>
              {snapshot.branches.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </FilterSelect>
            <FilterSelect value={platform} onChange={setPlatform} label="المنصة">
              <option value="all">كل المنصات</option>
              {snapshot.platforms
                .filter(
                  (item) =>
                    branch === "all" ||
                    item.branchId === null ||
                    item.branchId === Number(branch)
                )
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatPlatform(item.name)}
                    {item.branchId === null
                      ? " — عامة لكل الفروع"
                      : ""}
                  </option>
                ))}
            </FilterSelect>
            <FilterSelect value={type} onChange={setType} label="نوع التقرير">
              <option value="all">كل الأنواع</option>
              <option value="initial_historical">تاريخي أولي</option>
              <option value="weekly">أسبوعي</option>
              <option value="monthly">شهري</option>
              <option value="custom">مخصص</option>
            </FilterSelect>
            <FilterSelect value={status} onChange={setStatus} label="الحالة">
              <option value="all">كل الحالات</option>
              <option value="completed">مكتمل</option>
              <option value="processing">قيد المعالجة</option>
              <option value="failed">فشل</option>
              <option value="no_data">لا توجد بيانات</option>
            </FilterSelect>

            <label className="relative block lg:col-span-2">
              <span className="mb-2 block text-xs font-bold text-gray-500">البحث</span>
              <Search className="absolute bottom-3 right-4 text-gray-400" size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="اسم التقرير أو الفرع أو المنصة"
                className="w-full rounded-2xl border border-[#BABDE2]/50 bg-[#F8F7F3] py-3 pl-4 pr-11 text-sm outline-none focus:border-[#374375]"
              />
            </label>
            <DateFilter label="من تاريخ" value={dateFrom} onChange={setDateFrom} />
            <DateFilter label="إلى تاريخ" value={dateTo} onChange={setDateTo} />
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-[#BABDE2]/40 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-gray-400">قائمة التقارير</p>
              <h2 className="text-2xl font-extrabold">التقارير المتاحة</h2>
            </div>
            <button
              type="button"
              onClick={() => refreshReports(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-full border border-[#374375] px-4 py-2 text-sm font-bold disabled:opacity-50"
            >
              <RefreshCw className={isRefreshing ? "animate-spin" : ""} size={16} />
              تحديث
            </button>
          </div>

          {filteredReports.length ? (
            <div className="space-y-4">
              {filteredReports.map((report) => (
                <ReportCard
                  key={report.key}
                  report={report}
                  onView={() => setSelectedReport(report)}
                />
              ))}
            </div>
          ) : snapshot.reports.length ? (
            <div className="rounded-3xl bg-[#F8F7F3] p-10 text-center">
              <Search className="mx-auto text-[#BABDE2]" size={42} />
              <h3 className="mt-4 text-xl font-extrabold">لا توجد نتائج مطابقة</h3>
              <p className="mt-2 text-gray-500">جرّب تعديل الفلاتر أو مسحها.</p>
            </div>
          ) : (
            <EmptyReports canCreate={canCreateCustomReport} onCreate={() => setShowCreate(true)} />
          )}
        </section>
      </div>

      {showCreate ? (
        <CreateReportModal
          branches={snapshot.branches}
          platforms={snapshot.platforms}
          onClose={() => setShowCreate(false)}
          onAccepted={(result) => {
            setNotice(result.message);
            const branchName =
              result.branchId === null
                ? "كل الفروع"
                : snapshot.branches.find(
                    (item) => item.id === result.branchId
                  )?.name || "فرع";
            const platformName =
              snapshot.platforms.find((item) => item.id === result.platformId)?.name ||
              "منصة";
            setSnapshot((current) => ({
              ...current,
              reports: [
                {
                  key: `optimistic-${result.requestId}`,
                  reportId: null,
                  requestId: result.requestId,
                  title: "تقرير مخصص قيد الإنشاء",
                  reportType: "custom",
                  branchId: result.branchId,
                  branchName,
                  platformId: result.platformId,
                  platformName,
                  periodStart: result.periodStart,
                  periodEnd: result.periodEnd,
                  createdAt: new Date().toISOString(),
                  updatedAt: null,
                  status: "processing",
                  totalFeedback: 0,
                  stats: null,
                  aiSummary: null,
                  urgentCases: [],
                },
                ...current.reports.filter(
                  (item) => item.requestId !== result.requestId
                ),
              ],
            }));
          }}
        />
      ) : null}
      {selectedReport ? (
        <ReportDetailsModal report={selectedReport} onClose={() => setSelectedReport(null)} />
      ) : null}
    </main>
  );
}

function StatCard({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: "violet" | "green" | "amber" | "red" }) {
  const tones = {
    violet: "bg-[#BABDE2]/35 text-[#374375]",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
  };
  return (
    <div className="flex items-center gap-4 rounded-3xl border border-[#BABDE2]/30 bg-white p-5 shadow-sm">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tones[tone]}`}>{icon}</div>
      <div>
        <p className="text-sm font-bold text-gray-500">{label}</p>
        <p className="mt-1 text-3xl font-extrabold">{value}</p>
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, label, children }: { value: string; onChange: (value: string) => void; label: string; children: React.ReactNode }) {
  return (
    <label>
      <span className="mb-2 block text-xs font-bold text-gray-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-[#BABDE2]/50 bg-[#F8F7F3] px-4 py-3 text-sm font-bold outline-none focus:border-[#374375]">
        {children}
      </select>
    </label>
  );
}

function DateFilter({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-2 block text-xs font-bold text-gray-500">{label}</span>
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-[#BABDE2]/50 bg-[#F8F7F3] px-4 py-3 text-sm outline-none focus:border-[#374375]" />
    </label>
  );
}

function ReportCard({ report, onView }: { report: ReportListItem; onView: () => void }) {
  const active = ACTIVE_STATUSES.has(report.status);
  return (
    <article className="rounded-3xl border border-[#BABDE2]/35 bg-[#F8F7F3] p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={report.status} />
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-500">{formatType(report.reportType)}</span>
            <span className="rounded-full bg-[#BABDE2]/35 px-3 py-1 text-xs font-bold">{formatPlatform(report.platformName)}</span>
          </div>
          <h3 className="mt-3 truncate text-xl font-extrabold">{report.title}</h3>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500">
            <span>{report.branchName}</span>
            <span className="inline-flex items-center gap-1"><CalendarDays size={15} />{formatDate(report.periodStart)} — {formatDate(report.periodEnd)}</span>
            <span>أُنشئ: {formatDateTime(report.createdAt)}</span>
            {report.status === "completed" ? <span>التعليقات: {report.totalFeedback}</span> : null}
          </div>
          {active ? (
            <p className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-amber-700"><Loader2 className="animate-spin" size={16} />يجري تجهيز التقرير، وسيتم تحديث الحالة تلقائيًا.</p>
          ) : report.status === "no_data" ? (
            <p className="mt-3 text-sm font-bold text-gray-500">لا توجد تعليقات أو تقييمات خلال الفترة المحددة.</p>
          ) : report.status === "failed" ? (
            <p className="mt-3 text-sm font-bold text-red-700">تعذر إكمال التقرير. يرجى المحاولة مرة أخرى لاحقًا.</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {report.status === "completed" && report.reportId ? (
            <button type="button" onClick={onView} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#374375] px-5 py-2.5 text-sm font-bold text-white sm:flex-none">
              <Eye size={17} />عرض التقرير
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const config = {
    queued: ["في قائمة الانتظار", "bg-amber-100 text-amber-800"],
    pending: ["في قائمة الانتظار", "bg-amber-100 text-amber-800"],
    processing: ["جاري إنشاء التقرير", "bg-blue-100 text-blue-800"],
    completed: ["التقرير جاهز", "bg-emerald-100 text-emerald-800"],
    no_data: ["لا توجد بيانات خلال الفترة المحددة", "bg-gray-200 text-gray-700"],
    failed: ["تعذر إنشاء التقرير", "bg-red-100 text-red-800"],
  }[status];
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${config[1]}`}>{config[0]}</span>;
}

function EmptyReports({ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }) {
  return (
    <div className="rounded-3xl bg-[#F8F7F3] p-10 text-center">
      <BarChart3 className="mx-auto text-[#BABDE2]" size={48} />
      <h3 className="mt-4 text-xl font-extrabold">لا توجد تقارير حتى الآن</h3>
      <p className="mx-auto mt-3 max-w-xl leading-7 text-gray-500">سيظهر أول تقرير بعد تشغيل التحليل الأولي أو عند إنشاء تقرير مخصص حسب الفترة.</p>
      {canCreate ? <button type="button" onClick={onCreate} className="mt-6 rounded-full bg-[#374375] px-6 py-3 font-bold text-white">إنشاء أول تقرير</button> : null}
    </div>
  );
}

function formatPlatform(value: string) {
  return ({ google_maps: "Google Maps", x: "X", tiktok: "TikTok", instagram: "Instagram" } as Record<string, string>)[value] || value;
}
function formatType(value: string) {
  return ({ initial: "أولي", initial_historical: "تاريخي أولي", weekly: "أسبوعي", monthly: "شهري", custom: "مخصص" } as Record<string, string>)[value] || "تقرير";
}
function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
