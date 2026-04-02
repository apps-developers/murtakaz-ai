import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "مرتكز KPI - دليل المستخدم",
  description: "دليل استخدام منصة مرتكز KPI لإدارة الأداء المؤسسي",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-white font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
