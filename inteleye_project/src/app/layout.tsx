import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";
const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400","500","700","800"],
});

export const metadata: Metadata = {
title: "IntelEye - تقارير أسبوعية لسمعتك على منصات التواصل الاجتماعي",
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
<body className={tajawal.className}>
  {children}
      </body>
    </html>
  );
}
