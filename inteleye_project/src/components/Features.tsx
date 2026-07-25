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
      className="bg-gradient-to-b from-[#F8FAF8] to-white py-20 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12">

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: .6 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl text-center"
        >

          <span className="inline-block rounded-full bg-[#BABDE2]/40 px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium text-[#374375]">
            لماذا IntelEye؟
          </span>

          <h2 className="mt-6 sm:mt-8 text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold leading-tight text-primary">

            كل ما تحتاجه لفهم عملائك

            <br />

            في منصة واحدة

          </h2>

          <p className="mt-6 sm:mt-8 text-base sm:text-lg lg:text-xl leading-8 lg:leading-9 text-gray-600">

            يساعدك IntelEye على تحليل تقييمات العملاء،
            اكتشاف المشكلات،
            إصدار تقارير ذكية،
            واقتراح أفضل الردود لتحسين تجربة العملاء
            ورفع تقييم منشأتك.

          </p>

        </motion.div>
                {/* Cards */}

        <div className="mt-12 grid grid-cols-1 gap-5 sm:mt-16 sm:grid-cols-2 sm:gap-6 lg:gap-6 xl:mt-20 xl:grid-cols-3 xl:gap-8">

          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.08,
                }}
                viewport={{ once: true }}
                whileHover={{
                  y: -8,
                  scale: 1.02,
                }}
                className="
                  group
                  rounded-[20px] sm:rounded-[24px]
                  lg:rounded-[30px]
                  border
                  border-gray-100
                  bg-white
                  p-4 sm:p-6
                  lg:p-8
                  shadow-md hover:shadow-lg
                  transition-all
                  hover:-translate-y-1 sm:hover:-translate-y-2
                  lg:hover:shadow-2xl
                "
              >

                {/* Icon */}

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7F8FD] transition-all duration-300 group-hover:bg-[#374375]/10 sm:h-14 sm:w-14 lg:h-16 lg:w-16">

                  <Icon
                    size={24}
                    className="sm:hidden text-primary transition-all duration-300 group-hover:scale-110 group-hover:text-[#895159]"
                  />
                  <Icon
                    size={30}
                    className="hidden sm:block text-primary transition-all duration-300 group-hover:scale-110 group-hover:text-[#895159]"
                  />

                </div>

                {/* Title */}

                <h3 className="mt-5 text-lg font-bold text-primary sm:mt-6 sm:text-xl lg:text-2xl">
                  {feature.title}
                </h3>

                {/* Description */}

                <p className="mt-3 text-sm leading-6 text-gray-600 sm:mt-4 sm:text-sm lg:text-base lg:leading-7">
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

      
