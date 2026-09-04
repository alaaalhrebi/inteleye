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

const ALLOWED_SCOPES = new Set(["global", "existing_branch", "new_branch"]);

type PlatformRequest = {
  platformName?: unknown;
  platformValue?: unknown;
  businessActivity?: unknown;
  scope?: unknown;
  branchId?: unknown;
  branchName?: unknown;
};

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeComparableUrl(value: string) {
  return value.trim().replace(/\/+$/, "").toLowerCase();
}

function normalizePlatformValue(platformName: string, rawValue: string) {
  if (platformName === "x") {
    let username = rawValue.trim();

    try {
      const parsed = new URL(username);
      username = parsed.pathname.split("/").filter(Boolean)[0] || "";
    } catch {
      // يقبل اسم المستخدم مباشرة بالإضافة إلى الرابط.
    }

    username = username.replace(/^@/, "").trim();
    if (!username) return null;

    return {
      platformUrl: `https://x.com/${username}`,
      username,
    };
  }

  try {
    const parsed = new URL(rawValue);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;

    parsed.hash = "";
    const normalizedUrl = parsed.toString().replace(/\/+$/, "");

    return {
      platformUrl: normalizedUrl,
      username: null,
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "يجب تسجيل الدخول أولًا" }, { status: 401 });
  }

  let body: PlatformRequest;
  try {
    body = (await request.json()) as PlatformRequest;
  } catch {
    return NextResponse.json({ message: "بيانات الطلب غير صالحة" }, { status: 400 });
  }

  const platformName = textValue(body.platformName);
  const platformValue = textValue(body.platformValue);
  const businessActivity = textValue(body.businessActivity);
  const scope = textValue(body.scope);
  const branchName = textValue(body.branchName);
  const requestedBranchId = Number(body.branchId);

  if (
    !ALLOWED_PLATFORMS.has(platformName) ||
    !platformValue ||
    !businessActivity
  ) {
    return NextResponse.json(
      { message: "أكمل بيانات المنصة" },
      { status: 400 }
    );
  }

  const normalizedPlatform = normalizePlatformValue(platformName, platformValue);
  if (!normalizedPlatform) {
    return NextResponse.json({ message: "رابط المنصة غير صالح" }, { status: 400 });
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

  const [{ data: activePlatforms }, { data: activeBranches }] = await Promise.all([
    supabase
      .from("client_platforms")
      .select("id, branch_id, platform_name, platform_url")
      .eq("client_id", client.id)
      .eq("is_active", true),
    supabase
      .from("branches")
      .select("id")
      .eq("client_id", client.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
  ]);

  const platformRows = activePlatforms ?? [];
  const branchRows = activeBranches ?? [];
  const platformTypes = new Set(platformRows.map((platform) => platform.platform_name));
  const permissions = getSubscriptionPermissions(client, {
    currentBranchesCount: branchRows.length,
    currentPlatformsCount: platformTypes.size,
  });

  if (!permissions.canAccessDashboard || !permissions.canUsePlatform) {
    return NextResponse.json(
      { message: "ربط المنصات غير متاح في اشتراكك الحالي" },
      { status: 403 }
    );
  }

  if (permissions.canChoosePlatformScope && !ALLOWED_SCOPES.has(scope)) {
    return NextResponse.json(
      { message: "حدد نطاق ربط المنصة" },
      { status: 400 }
    );
  }

  if (
    !platformTypes.has(platformName) &&
    platformTypes.size >= permissions.platformLimit
  ) {
    return NextResponse.json(
      { message: "وصلت إلى حد أنواع المنصات في باقتك الحالية" },
      { status: 403 }
    );
  }

  const comparableUrl = normalizeComparableUrl(normalizedPlatform.platformUrl);
  const duplicateLink = platformRows.some(
    (platform) =>
      platform.platform_name === platformName &&
      normalizeComparableUrl(platform.platform_url) === comparableUrl
  );

  if (duplicateLink) {
    return NextResponse.json(
      { message: "تمت إضافة المنصة مسبقًا" },
      { status: 409 }
    );
  }

  let targetBranchId: number | null = null;
  let createdBranchId: number | null = null;
  let effectiveScope = scope;
  let effectiveRequestedBranchId = requestedBranchId;

  if (!permissions.canChoosePlatformScope) {
    let primaryBranchId = Number(branchRows[0]?.id);

    if (!Number.isSafeInteger(primaryBranchId) || primaryBranchId <= 0) {
      const { data: ensuredBranchId, error: branchError } = await supabase.rpc(
        "ensure_onboarding_main_branch"
      );

      primaryBranchId = Number(ensuredBranchId);
      if (
        branchError ||
        !Number.isSafeInteger(primaryBranchId) ||
        primaryBranchId <= 0
      ) {
        return NextResponse.json(
          { message: "تعذر العثور على الفرع الرئيسي للحساب" },
          { status: 409 }
        );
      }
    }

    effectiveScope = "existing_branch";
    effectiveRequestedBranchId = primaryBranchId;
  }

  if (effectiveScope === "existing_branch") {
    if (
      !Number.isSafeInteger(effectiveRequestedBranchId) ||
      effectiveRequestedBranchId <= 0
    ) {
      return NextResponse.json({ message: "اختر الفرع المطلوب" }, { status: 400 });
    }

    const { data: branch } = await supabase
      .from("branches")
      .select("id")
      .eq("id", effectiveRequestedBranchId)
      .eq("client_id", client.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!branch) {
      return NextResponse.json({ message: "الفرع المحدد غير صالح" }, { status: 403 });
    }

    targetBranchId = branch.id;
  }

  if (effectiveScope === "new_branch") {
    if (!branchName) {
      return NextResponse.json({ message: "أدخل اسم الفرع الجديد" }, { status: 400 });
    }

    if (!permissions.canAddBranch) {
      return NextResponse.json(
        { message: "وصلت إلى حد الفروع أو أن اشتراكك لا يسمح بإنشاء فرع" },
        { status: 403 }
      );
    }

    const { data: branch, error: branchError } = await supabase
      .from("branches")
      .insert({ client_id: client.id, name: branchName })
      .select("id")
      .single();

    if (branchError || !branch) {
      const status = branchError?.code === "42501" ? 403 : 500;
      return NextResponse.json(
        {
          message:
            status === 403
              ? "غير مصرح بإنشاء فرع جديد"
              : "تعذر إنشاء الفرع الجديد",
        },
        { status }
      );
    }

    targetBranchId = branch.id;
    createdBranchId = branch.id;
  }

  const sameScopePlatform = platformRows.some(
    (platform) =>
      platform.platform_name === platformName &&
      platform.branch_id === targetBranchId
  );

  if (sameScopePlatform) {
    if (createdBranchId) {
      await supabase
        .from("branches")
        .delete()
        .eq("id", createdBranchId)
        .eq("client_id", client.id);
    }

    return NextResponse.json(
      { message: "هذه المنصة مرتبطة مسبقًا بالنطاق المحدد" },
      { status: 409 }
    );
  }

  const { data: platform, error: platformError } = await supabase
    .from("client_platforms")
    .insert({
      client_id: client.id,
      branch_id: targetBranchId,
      platform_name: platformName,
      platform_url: normalizedPlatform.platformUrl,
      username: normalizedPlatform.username,
      business_activity: businessActivity,
      is_active: true,
    })
    .select("id")
    .single();

  if (platformError || !platform) {
    if (createdBranchId) {
      await supabase
        .from("branches")
        .delete()
        .eq("id", createdBranchId)
        .eq("client_id", client.id);
    }

    const isDuplicate = platformError?.code === "23505";
    const isForbidden = platformError?.code === "42501";

    return NextResponse.json(
      {
        message: isDuplicate
          ? "تمت إضافة المنصة مسبقًا"
          : isForbidden
          ? "غير مصرح بربط المنصة بالنطاق المحدد"
          : "تعذر حفظ المنصة",
      },
      { status: isDuplicate ? 409 : isForbidden ? 403 : 500 }
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
    console.warn("Platform sync webhook was not queued", {
      platformName,
      code:
        error instanceof PlatformSyncWebhookError
          ? error.code
          : "UNKNOWN_ERROR",
    });
  }

  return NextResponse.json(
    { id: platform.id, branchId: targetBranchId, syncQueued },
    { status: 201 }
  );
}
