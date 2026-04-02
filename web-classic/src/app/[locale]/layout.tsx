import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { AppShell } from "@/components/app-shell";
import { getOrgConfig } from "@/lib/config/service";
import { generateThemeCSS } from "@/lib/config/theme";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getDefaultConfig } from "@/lib/config/defaults";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Strategy Execution & Performance",
  description: "Executive-grade prototype for strategy execution, KPIs, and governance",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
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

  // Fetch org configuration if user is authenticated
  let colorTheme = "blue";
  let themeCSS = "";
  let branding = getDefaultConfig().branding;

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user?.orgId) {
      const [orgConfig, org] = await Promise.all([
        getOrgConfig(session.user.orgId),
        prisma.organization.findUnique({
          where: { id: session.user.orgId },
          select: { colorTheme: true },
        }),
      ]);
      
      branding = orgConfig.branding;
      
      // Read color theme directly from organization record (set by super admin)
      colorTheme = org?.colorTheme ?? "blue";
      
      // Only inject dynamic CSS if the org uses a custom theme (not a built-in preset).
      // Built-in presets (blue, emerald, violet, etc.) are handled by globals.css
      // via [data-color-theme] selectors — injecting inline CSS would override them.
      const builtInThemes = ["blue", "emerald", "violet", "rose", "orange", "slate"];
      if (!builtInThemes.includes(colorTheme)) {
        themeCSS = generateThemeCSS(orgConfig.theme);
      }
    }
  } catch {
    // Not authenticated or other error, use defaults
    colorTheme = "blue";
    themeCSS = "";
  }

  return (
    <html lang={locale} suppressHydrationWarning data-color-theme={colorTheme}>
      <body>
        {/* Dynamic organization theme CSS - injected in body to avoid hydration issues */}
        {themeCSS && (
          <style
            id="dynamic-org-theme"
            dangerouslySetInnerHTML={{ __html: themeCSS }}
          />
        )}
        <Providers locale={locale} initialColorTheme={colorTheme} branding={branding}>
          <AppShell showLogo={showLogo}>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
