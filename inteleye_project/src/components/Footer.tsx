import Image from "next/image";
import {
  Mail, Phone, MapPin, Linkedin, Twitter, Instagram,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#24304F] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%)]" />
      <div className="relative mx-auto max-w-7xl px-8 py-24">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-2xl">
            <Image src="/logo.png" alt="INTELEYE" width={82} height={82} className="object-contain"/>
          </div>

          <h2 className="mt-5 text-5xl font-black tracking-tight">INTELEYE</h2>
          <p className="mt-2 text-lg text-white/70">AI Customer Experience Platform</p>

          <p className="mt-8 max-w-2xl text-lg leading-9 text-white/80">
            منصة ذكاء اصطناعي تساعد الشركات على تحليل تقييمات العملاء واكتشاف المشكلات
            وإصدار تقارير ذكية واقتراح الردود المناسبة لتحسين السمعة الرقمية.
          </p>
        </div>

        <div className="my-16 h-px bg-white/10"/>

        <div className="grid grid-cols-1 gap-14 lg:grid-cols-3">
          <div>
            <h3 className="mb-6 text-2xl font-bold">روابط سريعة</h3>
            <ul className="space-y-4 text-white/80">
              <li><a href="/">الرئيسية</a></li>
              <li><a href="#features">المميزات</a></li>
              <li><a href="#pricing">الأسعار</a></li>
              <li><a href="#contact">تواصل</a></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-6 text-2xl font-bold">تواصل معنا</h3>
            <div className="space-y-4 text-white/80">
              <div className="flex items-center gap-3"><Mail size={18}/>hello@inteleye-sa.com</div>
              <div className="flex items-center gap-3"><Phone size={18}/>+966 50 123 4567</div>
              <div className="flex items-center gap-3"><MapPin size={18}/>الرياض، المملكة العربية السعودية</div>
            </div>
          </div>

          <div>
            <h3 className="mb-6 text-2xl font-bold">تابعنا</h3>
            <div className="flex gap-4">
              <SocialIcon><Linkedin size={20}/></SocialIcon>
              <SocialIcon><Twitter size={20}/></SocialIcon>
              <SocialIcon><Instagram size={20}/></SocialIcon>
            </div>
          </div>
        </div>

        <div className="mt-16 border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between text-white/60 gap-4">
          <p>© 2026 <strong>INTELEYE</strong>. جميع الحقوق محفوظة.</p>
          <div className="flex gap-8">
            <a href="#">سياسة الخصوصية</a>
            <a href="#">الشروط والأحكام</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({children}:{children:React.ReactNode}){
  return (
    <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 transition hover:-translate-y-1 hover:bg-white hover:text-[#24304F]">
      {children}
    </button>
  );
}
