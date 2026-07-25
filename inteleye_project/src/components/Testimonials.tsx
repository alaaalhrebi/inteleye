"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "شركة الضيافة العربية",
    role: "قطاع الفنادق",
    image: "https://i.pravatar.cc/150?img=12",
    text: "بعد استخدام IntelEye استطعنا معرفة أسباب انخفاض التقييمات وتحسينها خلال أقل من شهر، وارتفع متوسط التقييم بشكل واضح.",
  },
  {
    name: "مطاعم النخبة",
    role: "قطاع المطاعم",
    image: "https://i.pravatar.cc/150?img=32",
    text: "اقتراحات الذكاء الاصطناعي وفرت على فريق خدمة العملاء ساعات طويلة من العمل اليدوي وأصبحت الردود أكثر احترافية.",
  },
  {
    name: "مجموعة الريادة الطبية",
    role: "القطاع الصحي",
    image: "https://i.pravatar.cc/150?img=24",
    text: "لوحة التحكم والتقارير التنفيذية ساعدت الإدارة في اتخاذ قرارات مبنية على بيانات حقيقية بدل التخمين.",
  },
];

export default function Testimonials() {
  return (
    <section className="bg-white py-20 sm:py-24 lg:py-28">

      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >

          <span className="inline-block rounded-full bg-[#BABDE2]/40 px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium text-[#374375]">

            آراء العملاء

          </span>

          <h2 className="mt-6 sm:mt-8 text-3xl sm:text-4xl lg:text-5xl font-bold text-primary">

            ماذا يقول عملاؤنا؟

          </h2>

          <p className="mt-6 sm:mt-8 text-base sm:text-lg lg:text-xl leading-8 lg:leading-9 text-gray-600">

            شركات من مختلف القطاعات تعتمد على IntelEye
            لتحسين تجربة العملاء وإدارة السمعة الرقمية.

          </p>

        </motion.div>
                {/* Testimonials */}

        <div className="mt-14 grid grid-cols-1 gap-6 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8 xl:mt-20">

          {testimonials.map((item, index) => (

            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: index * 0.15,
                duration: 0.6,
              }}
              whileHover={{
                y: -8,
                scale: 1.02,
              }}
              className="rounded-[24px] lg:rounded-[32px] border border-gray-100 bg-[#F8FAF8] p-5 sm:p-6 lg:p-8 shadow-lg transition-all hover:-translate-y-2 hover:shadow-2xl"
            >

              {/* Stars */}

              <div className="mb-5 flex gap-1">

                {[1,2,3,4,5].map((star)=>(

                  <Star
                    key={star}
                    size={18}
                    fill="#895159"
                    color="#895159"
                  />

                ))}

              </div>

              {/* Review */}

              <p className="text-sm leading-7 text-gray-600 sm:text-base sm:leading-8">

                "{item.text}"

              </p>

              {/* Customer */}

              <div className="mt-8 flex items-center gap-4">

                <img
                  src={item.image}
                  alt={item.name}
                  className="h-14 w-14 rounded-full object-cover sm:h-16 sm:w-16"
                />

                <div>

                  <h4 className="text-base sm:text-lg font-bold text-primary">

                    {item.name}

                  </h4>

                  <p className="text-sm text-gray-500">

                    {item.role}

                  </p>

                </div>

              </div>

            </motion.div>

          ))}

        </div>

      </div>

    </section>
  );
}

       
