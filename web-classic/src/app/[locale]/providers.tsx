"use client";

import { LocaleProvider } from "@/providers/locale-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider, type ColorTheme } from "@/providers/theme-provider";
import type { BrandingConfig } from "@/types/config";

export function Providers({ 
  children, 
  locale, 
  initialColorTheme,
  branding,
}: { 
  children: React.ReactNode; 
  locale: string;
  initialColorTheme?: string;
  branding?: BrandingConfig;
}) {
  // Validate the color theme
  const validColorThemes: ColorTheme[] = ["blue", "emerald", "violet", "rose", "orange", "slate"];
  const colorTheme = validColorThemes.includes(initialColorTheme as ColorTheme) 
    ? (initialColorTheme as ColorTheme) 
    : "blue";

  return (
    <ThemeProvider initialColorTheme={colorTheme} branding={branding}>
      <LocaleProvider locale={locale}>
        <AuthProvider>{children}</AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
