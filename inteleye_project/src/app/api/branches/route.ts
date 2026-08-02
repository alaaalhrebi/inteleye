import { NextResponse } from "next/server";

import { getSubscriptionPermissions } from "@/lib/subscription-permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const ALLOWED_PLATFORMS = new Set([
  "google_maps",
  "x",
  "tiktok",
  "instagram",
]);

type BranchRequest = {
  name?: unknown;
  platformName?: unknown;
  platformValue?: unknown;
  businessActivity?: unknown;
};

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "يجب تسجيل الدخول أولًا" }, { status: 401 });
  }

  let body: BranchRequest;
  try {
    body = (await request.json()) as BranchRequest;
  } catch {
    return NextResponse.json({ message: "بيانات الطلب غير صالحة" }, { status: 400 });
  }

  const name = textValue(body.name);
  const platformName = textValue(body.platformName);
  const platformValue = textValue(body.platformValue);
  const businessActivity = textValue(body.businessActivity);

  if (
    !name ||
    !platformValue ||
    !businessActivity ||
    !ALLOWED_PLATFORMS.has(platformName)
  ) {
    return NextResponse.json({ message: "أكمل بيانات الفرع والمنصة" }, { status: 400 });
  }

  const { data: client } = await supabase
    .from("clients")
    .select(
      "id, subscription_status, plan, trial_ends_at, current_period_end, allowed_platforms_count"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ message: "تعذر التحقق من الحساب" }, { status: 403 });
  }

  const [{ count: branchesCount }, { data: activePlatforms }] =
    await Promise.all([
      supabase
        .from("branches")
        .select("id", { count: "exact", head: true })
        .eq("client_id", client.id)
        .eq("is_active", true),
      supabase
        .from("client_platforms")
        .select("platform_name")
        .eq("client_id", client.id)
        .eq("is_active", true),
    ]);

  const platformNames = new Set(
    (activePlatforms ?? []).map((platform) => platform.platform_name)
  );
  const permissions = getSubscriptionPermissions(client, {
    currentBranchesCount: branchesCount ?? 0,
    currentPlatformsCount: platformNames.size,
  });

  if (!permissions.canAddBranch) {
    return NextResponse.json(
      { message: "إدارة الفروع متاحة ضمن الاشتراكات المدفوعة السارية" },
      { status: 403 }
    );
  }

  if (
    !permissions.canUsePlatform ||
    (!platformNames.has(platformName) &&
      platformNames.size >= permissions.platformLimit)
  ) {
    return NextResponse.json(
      { message: "وصلت إلى الحد الأعلى للمنصات في باقتك" },
      { status: 403 }
    );
  }

  const cleanUsername =
    platformName === "x" ? platformValue.replace(/^@/, "") : null;
  const finalPlatformUrl =
    platformName === "x"
      ? `https://x.com/${cleanUsername}`
      : platformValue;

  const { data: branch, error: branchError } = await supabase
    .from("branches")
    .insert({ client_id: client.id, name })
    .select("id")
    .single();

  if (branchError || !branch) {
    const status = branchError?.code === "42501" ? 403 : 500;
    return NextResponse.json(
      { message: status === 403 ? "غير مصرح بإضافة فرع" : "تعذر حفظ الفرع" },
      { status }
    );
  }

  const { error: platformError } = await supabase
    .from("client_platforms")
    .insert({
      client_id: client.id,
      branch_id: branch.id,
      platform_name: platformName,
      platform_url: finalPlatformUrl,
      username: cleanUsername,
      business_activity: businessActivity,
      is_active: true,
    });

  if (platformError) {
    await supabase
      .from("branches")
      .delete()
      .eq("id", branch.id)
      .eq("client_id", client.id);

    const status = platformError.code === "42501" ? 403 : 500;
    return NextResponse.json(
      {
        message:
          status === 403
            ? "غير مصرح بإضافة منصة أخرى"
            : "تعذر ربط المنصة بالفرع",
      },
      { status }
    );
  }

  return NextResponse.json({ id: branch.id }, { status: 201 });
}
