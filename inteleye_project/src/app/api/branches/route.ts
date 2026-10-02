import { NextResponse } from "next/server";

import {
  PlatformSyncWebhookError,
  queuePlatformSync,
  type SyncPlatformName,
} from "@/lib/platforms/n8n";
import { getSubscriptionPermissions } from "@/lib/subscription-permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const ALLOWED_PLATFORMS = new Set([
  "google_maps",
  "x",
  "tiktok",
  "instagram",
]);
const SOCIAL_PLATFORMS = new Set(["x", "tiktok", "instagram"]);
const ALLOWED_BRANCH_SCOPES = new Set(["global", "new_branch"]);

type BranchRequest = {
  name?: unknown;
  platformName?: unknown;
  platformValue?: unknown;
  businessActivity?: unknown;
  scope?: unknown;
};

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeComparableUrl(value: string) {
  return value.trim().replace(/\/+$/, "").toLowerCase();
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
  const requestedScope = textValue(body.scope);

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
        .select("id, branch_id, platform_name, platform_url")
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

  const supportsGlobalScope =
    permissions.canChoosePlatformScope && SOCIAL_PLATFORMS.has(platformName);

  if (
    supportsGlobalScope &&
    !ALLOWED_BRANCH_SCOPES.has(requestedScope)
  ) {
    return NextResponse.json(
      { message: "حدد ما إذا كانت المنصة شاملة لجميع الفروع أو خاصة بالفرع الجديد" },
      { status: 400 }
    );
  }

  const effectiveScope = supportsGlobalScope ? requestedScope : "new_branch";

  const cleanUsername =
    platformName === "x" ? platformValue.replace(/^@/, "") : null;
  const finalPlatformUrl =
    platformName === "x"
      ? `https://x.com/${cleanUsername}`
      : platformValue.replace(/\/+$/, "");

  const duplicateLink = (activePlatforms ?? []).find(
    (platform) =>
      platform.platform_name === platformName &&
      normalizeComparableUrl(platform.platform_url) ===
        normalizeComparableUrl(finalPlatformUrl)
  );

  if (duplicateLink) {
    return NextResponse.json(
      {
        message:
          duplicateLink.branch_id === null
            ? "تمت إضافة المنصة مسبقًا كمنصة شاملة لجميع الفروع"
            : "تمت إضافة المنصة مسبقًا لأحد الفروع",
      },
      { status: 409 }
    );
  }

  if (
    effectiveScope === "global" &&
    (activePlatforms ?? []).some(
      (platform) =>
        platform.platform_name === platformName && platform.branch_id === null
    )
  ) {
    return NextResponse.json(
      { message: "هذه المنصة مرتبطة مسبقًا كمنصة شاملة لجميع الفروع" },
      { status: 409 }
    );
  }

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

  const { data: platform, error: platformError } = await supabase
    .from("client_platforms")
    .insert({
      client_id: client.id,
      branch_id: effectiveScope === "global" ? null : branch.id,
      platform_name: platformName,
      platform_url: finalPlatformUrl,
      username: cleanUsername,
      business_activity: businessActivity,
      is_active: true,
    })
    .select("id")
    .single();

  if (platformError || !platform) {
    await supabase
      .from("branches")
      .delete()
      .eq("id", branch.id)
      .eq("client_id", client.id);

    const status =
      platformError.code === "23505"
        ? 409
        : platformError.code === "42501"
        ? 403
        : 500;
    return NextResponse.json(
      {
        message:
          status === 409
            ? "تمت إضافة المنصة مسبقًا"
            : status === 403
            ? "غير مصرح بإضافة منصة أخرى"
            : "تعذر ربط المنصة بالفرع",
      },
      { status }
    );
  }

  let syncQueued = false;
  try {
    await queuePlatformSync({
      platformId: platform.id,
      platformName: platformName as SyncPlatformName,
    });
    syncQueued = true;
  } catch (error) {
    console.warn("Branch platform sync webhook was not queued", {
      platformName,
      code:
        error instanceof PlatformSyncWebhookError
          ? error.code
          : "UNKNOWN_ERROR",
    });
  }

  return NextResponse.json(
    {
      id: branch.id,
      platformId: platform.id,
      branchId: effectiveScope === "global" ? null : branch.id,
      scope: effectiveScope,
      syncQueued,
    },
    { status: 201 }
  );
}
