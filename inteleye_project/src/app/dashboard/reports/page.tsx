
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  Download,
  FileText,
  Filter,
  Lock,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type ReportsPageProps = {
  searchParams?: {
    platform?: string | string[];
    branch?: string | string[];
    type?: string | string[];
  };
};

function getParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, plan, subscription_status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!client) redirect("/signup");

  const status = client.subscription_status?.toLowerCase();

  if (status !== "active" && status !== "paid" && status !== "completed") {
    redirect(`/checkout?plan=${client.plan || "basic"}`);
  }

  const plan = client.plan?.toLowerCase() || "basic";
  const canDownloadPdf = plan === "pro" || plan === "enterprise";

  const selectedPlatform = getParam(searchParams?.platform) || "all";
  const selectedBranch = getParam(searchParams?.branch) || "all";
  const selectedType = getParam(searchParams?.type) || "all";

  const { data: platforms } = await supabase
    .from("client_platforms")
    .select("id, platform_name")
    .eq("client_id", client.id)
    .eq("is_active", true);

  const { data: branches } = await supabase
    .from("branches")
    .select("id, name")
    .eq("client_id", client.id);

  let reportsQuery = supabase
    .from("reports")
    .select("*")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  if (selectedPlatform !== "all") {
    reportsQuery = reportsQuery.eq("platform_id", Number(selectedPlatform));
  }

  if (selectedBranch !== "all") {
    reportsQuery = reportsQuery.eq("branch_id", Number(selectedBranch));
  }

  if (selectedType !== "all") {
    reportsQuery = reportsQuery.eq("report_type", selectedType);
  }

  const { data: reports } = await reportsQuery;

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#F8F7F3] px-6 py-8 text-[#374375]"
    >
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-gray-400">
              لوحة التحكم / التقارير
            </p>

            <h1 className="mt-2 text-4xl font-extrabold text-[#374375]">
              التقارير
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-gray-500">
              هنا تجدين أرشيف التقارير السابقة، مع إمكانية الفلترة حسب المنصة أو الفرع أو نوع التقرير.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#374375] bg-white px-5 py-3 text-sm font-bold text-[#374375] transition hover:bg-[#374375] hover:text-white"
          >
            <ArrowRight size={18} />
            الرجوع للداشبورد
          </Link>
        </header>

        <section className="mb-8 rounded-[2rem] border border-[#BABDE2]/40 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#BABDE2]/30 text-[#374375]">
              <Filter size={22} />
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400">فلترة التقارير</p>
              <h2 className="text-xl font-extrabold text-[#374375]">
                اختر التقرير المطلوب
              </h2>
            </div>
          </div>

          <form className="grid gap-4 md:grid-cols-4">
            <SelectBox name="platform" defaultValue={selectedPlatform}>
              <option value="all">كل المنصات</option>
              {(platforms ?? []).map((platform) => (
                <option key={platform.id} value={String(platform.id)}>
                  {formatPlatform(platform.platform_name)}
                </option>
              ))}
            </SelectBox>

            <SelectBox name="branch" defaultValue={selectedBranch}>
              <option value="all">كل الفروع</option>
              {(branches ?? []).map((branch) => (
                <option key={branch.id} value={String(branch.id)}>
                  {branch.name}
                </option>
              ))}
            </SelectBox>

            <SelectBox name="type" defaultValue={selectedType}>
              <option value="all">كل التقارير</option>
              <option value="initial">التقرير الأولي</option>
              <option value="weekly">أسبوعي</option>
              <option value="monthly">شهري</option>
            </SelectBox>

            <button
              type="submit"
              className="rounded-2xl bg-[#374375] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#895159]"
            >
              تطبيق الفلتر
            </button>
          </form>
        </section>

        <section className="rounded-[2rem] border border-[#BABDE2]/40 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400">أرشيف التقارير</p>
              <h2 className="text-2xl font-extrabold text-[#374375]">
                التقارير المتاحة
              </h2>
            </div>

            <p className="rounded-full bg-[#F8F7F3] px-4 py-2 text-sm font-bold text-gray-500">
              عدد التقارير: {reports?.length ?? 0}
            </p>
          </div>

          {!reports || reports.length === 0 ? (
            <EmptyReports />
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  canDownloadPdf={canDownloadPdf}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SelectBox({
  name,
  defaultValue,
  children,
}: {
  name: string;
  defaultValue: string;
  children: ReactNode;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className="rounded-2xl border border-[#BABDE2]/50 bg-[#F8F7F3] px-4 py-3 text-sm font-bold text-[#374375] outline-none transition focus:border-[#374375] focus:ring-4 focus:ring-[#BABDE2]/30"
    >
      {children}
    </select>
  );
}

function ReportCard({
  report,
  canDownloadPdf,
}: {
  report: any;
  canDownloadPdf: boolean;
}) {
  return (
    <div className="rounded-3xl border border-[#BABDE2]/30 bg-[#F8F7F3] p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#BABDE2]/40 px-3 py-1 text-xs font-bold text-[#374375]">
              {formatPlatform(report.platform_name)}
            </span>

            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-500">
              {formatReportType(report.report_type)}
            </span>
          </div>

          <h3 className="text-xl font-extrabold text-[#374375]">
            {report.period_label || "تقرير أداء"}
          </h3>

          <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={16} />
              من {report.period_start || "—"} إلى {report.period_end || "—"}
            </span>

            <span>
              التعليقات: {report.total_reviews ?? report.total_feedback ?? 0}
            </span>

            <span>السلبي: {report.negative_pct ?? 0}%</span>

            <span>يحتاج رد: {report.total_needs_reply ?? 0}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {canDownloadPdf && report.pdf_url ? (
            <a
              href={report.pdf_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#374375] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#895159]"
            >
              <Download size={18} />
              تحميل PDF
            </a>
          ) : canDownloadPdf ? (
            <button
              disabled
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-gray-200 px-5 py-3 text-sm font-bold text-gray-500"
            >
              <Download size={18} />
              PDF غير متوفر
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full bg-[#DFAEA1]/25 px-5 py-3 text-sm font-bold text-[#895159]">
              <Lock size={18} />
              PDF متاح في Pro
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyReports() {
  return (
    <div className="rounded-3xl bg-[#F8F7F3] p-10 text-center">
      <FileText className="mx-auto mb-4 text-[#BABDE2]" size={46} />

      <h3 className="text-xl font-extrabold text-[#374375]">
        لا توجد تقارير حتى الآن
      </h3>

      <p className="mx-auto mt-3 max-w-xl leading-7 text-gray-500">
        سيظهر أول تقرير بعد تشغيل التحليل الأولي للتعليقات. بعد ذلك سيتم إنشاء التقارير الأسبوعية تلقائيًا.
      </p>
    </div>
  );
}

function formatPlatform(platform: string) {
  if (platform === "google_maps") return "Google Maps";
  if (platform === "x") return "X";
  if (platform === "tiktok") return "TikTok";
  if (platform === "instagram") return "Instagram";
  return platform || "منصة";
}

function formatReportType(type: string) {
  if (type === "initial") return "أولي";
  if (type === "weekly") return "أسبوعي";
  if (type === "monthly") return "شهري";
  return "تقرير";
}
