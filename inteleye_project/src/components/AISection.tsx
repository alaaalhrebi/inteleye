"use client";

import { motion } from "framer-motion";
import {
  BrainCircuit,
  SearchCheck,
  Sparkles,
  ArrowRight
} from "lucide-react";

const steps = [
  {
    icon: SearchCheck,
    title: "جمع التقييمات",
    description:
      "يجمع Intel Eye تقييمات العملاء من المنصات المختلفة ويقوم بتوحيدها في لوحة تحكم واحدة."
  },
  {
    icon: BrainCircuit,
    title: "تحليل الذكاء الاصطناعي",
    description:
      "يقوم الذكاء الاصطناعي بتحليل المشاعر، استخراج المواضيع المتكررة، وفهم أسباب رضا أو استياء العملاء."
  },
  {
    icon: Sparkles,
    title: "توصيات ذكية",
    description:
      "يعرض النظام أهم الإجراءات المقترحة لتحسين الخدمة، رفع التقييم، وحماية سمعة المنشأة."
  }
];

export default function AISection() {
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

          <span className="inline-flex items-center gap-2 rounded-full bg-green-100 text-green-700 px-5 py-2">

            <BrainCircuit size={16} />

            كيف يعمل Intel Eye

          </span>

          <h2 className="text-5xl font-bold text-[#16352B] mt-8 leading-tight">

            الذكاء الاصطناعي يحول
            <br />
            التعليقات إلى قرارات

          </h2>

          <p className="text-gray-600 text-xl leading-9 mt-8">

            بدل قراءة مئات التعليقات يدوياً،
            يقوم Intel Eye بتحليلها، تصنيفها،
            واستخراج أهم المعلومات التي تساعدك
            على تحسين تجربة العملاء.

          </p>

        </motion.div>

        {/* Steps */}

        <div className="grid lg:grid-cols-3 gap-10 mt-20">

          {steps.map((step, index) => {

            const Icon = step.icon;

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

                transition={{
                  delay:index*.15,
                  duration:.6
                }}

                viewport={{
                  once:true
                }}

                whileHover={{
                  y:-8
                }}

                className="relative rounded-[32px] bg-[#F8FAF8] border border-gray-100 p-8 shadow-lg hover:shadow-2xl transition-all"

              >

                <div className="w-16 h-16 rounded-2xl bg-[#374375] flex items-center justify-center text-white">

                  <Icon size={30}/>

                </div>

                <h3 className="text-2xl font-bold text-[#16352B] mt-8">

                  {step.title}

                </h3>

                <p className="text-gray-600 leading-8 mt-5">

                  {step.description}

                </p>

                <div className="mt-8 flex items-center gap-2 text-[#374375] font-semibold">

                  معرفة المزيد

                  <ArrowRight size={18}/>

                </div>

                <div className="absolute top-6 left-6 text-6xl font-bold text-gray-100">

                  0{index+1}

                </div>

              </motion.div>

            )

          })}

        </div>

      </div>

    </section>
  );
}