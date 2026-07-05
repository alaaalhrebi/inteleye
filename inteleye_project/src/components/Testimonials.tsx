"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "شركة الضيافة العربية",
    role: "قطاع الفنادق",
    image: "https://i.pravatar.cc/150?img=12",
    text: "بعد استخدام Intel Eye استطعنا معرفة أسباب انخفاض التقييمات وتحسينها خلال أقل من شهر، وارتفع متوسط التقييم بشكل واضح.",
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
    <section className="py-28 bg-white">

      <div className="max-w-7xl mx-auto px-8">

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: .6 }}
          className="text-center max-w-3xl mx-auto"
        >

          <span className="inline-block rounded-full bg-[#BABDE2]/40 text-[#374375] px-5 py-2 text-sm font-medium">

            آراء العملاء

          </span>

          <h2 className="text-5xl font-bold text-[#16352B] mt-8">

            ماذا يقول عملاؤنا؟

          </h2>

          <p className="mt-8 text-xl leading-9 text-gray-600">

            شركات من مختلف القطاعات تعتمد على Intel Eye لتحسين
            تجربة العملاء وإدارة السمعة الرقمية.

          </p>

        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8 mt-20">

          {testimonials.map((item, index) => (

            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: index * .15,
                duration: .6
              }}
              whileHover={{
                y: -10
              }}
              className="rounded-[32px] border border-gray-100 bg-[#F8FAF8] p-8 shadow-lg hover:shadow-2xl transition-all"
            >

              <div className="flex mb-6">

                {[1,2,3,4,5].map((star)=>(
                  <Star
                    key={star}
                    size={18}
                    fill="#FACC15"
                    color="#FACC15"
                  />
                ))}

              </div>

              <p className="leading-9 text-gray-600">

                "{item.text}"

              </p>

              <div className="flex items-center gap-4 mt-10">

                <img
                  src={item.image}
                  className="w-16 h-16 rounded-full object-cover"
                  alt={item.name}
                />

                <div>

                  <h4 className="font-bold text-[#16352B]">

                    {item.name}

                  </h4>

                  <p className="text-gray-500 text-sm">

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