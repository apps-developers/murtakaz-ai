import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { AppShell } from "@/components/app-shell";
import { getOrgConfig } from "@/lib/config/service";
import { generateThemeCSS } from "@/lib/config/theme";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getDefaultConfig } from "@/lib/config/defaults";

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

  // Fetch org configuration if user is authenticated
  let colorTheme = "blue";
  let themeCSS = "";
  let branding = getDefaultConfig().branding;

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user?.orgId) {
      const orgConfig = await getOrgConfig(session.user.orgId);
      
      // Generate dynamic CSS
      themeCSS = generateThemeCSS(orgConfig.theme);
      branding = orgConfig.branding;
      
      // Extract color theme from config
      const themeToColorMap: Record<string, string> = {
        '215 62% 30%': 'blue',
        '160 84% 24%': 'emerald',
        '262 56% 46%': 'violet',
        '346 84% 40%': 'rose',
        '24 95% 42%': 'orange',
        '215 25% 25%': 'slate',
      };
      
      // Try to map primary color to theme name
      const primaryColor = orgConfig.theme.primary;
      colorTheme = themeToColorMap[primaryColor] || 'blue';
    }
  } catch {
    // Not authenticated or other error, use defaults
    colorTheme = "blue";
    themeCSS = "";
  }

  return (
    <html suppressHydrationWarning>
      <body className="antialiased">
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
