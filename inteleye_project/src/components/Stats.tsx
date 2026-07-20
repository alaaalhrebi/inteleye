"use client";

import { motion } from "framer-motion";
import {
  Star,
  Users,
  MessageSquareText,
  TrendingUp,
} from "lucide-react";

const stats = [
  {
    icon: Star,
    value: "4.9",
    label: "متوسط التقييم",
  },
  {
    icon: Users,
    value: "120K+",
    label: "عميل تم تحليل آرائهم",
  },
  {
    icon: MessageSquareText,
    value: "850K+",
    label: "تعليق تم تحليله",
  },
  {
    icon: TrendingUp,
    value: "98%",
    label: "دقة تحليل الذكاء الاصطناعي",
  },
];

export default function Stats() {
  return (
    <section className="py-24 bg-[#F5F9F6]">
      <div className="max-w-7xl mx-auto px-8">

        {/* Header */}

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: .6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block rounded-full bg-[#BABDE2]/40 text-[#374375] px-5 py-2 mb-6">
            أرقام تتحدث
          </span>

          <h2 className="text-5xl font-bold text-primary">
            نتائج تساعدك على اتخاذ القرار
          </h2>

          <p className="mt-6 text-gray-600 text-lg max-w-3xl mx-auto leading-9">
            يحول IntelEye آلاف التعليقات إلى مؤشرات ورسوم بيانية
            تساعدك على معرفة مستوى رضا العملاء واتخاذ قرارات مبنية
            على البيانات.
          </p>
        </motion.div>

        {/* Cards */}

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">

          {stats.map((item, index) => {

            const Icon = item.icon;

            return (

              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  delay: index * .1,
                  duration: .6,
                }}
                whileHover={{
                  y: -6,
                  scale: 1.02,
                }}
                className="
                  group
                  bg-white
                  rounded-[24px]
                  border
                  border-gray-100
                  shadow-md
                  hover:shadow-xl
                  transition-all
                  p-6
                  text-center
                "
              >

                {/* Icon */}

                <div className="w-14 h-14 mx-auto flex items-center justify-center">
                  <Icon
                    size={30}
                    className="
                      text-primary
                      stroke-[1.8]
                      transition-all
                      duration-300
                      group-hover:scale-110
                    "
                  />
                </div>

                {/* Number */}

                <h3 className="text-4xl font-bold text-primary mt-5">
                  {item.value}
                </h3>

                {/* Label */}

                <p className="mt-3 text-gray-600 leading-7 text-sm">
                  {item.label}
                </p>

              </motion.div>

            );

          })}

        </div>

      </div>
    </section>
  );
}
