import Image from "next/image";
import {
  Mail, MapPin, Linkedin, Music2, Instagram,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#374375] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%)]" />
<div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
  <div className="flex flex-col items-center text-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-2xl">
            <Image src="/logo.png" alt="INTELEYE" width={82} height={82} className="object-contain"/>
          </div>
<h2 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">INTELEYE</h2>
          <p className="mt-2 text-base sm:text-lg text-white/70">AI Customer Experience Platform</p>

          <p className="mt-8 max-w-2xl text-base sm:text-lg leading-8 sm:leading-9 text-white/80">
         
            منصة ذكاء اصطناعي تساعد الشركات على تحليل تقييمات العملاء واكتشاف المشكلات
            وإصدار تقارير ذكية واقتراح الردود المناسبة لتحسين السمعة الرقمية.
          </p>
        </div>

        <div className="my-16 h-px bg-white/10"/>

<div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8 lg:gap-14">
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
              <a
                href="mailto:Info.inteleye@gmail.com"
                className="flex items-center gap-3 transition hover:text-white"
                aria-label="مراسلة IntelEye عبر البريد الإلكتروني"
              >
                <Mail size={18}/>
                Info.inteleye@gmail.com
              </a>
              <a
                href="https://wa.me/966533825409"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 transition hover:text-white"
                aria-label="التواصل مع IntelEye عبر WhatsApp"
              >
                <WhatsAppIcon size={18}/>
                0533825409
              </a>
              <div className="flex items-center gap-3"><MapPin size={18}/>الرياض، المملكة العربية السعودية</div>
            </div>
          </div>

          <div>
            <h3 className="mb-6 text-2xl font-bold">تابعنا</h3>
            <div className="flex gap-4">
              <SocialIcon
                href="https://www.linkedin.com/company/inteleye-sa/?viewAsMember=true"
                label="حساب IntelEye على LinkedIn"
              >
                <Linkedin size={20}/>
              </SocialIcon>
              <SocialIcon
                href="https://www.tiktok.com/@inteleye7?_r=1&_t=ZS-99MwKPZBGGl"
                label="حساب IntelEye على TikTok"
              >
                <Music2 size={20}/>
              </SocialIcon>
              <SocialIcon
                href="https://www.instagram.com/sa.inteleye?igsi=MWlsOXp0ZXF2bmkzMA=="
                label="حساب IntelEye على Instagram"
              >
                <Instagram size={20}/>
              </SocialIcon>
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

function SocialIcon({
  children,
  href,
  label,
}: {
  children: React.ReactNode;
  href?: string;
  label?: string;
}) {
  const className =
    "flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 transition hover:-translate-y-1 hover:bg-white hover:text-[#374375]";

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={label}
        className={className}
      >
        {children}
      </a>
    );
  }

  return (
    <button className={className} aria-label={label}>
      {children}
    </button>
  );
}

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M20.5 11.6a8.5 8.5 0 0 1-12.55 7.47L3.5 20.5l1.45-4.3A8.5 8.5 0 1 1 20.5 11.6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.2 7.7c.2-.45.42-.46.78-.47h.42c.18 0 .34.04.45.3l.86 2.03c.1.24.06.43-.1.63l-.66.78c-.14.16-.13.3-.02.49.57 1.01 1.39 1.83 2.4 2.39.18.1.34.12.48-.05l.82-.96c.17-.2.38-.24.61-.14l1.93.91c.26.12.3.3.27.52-.11.78-.55 1.5-1.2 1.95-.54.38-1.26.53-2.03.32-1.46-.4-3.04-1.3-4.32-2.58-1.14-1.14-2-2.54-2.4-3.85-.3-.96-.14-1.67.25-2.27.14-.22.3-.42.46-.58Z"
        fill="currentColor"
      />
    </svg>
  );
}
