export type SubscriptionClient = {
  subscription_status?: string | null;
  plan?: string | null;
  trial_ends_at?: string | null;
  current_period_end?: string | null;
  allowed_platforms_count?: number | null;
};

type PermissionContext = {
  now?: Date | number | string;
  currentBranchesCount?: number;
  currentPlatformsCount?: number;
};

const BRANCH_LIMITS: Record<string, number> = {
  basic: 1,
  pro: 3,
  enterprise: 20,
};

const PLATFORM_LIMITS: Record<string, number> = {
  basic: 1,
  pro: 2,
  enterprise: 4,
};

function timestamp(value: Date | number | string | null | undefined) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (!value) return Number.NaN;
  return new Date(value).getTime();
}

export function getSubscriptionPermissions(
  client: SubscriptionClient,
  context: PermissionContext = {}
) {
  const now = timestamp(context.now ?? Date.now());
  const status = client.subscription_status?.trim().toLowerCase() || "pending";
  const plan = client.plan?.trim().toLowerCase() || "basic";

  const trialEnd = timestamp(client.trial_ends_at);
  const isTrialActive =
    status === "trial" && Number.isFinite(trialEnd) && trialEnd > now;

  const paidPeriodEnd = timestamp(client.current_period_end);
  const paidPeriodIsValid =
    !client.current_period_end ||
    (Number.isFinite(paidPeriodEnd) && paidPeriodEnd > now);
  const hasActiveSubscription = status === "active" && paidPeriodIsValid;

  const canAccessDashboard = isTrialActive || hasActiveSubscription;
  const canManageBranches = hasActiveSubscription;
  const canAccessReports = hasActiveSubscription;
  const isAdvancedReportsPlan = plan === "pro" || plan === "enterprise";
  const canCreateCustomReport =
    hasActiveSubscription && isAdvancedReportsPlan;

  const branchLimit = BRANCH_LIMITS[plan] ?? BRANCH_LIMITS.basic;
  const savedPlatformLimit = Number(client.allowed_platforms_count);
  const planPlatformLimit = PLATFORM_LIMITS[plan];

  const configuredPlatformLimit =
    planPlatformLimit ??
    (Number.isInteger(savedPlatformLimit) && savedPlatformLimit > 0
      ? savedPlatformLimit
      : PLATFORM_LIMITS.basic);
  const platformLimit = isTrialActive ? 1 : configuredPlatformLimit;

  const currentBranchesCount = Math.max(
    context.currentBranchesCount ?? 0,
    0
  );
  const currentPlatformsCount = Math.max(
    context.currentPlatformsCount ?? 0,
    0
  );

  return {
    status,
    plan,
    isTrialActive,
    hasActiveSubscription,
    canAccessDashboard,
    canManageBranches,
    canAccessReports,
    canViewReports: canAccessReports,
    // الاسم القديم مستخدم في القائمة الجانبية، ويعني الوصول إلى صفحة التقارير.
    canAccessCustomReports: canAccessReports,
    canCreateCustomReport,
    canAddBranch:
      canManageBranches && currentBranchesCount < branchLimit,
    canUsePlatform: canAccessDashboard && platformLimit > 0,
    canAddPlatform:
      canAccessDashboard && currentPlatformsCount < platformLimit,
    branchLimit,
    platformLimit,
  };
}
