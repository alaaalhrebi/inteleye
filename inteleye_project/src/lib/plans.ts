export const PLAN_IDS = ["basic", "pro", "enterprise"] as const;

export type PlanId = (typeof PLAN_IDS)[number];

export const PLAN_DETAILS: Record<
  PlanId,
  {
    id: PlanId;
    name: string;
    priceHalalas: number;
    description: string;
    branches: number;
    platforms: number;
    featured?: boolean;
    features: string[];
  }
> = {
  basic: {
    id: "basic",
    name: "Basic",
    priceHalalas: 19_900,
    description: "للبدايات والمنشآت الصغيرة التي تحتاج رؤية واضحة لسمعتها.",
    branches: 1,
    platforms: 1,
    features: [
      "لوحة تحكم وتحليلات أساسية",
      "فرع واحد ومنصة واحدة",
      "تقارير أسبوعية",
      "اقتراحات ردود ذكية",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceHalalas: 49_900,
    description: "للمنشآت المتنامية التي تدير عدة فروع وتحتاج تقارير أعمق.",
    branches: 3,
    platforms: 2,
    featured: true,
    features: [
      "كل مزايا Basic",
      "حتى 3 فروع ومنصتين",
      "تقارير مخصصة ومتقدمة",
      "أولوية في متابعة السمعة",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    priceHalalas: 99_900,
    description: "للمؤسسات التي تحتاج تغطية أوسع ودعمًا مخصصًا.",
    branches: 20,
    platforms: 4,
    features: [
      "كل مزايا Pro",
      "حتى 20 فرعًا و4 منصات",
      "تقارير مخصصة موسعة",
      "دعم ومتابعة مخصصة",
    ],
  },
};

const PLAN_RANK: Record<PlanId, number> = {
  basic: 0,
  pro: 1,
  enterprise: 2,
};

export type CheckoutQuote =
  | { mode: "subscription"; amountHalalas: number }
  | { mode: "upgrade"; amountHalalas: number }
  | { mode: "current"; amountHalalas: 0 }
  | { mode: "downgrade"; amountHalalas: 0 };

export function normalizePlan(value: unknown): PlanId {
  if (typeof value !== "string") return "basic";
  const normalized = value.trim().toLowerCase();
  return PLAN_IDS.includes(normalized as PlanId)
    ? (normalized as PlanId)
    : "basic";
}

export function getCheckoutQuote({
  currentPlan,
  targetPlan,
  hasActiveSubscription,
}: {
  currentPlan: unknown;
  targetPlan: unknown;
  hasActiveSubscription: boolean;
}): CheckoutQuote {
  const current = normalizePlan(currentPlan);
  const target = normalizePlan(targetPlan);

  if (!hasActiveSubscription) {
    return {
      mode: "subscription",
      amountHalalas: PLAN_DETAILS[target].priceHalalas,
    };
  }

  if (PLAN_RANK[target] === PLAN_RANK[current]) {
    return { mode: "current", amountHalalas: 0 };
  }

  if (PLAN_RANK[target] < PLAN_RANK[current]) {
    return { mode: "downgrade", amountHalalas: 0 };
  }

  return {
    mode: "upgrade",
    amountHalalas:
      PLAN_DETAILS[target].priceHalalas - PLAN_DETAILS[current].priceHalalas,
  };
}

export function formatPrice(priceHalalas: number) {
  return new Intl.NumberFormat("ar-SA", {
    maximumFractionDigits: 0,
  }).format(priceHalalas / 100);
}
