import { PLAN_DETAILS } from "@/lib/plans";

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
    name: "Basic",

    price: String(PLAN_DETAILS.basic.priceHalalas / 100),

    description: "للمنشآت الصغيرة التي تحتاج متابعة واضحة لسمعتها.",

    features: [
      { text: "لوحة تحكم تفاعلية." },
      { text: "تحليل المشاعر والمؤشرات الأساسية." },
      { text: "فرع واحد." },
      { text: "منصة واحدة." },
      { text: "تقارير أسبوعية." },
      { text: "عرض التقارير المكتملة." },
      { text: "اقتراحات ردود ذكية." },
    ],
  },

  {
    name: "Pro",

    price: String(PLAN_DETAILS.pro.priceHalalas / 100),

    featured: true,

    description:
      "للمنشآت المتنامية ومتعددة الفروع التي تحتاج تحليلات أعمق.",

    features: [
      { text: "تشمل جميع مزايا Basic، بالإضافة إلى:" },
      { text: "حتى 3 فروع." },
      { text: "حتى منصتين." },
      { text: "إنشاء تقارير مخصصة حسب الفترة والإعدادات." },
      { text: "تقارير وتحليلات متقدمة." },
      { text: "متابعة أعمق لاتجاهات السمعة وتجربة العملاء." },
      { text: "أولوية أعلى في المتابعة والدعم." },
    ],
  },

  {
    name: "Enterprise",

    price: String(PLAN_DETAILS.enterprise.priceHalalas / 100),

    description: "للمؤسسات التي تحتاج تغطية واسعة ومتابعة مخصصة.",

    features: [
      { text: "تشمل جميع مزايا Pro، بالإضافة إلى:" },
      { text: "حتى 20 فرعًا." },
      { text: "حتى 4 منصات." },
      { text: "تقارير مخصصة وموسعة." },
      { text: "تغطية وتحليل أوسع عبر الفروع والمنصات." },
      { text: "دعم ومتابعة مخصصة." },
      { text: "مناسبة للمؤسسات ذات العمليات والفروع المتعددة." },
    ],
  },
];
