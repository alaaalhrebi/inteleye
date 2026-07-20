"use client";

import { motion } from "framer-motion";
import {
  Brain,
  MessageSquareText,
  BarChart3,
  ShieldCheck,
  SearchCheck,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "تحليل ذكي للتقييمات",
    description:
      "يحلل IntelEye آلاف التعليقات باستخدام الذكاء الاصطناعي ويستخرج أهم الأفكار خلال ثوانٍ.",
  },
  {
    icon: MessageSquareText,
    title: "اقتراح ردود احترافية",
    description:
      "يقترح ردودًا مناسبة لكل تعليق مع المحافظة على هوية منشأتك.",
  },
  {
    icon: BarChart3,
    title: "تقارير تنفيذية",
    description:
      "لوحات معلومات ورسوم بيانية تساعدك على اتخاذ قرارات مبنية على البيانات.",
  },
  {
    icon: ShieldCheck,
    title: "مراقبة السمعة",
    description:
      "تنبيهات فورية عند انخفاض التقييم أو زيادة الشكاوى لحماية سمعة منشأتك.",
  },
  {
    icon: SearchCheck,
    title: "اكتشاف المشكلات المتكررة",
    description:
      "يتعرف على أكثر المشكلات التي يذكرها العملاء ويعرضها بطريقة واضحة وسهلة.",
  },
  {
    icon: Sparkles,
    title: "توصيات AI",
    description:
      "يقترح خطوات عملية لتحسين تجربة العملاء ورفع متوسط التقييم.",
  },
];

export default function Features() {
  return (
    <section
      id="features"
      className="py-28 bg-gradient-to-b from-[#F8FAF8] to-white"
    >
      <div className="max-w-6xl mx-auto px-6">

        {/* Header */}

        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto"
        >
          <span className="inline-block rounded-full bg-[#BABDE2]/30 text-primary px-5 py-2 text-sm font-medium">
            لماذا IntelEye؟
          </span>

          <h2 className="text-5xl font-bold text-primary mt-8 leading-tight">
            كل ما تحتاجه لفهم عملائك
            <br />
            في منصة واحدة
          </h2>

          <p className="mt-8 text-xl text-gray-600 leading-9">
            يساعدك IntelEye على تحليل تقييمات العملاء واكتشاف المشكلات
            وإصدار تقارير ذكية واقتراح أفضل الردود لتحسين تجربة العملاء
            ورفع تقييم منشأتك.
          </p>
        </motion.div>

        {/* Features */}

        <div className="mt-24 space-y-14">

          {features.map((feature, index) => {

            const Icon = feature.icon;

            return (

              <motion.div
                key={index}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.08,
                }}
                viewport={{ once: true }}
                whileHover={{
                  x: 8,
                }}
                className="group"
              >

                <div className="flex items-start gap-8">

                  {/* Icon */}

                  <div className="flex flex-col items-center flex-shrink-0">

                    <Icon
                      size={38}
                      className="
                        text-primary
                        stroke-[1.8]
                        transition-all
                        duration-300
                        group-hover:scale-110
                      "
                    />

                    {index !== features.length - 1 && (
                      <div className="w-[2px] h-28 bg-primary/20 rounded-full mt-6"></div>
                    )}

                  </div>

                  {/* Content */}

                  <div className="pb-8">

                    <h3 className="text-3xl font-bold text-primary">
                      {feature.title}
                    </h3>

                    <p className="mt-4 text-gray-600 text-lg leading-9 max-w-2xl">
                      {feature.description}
                    </p>

                  </div>

                </div>

              </motion.div>

            );

          })}

        </div>

      </div>
    </section>
  );
}
