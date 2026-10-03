import { NextResponse } from "next/server";

import {
  PlatformSyncWebhookError,
  queuePlatformSync,
  type SyncPlatformName,
} from "@/lib/platforms/n8n";
import { normalizePlatformValue } from "@/lib/platforms/normalize";
import { getSubscriptionPermissions } from "@/lib/subscription-permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const BRANCH_STATUSES = new Set(["active", "suspended", "deleted"]);
const PLATFORM_NAMES = new Set(["google_maps", "x", "tiktok", "instagram"]);

type BranchActionRequest = {
  action?: unknown;
  name?: unknown;
  businessActivity?: unknown;
  status?: unknown;
  platformId?: unknown;
  platformValue?: unknown;
};

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function rpcErrorResponse(message: string) {
  if (message.includes("platform_link_change_cooldown")) {
    return NextResponse.json(
      { message: "لا يمكن تغيير رابط هذه المنصة قبل انتهاء مهلة الشهر" },
      { status: 429 }
    );
  }
  if (message.includes("duplicate_active_platform_link")) {
    return NextResponse.json(
      { message: "تمت إضافة رابط المنصة مسبقًا" },
      { status: 409 }
    );
  }
  if (
    message.includes("forbidden") ||
    message.includes("permission") ||
    message.includes("42501")
  ) {
    return NextResponse.json({ message: "غير مصرح بإدارة هذا الفرع" }, { status: 403 });
  }
  if (message.includes("deleted_branch_cannot_be_reactivated")) {
    return NextResponse.json(
      { message: "لا يمكن إعادة تفعيل فرع محذوف" },
      { status: 409 }
    );
  }

  return NextResponse.json(
    { message: "تعذر حفظ التعديل، حاول مرة أخرى" },
    { status: 500 }
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: { branchId: string } }
) {
  const branchId = Number(params.branchId);
  if (!Number.isSafeInteger(branchId) || branchId <= 0) {
    return NextResponse.json({ message: "معرف الفرع غير صالح" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "يجب تسجيل الدخول أولًا" }, { status: 401 });
  }

  let body: BranchActionRequest;
  try {
    body = (await request.json()) as BranchActionRequest;
  } catch {
    return NextResponse.json({ message: "بيانات الطلب غير صالحة" }, { status: 400 });
  }

  const { data: client } = await supabase
    .from("clients")
    .select(
      "id, subscription_status, plan, trial_ends_at, current_period_end, allowed_platforms_count"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!client || !getSubscriptionPermissions(client).canManageBranches) {
    return NextResponse.json(
      { message: "إدارة الفروع متاحة للاشتراكات المدفوعة السارية" },
      { status: 403 }
    );
  }

  const { data: branch } = await supabase
    .from("branches")
    .select("id, client_id, status")
    .eq("id", branchId)
    .eq("client_id", client.id)
    .maybeSingle();

  if (!branch || branch.status === "deleted") {
    return NextResponse.json({ message: "الفرع غير موجود" }, { status: 404 });
  }

  const action = textValue(body.action);

  if (action === "update_details") {
    const name = textValue(body.name);
    const businessActivity = textValue(body.businessActivity);
    if (!name || !businessActivity) {
      return NextResponse.json(
        { message: "أدخل اسم الفرع ونشاطه" },
        { status: 400 }
      );
    }

    const { error } = await supabase.rpc("update_branch_details", {
      p_branch_id: branchId,
      p_name: name,
      p_business_activity: businessActivity,
    });

    if (error) return rpcErrorResponse(error.message);
    return NextResponse.json({ message: "تم تحديث بيانات الفرع" });
  }

  if (action === "set_status") {
    const status = textValue(body.status);
    if (!BRANCH_STATUSES.has(status)) {
      return NextResponse.json({ message: "حالة الفرع غير صالحة" }, { status: 400 });
    }

    const { error } = await supabase.rpc("set_branch_status", {
      p_branch_id: branchId,
      p_status: status,
    });
    if (error) return rpcErrorResponse(error.message);

    let syncQueued = 0;
    if (status === "active") {
      const { data: platforms } = await supabase
        .from("client_platforms")
        .select("id, platform_name")
        .eq("client_id", client.id)
        .eq("branch_id", branchId)
        .eq("is_active", true)
        .is("archived_at", null);

      for (const platform of platforms ?? []) {
        if (!PLATFORM_NAMES.has(platform.platform_name)) continue;
        try {
          await queuePlatformSync({
            platformId: platform.id,
            platformName: platform.platform_name as SyncPlatformName,
          });
          syncQueued += 1;
        } catch (error) {
          console.warn("Reactivated platform sync was not queued", {
            platformName: platform.platform_name,
            code:
              error instanceof PlatformSyncWebhookError
                ? error.code
                : "UNKNOWN_ERROR",
          });
        }
      }
    }

    return NextResponse.json({
      message:
        status === "active"
          ? "تمت إعادة تفعيل الفرع"
          : status === "suspended"
            ? "تم إيقاف الفرع مؤقتًا مع الاحتفاظ ببياناته"
            : "تم حذف الفرع بأمان مع الاحتفاظ ببياناته التاريخية",
      syncQueued,
    });
  }

  if (action === "rotate_platform_link") {
    if (branch.status !== "active") {
      return NextResponse.json(
        { message: "فعّل الفرع قبل تعديل رابط المنصة" },
        { status: 409 }
      );
    }

    const platformId = Number(body.platformId);
    const platformValue = textValue(body.platformValue);
    if (!Number.isSafeInteger(platformId) || platformId <= 0 || !platformValue) {
      return NextResponse.json({ message: "بيانات المنصة غير صالحة" }, { status: 400 });
    }

    const { data: platform } = await supabase
      .from("client_platforms")
      .select("id, platform_name")
      .eq("id", platformId)
      .eq("client_id", client.id)
      .eq("branch_id", branchId)
      .eq("is_active", true)
      .is("archived_at", null)
      .maybeSingle();

    if (!platform || !PLATFORM_NAMES.has(platform.platform_name)) {
      return NextResponse.json({ message: "المنصة غير موجودة" }, { status: 404 });
    }

    const normalized = await normalizePlatformValue(platform.platform_name, platformValue);
    if (!normalized) {
      return NextResponse.json(
        {
          message:
            platform.platform_name === "google_maps"
              ? "رابط Google Maps غير صالح. انسخ رابط المشاركة من تطبيق خرائط Google"
              : "رابط المنصة غير صالح",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc("rotate_branch_platform_link", {
      p_branch_id: branchId,
      p_platform_id: platformId,
      p_platform_url: normalized.platformUrl,
      p_username: normalized.username,
    });

    if (error) return rpcErrorResponse(error.message);

    const result = Array.isArray(data) ? data[0] : data;
    let syncQueued = false;
    if (result?.changed) {
      try {
        await queuePlatformSync({
          platformId: Number(result.platform_id),
          platformName: result.platform_name as SyncPlatformName,
        });
        syncQueued = true;
      } catch (queueError) {
        console.warn("Rotated platform sync was not queued", {
          platformName: result.platform_name,
          code:
            queueError instanceof PlatformSyncWebhookError
              ? queueError.code
              : "UNKNOWN_ERROR",
        });
      }
    }

    return NextResponse.json({
      message: result?.changed
        ? "تم تغيير الرابط وأرشفة الاتصال السابق"
        : "الرابط مطابق للرابط الحالي ولم تُحتسب عملية تغيير",
      changed: Boolean(result?.changed),
      nextLinkChangeAt: result?.next_link_change_at ?? null,
      syncQueued,
    });
  }

  return NextResponse.json({ message: "العملية غير مدعومة" }, { status: 400 });
}
