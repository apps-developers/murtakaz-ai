import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { AppShell } from "@/components/app-shell";
import { getOrgColorTheme } from "@/actions/org-admin";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

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

  // Fetch org color theme from database if user is authenticated
  let colorTheme = "blue";
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user?.orgId) {
      const result = await getOrgColorTheme();
      colorTheme = result.colorTheme;
    }
  } catch {
    // Not authenticated or other error, use default
    colorTheme = "blue";
  }

  return (
    <Providers locale={locale} initialColorTheme={colorTheme}>
      <AppShell showLogo={showLogo}>{children}</AppShell>
    </Providers>
  );
}
