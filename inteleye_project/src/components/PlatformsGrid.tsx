"use client";

import { motion } from "framer-motion";
import { 
  Globe, 
  Instagram, 
  Twitter, 
  MessageSquare, 
  Star,
  Smartphone
} from "lucide-react";

const platforms = [
  {
    name: "Google Maps",
    icon: Globe,
    color: "bg-blue-50 text-blue-600",
    description: "سحب وتحليل جميع التقييمات والتعليقات من فروعك على خرائط جوجل."
  },
  {
    name: "Instagram",
    icon: Instagram,
    color: "bg-pink-50 text-pink-600",
    description: "مراقبة التعليقات والمنشورات التي تذكر علامتك التجارية."
  },
  {
    name: "X (Twitter)",
    icon: Twitter,
    color: "bg-gray-50 text-gray-900",
    description: "تحليل التغريدات والردود لفهم انطباعات العملاء اللحظية."
  },
  {
    name: "TikTok",
    icon: Smartphone,
    color: "bg-black text-white",
    description: "متابعة التفاعل والتعليقات على فيديوهات منشأتك."
  },
  {
    name: "منصات التوصيل",
    icon: Star,
    color: "bg-yellow-50 text-yellow-600",
    description: "دعم منصات التوصيل الكبرى لجمع تقييمات طلبات العملاء."
  },
  {
    name: "المواقع المتخصصة",
    icon: MessageSquare,
    color: "bg-green-50 text-green-600",
    description: "ربط المواقع المتخصصة في التقييمات حسب مجال عملك."
  }
];

export default function PlatformsGrid() {
  return (
    <section id="platforms" className="bg-[#F8F7F3] py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12">
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center mb-16 sm:mb-20"
        >
          <span className="inline-flex items-center rounded-full bg-[#BABDE2]/40 px-4 py-2 text-xs sm:text-sm font-medium text-[#374375] mb-6">
            تغطية شاملة
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold leading-tight text-primary">
            من أين نجمع بياناتك؟
          </h2>
          <p className="mt-6 text-sm sm:text-base lg:text-lg leading-relaxed text-gray-600">
            يتصل IntelEye بأهم المنصات التي يتواجد عليها عملاؤك ليضمن لك رؤية كاملة وشاملة لسمعتك الرقمية في مكان واحد.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {platforms.map((platform, index) => {
            const Icon = platform.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                whileHover={{ y: -5 }}
                className="group rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm transition-all hover:shadow-md"
              >
                <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-xl ${platform.color}`}>
                  <Icon size={24} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-primary mb-3">
                  {platform.name}
                </h3>
                <p className="text-sm sm:text-base leading-relaxed text-gray-500">
                  {platform.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
