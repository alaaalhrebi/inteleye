import { redirect } from "next/navigation";

import LockedFeature from "@/components/dashboard/LockedFeature";
import ReportsManager from "@/components/reports/ReportsManager";
import { loadReportsSnapshot } from "@/lib/reports/data";
import { getSubscriptionPermissions } from "@/lib/subscription-permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: client } = await supabase
    .from("clients")
    .select(
      "id, plan, subscription_status, trial_ends_at, current_period_end, allowed_platforms_count"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!client) redirect("/signup");

  const permissions = getSubscriptionPermissions(client);
  if (!permissions.canAccessDashboard) {
    redirect("/pricing?reason=subscription_required");
  }
  if (!permissions.canViewReports) {
    return (
      <LockedFeature description="عرض التقارير السابقة وإنشاء التقارير حسب الطلب متاح ضمن الاشتراكات المدفوعة." />
    );
  }

  const snapshot = await loadReportsSnapshot(supabase, client.id);

  return (
    <ReportsManager
      initialSnapshot={snapshot}
      canCreateCustomReport={permissions.canCreateCustomReport}
      canViewPdf={permissions.canViewReportPdf}
      canDownloadPdf={permissions.canDownloadReportPdf}
    />
  );
}
