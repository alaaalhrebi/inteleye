type DatabaseError = { code?: string; message?: string } | null | undefined;

export function subscriptionWriteError(error: DatabaseError) {
  const message = error?.message ?? "";
  if (message.includes("branch_plan_limit_reached")) {
    return { status: 403, message: "وصلت إلى حد الفروع في باقتك الحالية" };
  }
  if (message.includes("platform_link_limit_reached")) {
    return { status: 403, message: "وصلت إلى حد روابط المنصات في باقتك الحالية" };
  }
  if (message.includes("platform_type_limit_reached")) {
    return { status: 403, message: "وصلت إلى حد أنواع المنصات في باقتك الحالية" };
  }
  if (message.includes("platform_branch_client_mismatch")) {
    return { status: 403, message: "الفرع المحدد لا ينتمي إلى حسابك" };
  }
  if (error?.code === "40001" || error?.code === "40P01") {
    return { status: 409, message: "تعارض الطلب مع عملية أخرى. أعد المحاولة" };
  }
  return null;
}
