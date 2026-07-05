import {
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Twitter,
  Instagram,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#374375] text-white">
      <div className="max-w-7xl mx-auto px-8 py-20">

        <div className="grid lg:grid-cols-4 gap-14">

          {/* الروابط */}
          <div>
            <h3 className="text-xl font-semibold mb-6">الروابط</h3>

            <ul className="space-y-4 text-[#FFFCF5]/90">
              <li><a href="#">الرئيسية</a></li>
              <li><a href="#features">المميزات</a></li>
              <li><a href="#pricing">الأسعار</a></li>
              <li><a href="#">المدونة</a></li>
            </ul>
          </div>

          {/* التواصل */}
          <div>
            <h3 className="text-xl font-semibold mb-6">تواصل معنا</h3>

            <div className="space-y-5 text-[#FFFCF5]/90">
              <div className="flex items-center gap-3">
                <Mail size={18} />
                hello@inteleye.ai
              </div>

              <div className="flex items-center gap-3">
                <Phone size={18} />
                +966 50 123 4567
              </div>

              <div className="flex items-center gap-3">
                <MapPin size={18} />
                الرياض، المملكة العربية السعودية
              </div>
            </div>
          </div>

          {/* السوشال */}
          <div>
            <h3 className="text-xl font-semibold mb-6">تابعنا</h3>

            <div className="flex gap-4">
              <SocialIcon><Linkedin size={20} /></SocialIcon>
              <SocialIcon><Twitter size={20} /></SocialIcon>
              <SocialIcon><Instagram size={20} /></SocialIcon>
            </div>

            <div className="mt-10 rounded-2xl bg-white/5 border border-white/10 p-6">
              <h4 className="font-semibold">اشترك بالنشرة البريدية</h4>

              <input
                placeholder="بريدك الإلكتروني"
                className="mt-5 w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 outline-none placeholder:text-[#BABDE2]"
              />

              <button
                className="mt-4 w-full rounded-xl bg-[#D4AF37] py-3 font-semibold text-black hover:opacity-90 transition"
              >
                اشتراك
              </button>
            </div>
          </div>

          {/* الشعار - يظهر في اليسار */}
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-4">

              <img
                src="/logo.png"
                alt="INTELEYE"
                className="w-16 h-16 object-contain"
              />

              <h2 className="text-3xl font-extrabold tracking-[0.15em] text-[#D4AF37]">
                INTELEYE
              </h2>

            </div>

            <p className="mt-8 leading-8 text-[#FFFCF5]/90">
              منصة ذكاء اصطناعي تساعد الشركات على تحليل تقييمات العملاء،
              اكتشاف المشكلات المتكررة، إصدار تقارير ذكية،
              واقتراح الردود المناسبة لتحسين السمعة الرقمية.
            </p>
          </div>

        </div>

        <div className="mt-16 border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[#BABDE2] text-sm">

          <p>© 2026 INTELEYE. جميع الحقوق محفوظة.</p>

          <div className="flex gap-8">
            <a href="#">سياسة الخصوصية</a>
            <a href="#">الشروط والأحكام</a>
          </div>

        </div>
      </div>
    </footer>
  );
}

type SocialProps = {
  children: React.ReactNode;
};

function SocialIcon({ children }: SocialProps) {
  return (
    <button className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center hover:bg-[#4A598E] transition">
      {children}
    </button>
  );
}
