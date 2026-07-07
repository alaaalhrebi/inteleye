import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import AddBranchForm from "@/components/AddBranchForm";

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, name, subscription_status, plan")
    .eq("user_id", user.id)
    .maybeSingle();

  if (clientError) {
    redirect("/login");
  }

  if (!client) {
    redirect("/signup");
  }

  const status = client.subscription_status?.toLowerCase();

  if (status !== "active" && status !== "paid" && status !== "completed") {
    redirect(`/checkout?plan=${client.plan || "basic"}`);
  }

  const { data: platforms, error: platformsError } = await supabase
    .from("client_platforms")
    .select("id, platform_name, platform_url, username, business_activity, is_active")
    .eq("client_id", client.id)
    .eq("is_active", true);

  if (platformsError) {
    redirect("/onboarding/platforms");
  }

  if (!platforms || platforms.length === 0) {
    redirect("/onboarding/platforms");
  }

  const canUseX = client.plan === "pro" || client.plan === "enterprise";
  const canAddPlatforms = client.plan === "pro" || client.plan === "enterprise";
  const canDownloadPdf = client.plan === "pro" || client.plan === "enterprise";

  const { data: branches } = await supabase
    .from("branches")
    .select("id, name, google_maps_url, x_handle")
    .eq("client_id", client.id);

  const branchIds = (branches ?? []).map((b) => b.id);

  const { data: reports } = await supabase
    .from("reports")
    .select("*")
    .in("branch_id", branchIds.length > 0 ? branchIds : [-1])
    .order("report_month", { ascending: false });

  const latestReportByBranch = new Map<number, any>();

  for (const report of reports ?? []) {
    if (!latestReportByBranch.has(report.branch_id)) {
      latestReportByBranch.set(report.branch_id, report);
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#FFFCF5]">
      <AppHeader rightLabel={`باقة ${client.plan}`} />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="mb-8 rounded-[2rem] bg-white p-8 shadow-sm border border-[#BABDE2]/30">
          <p className="text-sm text-gray-400">لوحة التحكم</p>

          <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-[#374375]">
                مرحبًا، {client.name}
              </h1>
              <p className="mt-2 text-gray-500">
                هنا ملخص أداء منصاتك، الفروع، التقارير، والتنبيهات الذكية.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {canDownloadPdf && (
                <button className="rounded-full border border-[#374375] px-5 py-3 text-sm font-bold text-[#374375] transition hover:bg-[#374375] hover:text-white">
                  تحميل التقرير PDF
                </button>
              )}

              {canAddPlatforms && (
                <a
                  href="/onboarding/platforms"
                  className="rounded-full bg-[#374375] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#895159]"
                >
                  إضافة منصة
                </a>
              )}
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-4">
          <MetricCard title="متوسط التقييم" value="—" />
          <MetricCard title="تعليقات هذا الأسبوع" value="0" />
          <MetricCard title="نسبة السلبي" value="0%" tone="bad" />
          <MetricCard title="رضا العملاء" value="—" tone="good" />
        </section>

        <section className="mb-8 rounded-[2rem] border border-[#BABDE2]/40 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">المنصات المفعّلة</p>
              <h2 className="text-xl font-bold text-[#374375]">
                المنصة التي اخترتها
              </h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {platforms.map((platform) => (
              <PlatformCard key={platform.id} platform={platform} />
            ))}
          </div>
        </section>

        <section className="mb-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-[#BABDE2]/40 bg-white p-6 shadow-sm">
            <p className="text-xs text-gray-400">مقارنة الأداء</p>
            <h2 className="mt-1 text-xl font-bold text-[#374375]">
              هذا الأسبوع مقارنة بالأسبوع الماضي
            </h2>

            <div className="mt-6 space-y-4">
              <ComparisonRow label="متوسط التقييم" current="—" previous="—" />
              <ComparisonRow label="عدد التعليقات" current="0" previous="0" />
              <ComparisonRow label="التعليقات السلبية" current="0%" previous="0%" />
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#BABDE2]/40 bg-white p-6 shadow-sm">
            <p className="text-xs text-gray-400">تنبيهات ذكية</p>
            <h2 className="mt-1 text-xl font-bold text-[#374375]">
              تنبيهات تحتاج انتباهك
            </h2>

            <div className="mt-6 rounded-2xl bg-[#FFFCF5] p-5 text-gray-500">
              لا توجد تنبيهات حاليًا. ستظهر التنبيهات بعد توفر أول تقرير.
            </div>
          </div>
        </section>

        <section className="mb-8 rounded-[2rem] border border-[#BABDE2]/40 bg-white p-6 shadow-sm">
          <p className="text-xs text-gray-400">اقتراح الردود</p>
          <h2 className="mt-1 text-xl font-bold text-[#374375]">
            ردود مقترحة جاهزة
          </h2>

          <div className="mt-6 rounded-2xl bg-[#FFFCF5] p-5 text-gray-500">
            ستظهر الردود المقترحة بعد تحليل التعليقات.
          </div>
        </section>

        <section className="mb-8 rounded-[2rem] border border-[#BABDE2]/40 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-xs text-gray-400">الفروع</p>
            <h2 className="text-xl font-bold text-[#374375]">
              إدارة الفروع
            </h2>
          </div>

          <AddBranchForm clientId={client.id} canUseX={canUseX} />

          {(!branches || branches.length === 0) && (
            <div className="mt-6 rounded-2xl border border-[#eeede8] bg-[#FFFCF5] p-8 text-center">
              <p className="text-gray-600">لا توجد فروع مضافة بعد.</p>
            </div>
          )}

          <div className="mt-6 space-y-6">
            {(branches ?? []).map((branch) => {
              const report = latestReportByBranch.get(branch.id);

              return (
                <div
                  key={branch.id}
                  className="overflow-hidden rounded-2xl border border-[#eeede8] bg-white"
                >
                  <div className="flex items-center justify-between bg-[#374375] px-6 py-4 text-white">
                    <h2 className="font-bold">{branch.name}</h2>

                    {report?.period_label && (
                      <span className="text-xs text-white/70">
                        {report.period_label}
                      </span>
                    )}
                  </div>

                  {!report ? (
                    <div className="p-6 text-sm text-gray-500">
                      لا يوجد تقرير لهذا الفرع بعد — سيظهر التقرير الأول بعد أول تشغيل أسبوعي.
                    </div>
                  ) : (
                    <div className="p-6">
                      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                        <Metric
                          label="تقييم Google"
                          value={report.google_rating ?? "—"}
                        />
                        <Metric
                          label="عدد التعليقات"
                          value={report.total_reviews ?? 0}
                        />
                        <Metric
                          label="نسبة السلبي"
                          value={`${report.negative_pct ?? 0}%`}
                          tone="bad"
                        />
                        <Metric
                          label="نسبة الإيجابي"
                          value={`${report.positive_pct ?? 0}%`}
                          tone="good"
                        />
                      </div>

                      {report.alert_text && (
                        <div
                          className={`mb-5 rounded-lg px-4 py-3 text-sm ${
                            report.alert_level === "danger"
                              ? "bg-red-50 text-red-800"
                              : report.alert_level === "warn"
                              ? "bg-amber-50 text-amber-800"
                              : "bg-[#FFFCF5] text-[#374375]"
                          }`}
                        >
                          {report.alert_text}
                        </div>
                      )}

                      {report.negative_topics?.length > 0 && (
                        <div className="mb-5">
                          <p className="mb-2 text-xs text-gray-400">
                            أبرز المشاكل المذكورة
                          </p>

                          {report.negative_topics.map((t: any, i: number) => (
                            <div
                              key={i}
                              className="mb-1.5 flex items-center gap-3"
                            >
                              <span className="w-32 truncate text-sm">
                                {t.label}
                              </span>

                              <div className="h-2 flex-1 rounded bg-gray-100">
                                <div
                                  className="h-2 rounded bg-red-400"
                                  style={{
                                    width: `${Math.min(100, t.count * 8)}%`,
                                  }}
                                />
                              </div>

                              <span className="text-xs text-gray-500">
                                {t.count}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {report.recommendations?.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs text-gray-400">
                            التوصيات
                          </p>

                          {report.recommendations.map((r: any, i: number) => (
                            <div
                              key={i}
                              className="border-t border-[#f0efe9] py-2 text-sm"
                            >
                              <span className="font-bold">{r.title}</span>
                              <p className="text-gray-600">{r.text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

function PlatformCard({ platform }: { platform: any }) {
  const platformLabel =
    platform.platform_name === "google_maps"
      ? "Google Maps"
      : platform.platform_name === "x"
      ? "X"
      : platform.platform_name === "tiktok"
      ? "TikTok"
      : platform.platform_name;

  return (
    <div className="rounded-2xl border border-[#eeede8] bg-[#FFFCF5] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#374375]">{platformLabel}</h3>

        <span className="rounded-full bg-[#BABDE2]/40 px-3 py-1 text-xs font-bold text-[#374375]">
          مفعّلة
        </span>
      </div>

      <p className="mb-2 text-sm text-gray-500">{platform.platform_url}</p>

      {platform.username && (
        <p className="text-sm text-gray-500">الحساب: {platform.username}</p>
      )}

      {platform.business_activity && (
        <p className="mt-2 text-sm text-gray-500">
          النشاط: {platform.business_activity}
        </p>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: any;
  tone?: "good" | "bad";
}) {
  const color =
    tone === "bad"
      ? "text-red-600"
      : tone === "good"
      ? "text-[#895159]"
      : "text-[#374375]";

  return (
    <div className="rounded-[1.5rem] border border-[#BABDE2]/30 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-400">{title}</p>
      <p className={`mt-3 text-3xl font-extrabold ${color}`}>{value}</p>
    </div>
  );
}

function ComparisonRow({
  label,
  current,
  previous,
}: {
  label: string;
  current: any;
  previous: any;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-[#FFFCF5] p-4">
      <span className="font-bold text-[#374375]">{label}</span>

      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span>الحالي: {current}</span>
        <span>السابق: {previous}</span>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: any;
  tone?: "good" | "bad";
}) {
  const color =
    tone === "bad"
      ? "text-red-600"
      : tone === "good"
      ? "text-[#895159]"
      : "text-[#1a1a2e]";

  return (
    <div className="rounded-lg bg-[#f9f8f5] p-3 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-[11px] text-gray-400">{label}</p>
    </div>
  );
}
