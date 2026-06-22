const plans = [
  {
    id: "basic",
    name: "الباقة الأساسية",
    price: "99",
    description: "مناسبة للمطاعم الصغيرة أو فرع واحد.",
    features: [
      "فرع واحد",
      "تحليل تعليقات Google Maps",
      "تقرير شهري",
      "تنبيهات أساسية",
    ],
  },
  {
    id: "pro",
    name: "الباقة الاحترافية",
    price: "199",
    description: "مناسبة للمطاعم والكافيهات متعددة الفروع.",
    features: [
      "حتى 3 فروع",
      "تحليل المشاعر والمشاكل",
      "تقرير أسبوعي",
      "تنبيهات عبر البريد",
      "توصيات لتحسين التقييم",
    ],
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "باقة الأعمال",
    price: "399",
    description: "للمنشآت التي تحتاج متابعة موسعة وتقارير متقدمة.",
    features: [
      "عدد فروع أكبر",
      "تقارير PDF",
      "لوحة تحكم متقدمة",
      "دعم مخصص",
      "إمكانية الربط مع أكثر من منصة",
    ],
  },
];

export default function HomePage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f4f0] text-[#1a1a2e]">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <p className="mb-4 text-sm font-semibold text-[#7c6f57]">
            Reputation Manager
          </p>

          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            راقب سمعة منشأتك واعرف مشاكل العملاء قبل أن تتكرر
          </h1>

          <p className="text-lg text-gray-600 leading-8">
            منصة تساعد المطاعم والكافيهات على جمع وتحليل تعليقات العملاء،
            واكتشاف أكثر المشاكل تكرارًا، وإرسال تقارير وتنبيهات تساعدك
            على تحسين التقييم وتجربة العميل.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-3xl border bg-white p-8 shadow-sm ${
                plan.highlighted
                  ? "border-[#1a1a2e] scale-[1.02]"
                  : "border-[#eeede8]"
              }`}
            >
              {plan.highlighted && (
                <div className="mb-4 inline-block rounded-full bg-[#1a1a2e] px-4 py-1 text-xs text-white">
                  الأكثر مناسبة
                </div>
              )}

              <h2 className="text-2xl font-bold mb-2">{plan.name}</h2>

              <p className="text-gray-500 mb-6 leading-7">
                {plan.description}
              </p>

              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-gray-500"> ريال / شهريًا</span>
              </div>

              <ul className="space-y-3 mb-8 text-sm text-gray-700">
                {plan.features.map((feature) => (
                  <li key={feature}>✓ {feature}</li>
                ))}
              </ul>

              <a
                href={`/login?plan=${plan.id}`}
                className={`block rounded-xl px-5 py-3 text-center font-semibold ${
                  plan.highlighted
                    ? "bg-[#1a1a2e] text-white"
                    : "bg-[#f5f4f0] text-[#1a1a2e]"
                }`}
              >
                اختر هذه الباقة
              </a>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
