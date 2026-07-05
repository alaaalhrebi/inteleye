"use client";

import { motion } from "framer-motion";
import {
  Brain,
  MessageSquare,
  BarChart3,
  ShieldCheck,
  BellRing,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "تحليل ذكي للتقييمات",
    description:
      "يحلل Intel Eye آلاف التعليقات باستخدام الذكاء الاصطناعي ويستخرج أهم الأفكار خلال ثوانٍ.",
    color: "bg-[#BABDE2]/40 text-[#374375]",
  },
  {
    icon: MessageSquare,
    title: "اقتراح ردود احترافية",
    description:
      "يقترح ردودًا مناسبة لكل تعليق مع المحافظة على هوية منشأتك.",
    color: "bg-blue-100 text-blue-700",
  },
  {
    icon: BarChart3,
    title: "تقارير تنفيذية",
    description:
      "لوحات معلومات ورسوم بيانية تساعدك على اتخاذ قرارات مبنية على البيانات.",
    color: "bg-yellow-100 text-yellow-700",
  },
  {
    icon: ShieldCheck,
    title: "مراقبة السمعة",
    description:
      "تنبيهات عند انخفاض التقييم أو زيادة الشكاوى لحماية سمعة منشأتك.",
    color: "bg-red-100 text-red-600",
  },
  {
    icon: BellRing,
    title: "اكتشاف المشكلات المتكررة",
    description:
      "يتعرف على أكثر المشكلات التي يذكرها العملاء ويعرضها بوضوح.",
    color: "bg-purple-100 text-purple-700",
  },
  {
    icon: Sparkles,
    title: "توصيات AI",
    description:
      "يقترح خطوات عملية لتحسين تجربة العملاء ورفع متوسط التقييم.",
    color: "bg-[#DFAEA1]/40 text-[#374375]",
  },
];

export default function Features() {
  return (
    <section
      id="features"
      className="py-28 bg-gradient-to-b from-[#F8FAF8] to-white"
    >
      <div className="max-w-7xl mx-auto px-8">

        {/* Header */}

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: .6 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto"
        >

          <span className="inline-block rounded-full bg-[#BABDE2]/40 text-[#374375] px-5 py-2 text-sm font-medium">

            لماذا Intel Eye؟

          </span>

          <h2 className="text-5xl font-bold mt-8 text-[#16352B] leading-tight">

            كل ما تحتاجه لفهم عملائك
            <br />
            في منصة واحدة

          </h2>

          <p className="mt-8 text-xl text-gray-600 leading-9">

            يساعدك Intel Eye على تحليل تقييمات العملاء، اكتشاف المشكلات،
            إصدار تقارير ذكية، واقتراح أفضل الردود لتحسين تجربة العملاء
            ورفع تقييم منشأتك.

          </p>

        </motion.div>

        {/* Cards */}

        <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-8 mt-20">

          {features.map((feature, index) => {

            const Icon = feature.icon;

            return (

              <motion.div
                key={index}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: .5,
                  delay: index * .1,
                }}
                viewport={{ once: true }}
                whileHover={{
                  y: -8,
                  scale: 1.02,
                }}
                className="
                  rounded-[30px]
                  bg-white
                  p-8
                  border
                  border-gray-100
                  shadow-lg
                  hover:shadow-2xl
                  transition-all
                "
              >

                <div
                  className={`
                    w-16
                    h-16
                    rounded-2xl
                    flex
                    items-center
                    justify-center
                    ${feature.color}
                  `}
                >

                  <Icon size={30} />

                </div>

                <h3 className="text-2xl font-bold text-[#16352B] mt-8">

                  {feature.title}

                </h3>

                <p className="text-gray-600 leading-8 mt-5">

                  {feature.description}

                </p>

              </motion.div>

            );

          })}

        </div>

      </div>
    </section>
  );
}