"use client";

import { LocaleProvider } from "@/providers/locale-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider, type ColorTheme } from "@/providers/theme-provider";

export function Providers({ 
  children, 
  locale, 
  initialColorTheme 
}: { 
  children: React.ReactNode; 
  locale: string;
  initialColorTheme?: string;
}) {
  // Validate the color theme
  const validColorThemes: ColorTheme[] = ["blue", "emerald", "violet", "rose", "orange", "slate"];
  const colorTheme = validColorThemes.includes(initialColorTheme as ColorTheme) 
    ? (initialColorTheme as ColorTheme) 
    : "blue";

  return (
    <ThemeProvider initialColorTheme={colorTheme}>
      <LocaleProvider locale={locale}>
        <AuthProvider>{children}</AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
