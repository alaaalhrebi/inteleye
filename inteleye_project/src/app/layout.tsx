import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Inteleye -  تقارير أسبوعية لسمعتك على منصات التواصل الإجتماعي ",
  description:
    "تقارير أسبوعية مع التحليل  ذكية لسمعتك على المنصات AI وتنبيهات فورية",
  keywords:
    " تقييمات, تحليل, تقارير, ذكاء اصطناعي",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={ibmPlexArabic.className}>
        {children}
      </body>
    </html>
  );
}
