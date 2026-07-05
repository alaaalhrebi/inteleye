import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inteleye - تقارير أسبوعية لسمعتك على Google Maps",
  description: "تقارير أسبوعية ذكية لسمعتك على Google Maps مع تحليل AI وتنبيهات فورية",
  keywords: "Google Maps, تقييمات, تحليل, تقارير, ذكاء اصطناعي",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
