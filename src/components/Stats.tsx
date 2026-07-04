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
    color: "text-yellow-500",
    bg: "bg-yellow-50",
  },
  {
    icon: Users,
    value: "120K+",
    label: "عميل تم تحليل آرائهم",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: MessageSquareText,
    value: "850K+",
    label: "تعليق تم تحليله",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    icon: TrendingUp,
    value: "98%",
    label: "دقة تحليل الذكاء الاصطناعي",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
];

export default function Stats() {
  return (
    <section className="py-24 bg-[#F5F9F6]">

      <div className="max-w-7xl mx-auto px-8">

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: .6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >

          <span className="inline-block rounded-full bg-green-100 text-green-700 px-5 py-2 mb-6">

            أرقام تتحدث

          </span>

          <h2 className="text-5xl font-bold text-[#16352B]">

            نتائج تساعدك على اتخاذ القرار

          </h2>

          <p className="mt-6 text-gray-600 text-lg max-w-3xl mx-auto leading-9">

            يحول Intel Eye آلاف التعليقات إلى مؤشرات ورسوم بيانية
            تساعدك على معرفة مستوى رضا العملاء واتخاذ قرارات مبنية
            على البيانات.

          </p>

        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">

          {stats.map((item, index) => {

            const Icon = item.icon;

            return (

              <motion.div

                key={index}

                initial={{
                  opacity:0,
                  y:40
                }}

                whileInView={{
                  opacity:1,
                  y:0
                }}

                viewport={{
                  once:true
                }}

                transition={{
                  delay:index*.1,
                  duration:.6
                }}

                whileHover={{
                  y:-8,
                  scale:1.03
                }}

                className="
                  bg-white
                  rounded-[32px]
                  shadow-lg
                  border
                  border-gray-100
                  p-8
                  text-center
                  hover:shadow-2xl
                  transition-all
                "

              >

                <div
                  className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${item.bg}`}
                >

                  <Icon
                    size={30}
                    className={item.color}
                  />

                </div>

                <h3 className="text-5xl font-bold text-[#16352B] mt-8">

                  {item.value}

                </h3>

                <p className="mt-4 text-gray-600 leading-7">

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