
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Building2,
  MapPin,
  MessageCircle,
  Plus,
  Star,
  FileText,
  Lock,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import AddBranchForm from "@/components/AddBranchForm";

function getBranchLimit(plan: string) {
  const normalizedPlan = plan?.toLowerCase();

  if (normalizedPlan === "enterprise") return 999;
  if (normalizedPlan === "pro") return 3;

  return 1;
}

export default async function BranchesPage() {
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
  const branchLimit = getBranchLimit(plan);

  const { data: branches } = await supabase
    .from("branches")
    .select("id, name, google_maps_url, x_handle")
    .eq("client_id", client.id);

  const currentBranchesCount = branches?.length ?? 0;
  const canAddBranch = currentBranchesCount < branchLimit;

  const branchIds = (branches ?? []).map((branch) => branch.id);

  let reports: any[] = [];

  if (branchIds.length > 0) {
    const { data } = await supabase
      .from("reports")
      .select("*")
      .in("branch_id", branchIds)
      .order("created_at", { ascending: false });

    reports = data ?? [];
  }

  const latestReportByBranch = new Map<number, any>();

  for (const report of reports) {
    if (!latestReportByBranch.has(report.branch_id)) {
      latestReportByBranch.set(report.branch_id, report);
    }
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#F8F7F3] px-6 py-8 text-[#374375]"
    >
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-gray-400">
              لوحة التحكم / الفروع
            </p>

            <h1 className="mt-2 text-4xl font-extrabold text-[#374375]">
              إدارة الفروع
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-gray-500">
              أضيفي فروع المنشأة، واربطي كل فرع بالمنصة المناسبة حسب باقتك.
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

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <InfoCard
            title="عدد الفروع الحالية"
            value={currentBranchesCount}
            icon={<Building2 size={22} />}
          />

          <InfoCard
            title="الحد حسب الباقة"
            value={branchLimit === 999 ? "غير محدود" : branchLimit}
            icon={<Lock size={22} />}
          />

          <InfoCard
            title="الباقة الحالية"
            value={formatPlan(plan)}
            icon={<Star size={22} />}
          />
        </section>

        <section className="mb-8 rounded-[2rem] border border-[#BABDE2]/40 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#BABDE2]/30 text-[#374375]">
              <Plus size={22} />
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400">إضافة فرع</p>
              <h2 className="text-xl font-extrabold text-[#374375]">
                فرع جديد
              </h2>
            </div>
          </div>

          {canAddBranch ? (
            <AddBranchForm clientId={client.id} plan={plan} />
          ) : (
            <div className="rounded-3xl bg-[#DFAEA1]/20 p-6 text-center">
              <h3 className="text-lg font-extrabold text-[#895159]">
                وصلتِ للحد الأعلى من الفروع في باقتك الحالية
              </h3>

              <p className="mt-2 text-sm leading-7 text-[#895159]">
                باقة {formatPlan(plan)} تسمح بعدد {branchLimit} فرع. للزيادة يمكنك الترقية إلى باقة أعلى.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-[#BABDE2]/40 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400">الفروع المسجلة</p>
              <h2 className="text-2xl font-extrabold text-[#374375]">
                قائمة الفروع
              </h2>
            </div>

            <p className="rounded-full bg-[#F8F7F3] px-4 py-2 text-sm font-bold text-gray-500">
              {currentBranchesCount} فرع
            </p>
          </div>

          {!branches || branches.length === 0 ? (
            <EmptyBranches />
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {branches.map((branch) => {
                const report = latestReportByBranch.get(branch.id);

                return (
                  <BranchCard
                    key={branch.id}
                    branch={branch}
                    report={report}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function InfoCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: any;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.7rem] border border-[#BABDE2]/30 bg-white p-5 shadow-sm">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#BABDE2]/30 text-[#374375]">
        {icon}
      </div>

      <p className="text-sm text-gray-400">{title}</p>
      <p className="mt-3 text-3xl font-extrabold text-[#374375]">{value}</p>
    </div>
  );
}

function BranchCard({
  branch,
  report,
}: {
  branch: any;
  report: any;
}) {
  return (
    <div className="rounded-3xl border border-[#BABDE2]/30 bg-[#F8F7F3] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-[#374375]">
            {branch.name}
          </h3>

          <p className="mt-2 text-sm text-gray-500">
            آخر تقرير: {report?.period_label || "لا يوجد تقرير بعد"}
          </p>
        </div>

        <span className="rounded-full bg-[#BABDE2]/40 px-3 py-1 text-xs font-bold text-[#374375]">
          مفعّل
        </span>
      </div>

      <div className="space-y-3">
        {branch.google_maps_url && (
          <a
            href={branch.google_maps_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#374375] transition hover:bg-[#BABDE2]/20"
          >
            <MapPin size={18} />
            رابط Google Maps
          </a>
        )}

        {branch.x_handle && (
          <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#374375]">
            <MessageCircle size={18} />
            حساب X: {branch.x_handle}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          <MiniStat label="متوسط التقييم" value={report?.google_rating ?? "—"} />
          <MiniStat label="التعليقات" value={report?.total_reviews ?? report?.total_feedback ?? 0} />
          <MiniStat label="نسبة السلبي" value={`${report?.negative_pct ?? 0}%`} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={`/dashboard/reports?branch=${branch.id}`}
          className="inline-flex items-center gap-2 rounded-full bg-[#374375] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#895159]"
        >
          <FileText size={18} />
          عرض تقارير الفرع
        </Link>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center">
      <p className="text-lg font-extrabold text-[#374375]">{value}</p>
      <p className="mt-1 text-xs font-bold text-gray-400">{label}</p>
    </div>
  );
}

function EmptyBranches() {
  return (
    <div className="rounded-3xl bg-[#F8F7F3] p-10 text-center">
      <Building2 className="mx-auto mb-4 text-[#BABDE2]" size={46} />

      <h3 className="text-xl font-extrabold text-[#374375]">
        لا توجد فروع حتى الآن
      </h3>

      <p className="mx-auto mt-3 max-w-xl leading-7 text-gray-500">
        أضيفي أول فرع للمنشأة، وبعد ربطه بالمنصات ستظهر تقاريره وتحليلاته هنا.
      </p>
    </div>
  );
}

function formatPlan(plan: string) {
  if (!plan) return "Basic";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}
