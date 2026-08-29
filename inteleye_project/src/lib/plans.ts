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
    description: "للمنشآت الصغيرة التي تحتاج متابعة واضحة لسمعتها.",
    branches: 1,
    platforms: 1,
    features: [
      "لوحة تحكم تفاعلية.",
      "تحليل المشاعر والمؤشرات الأساسية.",
      "فرع واحد.",
      "منصة واحدة.",
      "تقارير أسبوعية.",
      "عرض التقارير المكتملة.",
      "اقتراحات ردود ذكية.",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceHalalas: 49_900,
    description: "للمنشآت المتنامية ومتعددة الفروع التي تحتاج تحليلات أعمق.",
    branches: 3,
    platforms: 2,
    featured: true,
    features: [
      "تشمل جميع مزايا Basic، بالإضافة إلى:",
      "حتى 3 فروع.",
      "حتى منصتين.",
      "إنشاء تقارير مخصصة حسب الفترة والإعدادات.",
      "تقارير وتحليلات متقدمة.",
      "متابعة أعمق لاتجاهات السمعة وتجربة العملاء.",
      "أولوية أعلى في المتابعة والدعم.",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    priceHalalas: 99_900,
    description: "للمؤسسات التي تحتاج تغطية واسعة ومتابعة مخصصة.",
    branches: 20,
    platforms: 4,
    features: [
      "تشمل جميع مزايا Pro، بالإضافة إلى:",
      "حتى 20 فرعًا.",
      "حتى 4 منصات.",
      "تقارير مخصصة وموسعة.",
      "تغطية وتحليل أوسع عبر الفروع والمنصات.",
      "دعم ومتابعة مخصصة.",
      "مناسبة للمؤسسات ذات العمليات والفروع المتعددة.",
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
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(priceHalalas / 100);
}
