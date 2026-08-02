import { getSubscriptionPermissions } from "@/lib/subscription-permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function getReportsAccess() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, status: 401, supabase };

  const { data: client } = await supabase
    .from("clients")
    .select(
      "id, plan, subscription_status, trial_ends_at, current_period_end, allowed_platforms_count"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!client) return { ok: false as const, status: 403, supabase };

  return {
    ok: true as const,
    supabase,
    user,
    client,
    permissions: getSubscriptionPermissions(client),
  };
}
