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
      <div className="mx-auto max-w-7xl px-8 py-20">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 items-start">

          {/* التواصل */}
          <div className="text-right lg:text-left">

            <h3 className="mb-8 text-2xl font-bold">
              تواصل معنا
            </h3>

            <div className="space-y-6 text-white/85">

              <div className="flex items-center gap-3">
                <Mail size={20} />
                <span>hello@inteleye-sa.com</span>
              </div>

              <div className="flex items-center gap-3">
                <Phone size={20} />
                <span>+966 50 123 4567</span>
              </div>

              <div className="flex items-center gap-3">
                <MapPin size={20} />
                <span>الرياض، المملكة العربية السعودية</span>
              </div>

            </div>

            <div className="mt-8 flex gap-4">

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

          {/* الشعار */}
          <div className="flex flex-col items-center text-center">

            <img
              src="/logo.png"
              alt="IntelEye"
              className="h-24 w-auto object-contain"
            />

            <h2
              className="mt-4 text-4xl font-black tracking-tight"
              style={{
                fontFamily:
                  "'Plus Jakarta Sans','Inter','Segoe UI',sans-serif",
              }}
            >
              INTELEYE
            </h2>

            <p className="mt-6 max-w-md leading-8 text-white/80">
              منصة ذكاء اصطناعي تساعد الشركات على تحليل تقييمات العملاء،
              واكتشاف المشكلات المتكررة، وإصدار تقارير ذكية واقتراح الردود
              المناسبة لتحسين السمعة الرقمية.
            </p>

          </div>

          {/* الروابط */}
          <div className="text-right">

            <h3 className="mb-8 text-2xl font-bold">
              روابط سريعة
            </h3>

            <ul className="space-y-5">

              <li>
                <a
                  href="#"
                  className="transition hover:text-[#D7DBFF]"
                >
                  الرئيسية
                </a>
              </li>

              <li>
                <a
                  href="#features"
                  className="transition hover:text-[#D7DBFF]"
                >
                  المميزات
                </a>
              </li>

              <li>
                <a
                  href="#pricing"
                  className="transition hover:text-[#D7DBFF]"
                >
                  الأسعار
                </a>
              </li>

              <li>
                <a
                  href="#contact"
                  className="transition hover:text-[#D7DBFF]"
                >
                  تواصل معنا
                </a>
              </li>

            </ul>

          </div>

        </div>

        <div className="mt-20 border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-white/60">

          <p>
            © 2026 <span className="font-bold">INTELEYE</span>. جميع الحقوق محفوظة.
          </p>

          <div className="flex gap-8">

            <a
              href="#"
              className="transition hover:text-white"
            >
              سياسة الخصوصية
            </a>

            <a
              href="#"
              className="transition hover:text-white"
            >
              الشروط والأحكام
            </a>

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
    <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:text-[#374375]">
      {children}
    </button>
  );
}
