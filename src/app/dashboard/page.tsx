import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // جلب بيانات العميل أولاً — RLS يضمن أن هذا العميل فقط يرى سجله
  const { data: client } = await supabase
    .from("clients")
    .select("id, name, subscription_status, plan")
    .eq("user_id", user.id)
    .single();

  // لو الحساب لسة pending (لم يدفع)، نوجّهه لصفحة الباقات
  if (!client || client.subscription_status !== "active") {
    redirect("/pricing");
  }

  // جلب فروع العميل
  const { data: branches } = await supabase
    .from("branches")
    .select("id, name")
    .eq("client_id", client.id);

  const branchIds = (branches ?? []).map((b) => b.id);

  // جلب آخر تقرير لكل فرع
  const { data: reports } = await supabase
    .from("reports")
    .select("*")
    .in("branch_id", branchIds.length > 0 ? branchIds : [-1])
    .order("report_month", { ascending: false });

  // أحدث تقرير لكل فرع فقط (الأول لكل branch_id بعد الترتيب التنازلي)
  const latestReportByBranch = new Map<number, any>();
  for (const report of reports ?? []) {
    if (!latestReportByBranch.has(report.branch_id)) {
      latestReportByBranch.set(report.branch_id, report);
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f4f0]">
      <AppHeader rightLabel={`باقة ${client.plan}`} />

      <div className="max-w-3xl mx-auto py-10 px-4">
        <div className="mb-8">
          <p className="text-xs text-gray-400">لوحة التحكم</p>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">{client.name}</h1>
        </div>

        {(!branches || branches.length === 0) && (
          <div className="bg-white rounded-2xl border border-[#eeede8] p-8 text-center">
            <p className="text-gray-600">لا توجد فروع مضافة بعد.</p>
          </div>
        )}

        <div className="space-y-6">
          {(branches ?? []).map((branch) => {
            const report = latestReportByBranch.get(branch.id);

            return (
              <div key={branch.id} className="bg-white rounded-2xl border border-[#eeede8] overflow-hidden">
                <div className="bg-[#1a1a2e] text-white px-6 py-4 flex items-center justify-between">
                  <h2 className="font-bold">{branch.name}</h2>
                  {report?.period_label && (
                    <span className="text-xs text-gray-300">{report.period_label}</span>
                  )}
                </div>

                {!report ? (
                  <div className="p-6 text-sm text-gray-500">
                    لا يوجد تقرير لهذا الفرع بعد — سيظهر التقرير الأول بعد أول تشغيل أسبوعي.
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="grid grid-cols-4 gap-3 mb-5">
                      <Metric label="تقييم Google" value={report.google_rating ?? "—"} />
                      <Metric label="عدد التعليقات" value={report.total_reviews ?? 0} />
                      <Metric label="نسبة السلبي" value={`${report.negative_pct ?? 0}%`} tone="bad" />
                      <Metric label="نسبة الإيجابي" value={`${report.positive_pct ?? 0}%`} tone="good" />
                    </div>

                    {report.alert_text && (
                      <div
                        className={`text-sm rounded-lg px-4 py-3 mb-5 ${
                          report.alert_level === "danger"
                            ? "bg-red-50 text-red-800"
                            : report.alert_level === "warn"
                            ? "bg-amber-50 text-amber-800"
                            : "bg-green-50 text-green-800"
                        }`}
                      >
                        {report.alert_text}
                      </div>
                    )}

                    {report.negative_topics?.length > 0 && (
                      <div className="mb-5">
                        <p className="text-xs text-gray-400 mb-2">أبرز المشاكل المذكورة</p>
                        {report.negative_topics.map((t: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 mb-1.5">
                            <span className="text-sm w-32 truncate">{t.label}</span>
                            <div className="flex-1 bg-gray-100 rounded h-2">
                              <div
                                className="bg-red-400 h-2 rounded"
                                style={{ width: `${Math.min(100, t.count * 8)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{t.count}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {report.recommendations?.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-400 mb-2">التوصيات</p>
                        {report.recommendations.map((r: any, i: number) => (
                          <div key={i} className="text-sm py-2 border-t border-[#f0efe9]">
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
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: any; tone?: "good" | "bad" }) {
  const color = tone === "bad" ? "text-red-600" : tone === "good" ? "text-green-600" : "text-[#1a1a2e]";
  return (
    <div className="bg-[#f9f8f5] rounded-lg p-3 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-gray-400 mt-1">{label}</p>
    </div>
  );
}
