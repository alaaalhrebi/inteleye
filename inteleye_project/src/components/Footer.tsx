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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">

          {/* الروابط - يمين */}
          <div className="text-right">
            <h3 className="text-xl font-semibold mb-6">الروابط</h3>

            <ul className="space-y-4 text-[#FFFCF5]/90">
              <li><a href="#">الرئيسية</a></li>
              <li><a href="#features">المميزات</a></li>
              <li><a href="#pricing">الأسعار</a></li>
              <li><a href="#contact">تواصل معنا</a></li>
            </ul>
          </div>

          {/* الشعار - الوسط */}
          <div className="flex flex-col items-center text-center">

            <img
              src="/logo.png"
              className="w-30 h-30 object-contain"
            />

            

            <p className="mt-6 max-w-sm leading-8 text-[#FFFCF5]/90">
              منصة ذكاء اصطناعي تساعد الشركات على تحليل تقييمات العملاء،
              واكتشاف المشكلات المتكررة، وإصدار تقارير ذكية واقتراح الردود
              المناسبة لتحسين السمعة الرقمية.
            </p>

          </div>

          {/* التواصل - يسار */}
          <div className="text-left">

            <h3 className="text-xl font-semibold mb-6">
              تواصل معنا
            </h3>

            <div className="space-y-5 text-[#FFFCF5]/90">

              <div className="flex items-center gap-3 justify-start">
                <Mail size={18} />
                <span>hello@inteleye.ai</span>
              </div>

              <div className="flex items-center gap-3 justify-start">
                <Phone size={18} />
                <span>+966 50 123 4567</span>
              </div>

              <div className="flex items-center gap-3 justify-start">
                <MapPin size={18} />
                <span>الرياض، المملكة العربية السعودية</span>
              </div>

            </div>

            <div className="flex gap-4 mt-8">

              <SocialIcon>
                <Linkedin size={20} />
              </SocialIcon>

              <SocialIcon>
                <Twitter size={20} />
              </SocialIcon>

              <SocialIcon>
                <Instagram size={20} />
              </SocialIcon>

            </div>

          </div>

        </div>

        <div className="mt-16 border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[#BABDE2] text-sm">

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
<button className="w-11 h-11 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center hover:bg-accent hover:text-white transition">
  {children}
    </button>
  );
}
