import "./globals.css";

export const metadata = {
  title: "Inteleye",
  description: "تقارير أسبوعية لسمعتك على Google Maps",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
