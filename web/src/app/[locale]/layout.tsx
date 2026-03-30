import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Strategy Execution & Performance",
  description: "Executive-grade prototype for strategy execution, KPIs, and governance",
};

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const hideLogoRaw = process.env.HIDE_LOGO;
  const hideLogo = !hideLogoRaw ? false : ["true", "1", "yes", "on"].includes(hideLogoRaw.toLowerCase());
  const showLogo = !hideLogo;

  return (
    <Providers locale={locale}>
      <AppShell showLogo={showLogo}>{children}</AppShell>
    </Providers>
  );
}
