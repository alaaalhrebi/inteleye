export type Feature = {
  text: string;
};

export type Plan = {
  name: string;
  price: string;
  description: string;
  featured?: boolean;
  features: Feature[];
};

export const plans: Plan[] = [
  {
    name: "Starter",

    price: "299",

    description:
      "مثالية للمنشآت الصغيرة التي ترغب في متابعة تقييمات العملاء وتحليلها بالذكاء الاصطناعي.",

    features: [
      { text: "تحليل حتى 2,000 تعليق شهريًا" },
      { text: "تحليل المشاعر AI" },
      { text: "اقتراح الردود الذكية" },
      { text: "تقارير أسبوعية" },
      { text: "لوحة تحكم تفاعلية" },
      { text: "دعم عبر البريد الإلكتروني" },
    ],
  },

  {
    name: "Professional",

    price: "799",

    featured: true,

    description:
      "الخيار الأفضل للشركات المتوسطة التي تحتاج إلى تحليلات متقدمة وتقارير تنفيذية دقيقة.",

    features: [
      { text: "تحليل غير محدود للتعليقات" },
      { text: "تحليل المشاعر AI المتقدم" },
      { text: "اقتراح ردود احترافية" },
      { text: "تقارير تنفيذية PDF" },
      { text: "مراقبة السمعة لحظيًا" },
      { text: "تحليل أسباب انخفاض التقييم" },
      { text: "إدارة عدة فروع" },
      { text: "دعم فني أولوية" },
    ],
  },

  {
    name: "Enterprise",

    price: "حسب الطلب",

    description:
      "حلول مخصصة للمؤسسات الكبيرة مع تكاملات API ولوحات معلومات مخصصة ودعم كامل.",

    features: [
      { text: "كل مميزات Professional" },
      { text: "API Integration" },
      { text: "صلاحيات متعددة للمستخدمين" },
      { text: "لوحات معلومات مخصصة" },
      { text: "ربط مع الأنظمة الداخلية" },
      { text: "تقارير مخصصة" },
      { text: "مدير حساب مخصص" },
      { text: "دعم 24/7" },
    ],
  },
];