"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ColorTheme = "blue" | "emerald" | "violet" | "rose" | "orange" | "slate";
type ThemeMode = "light" | "dark";
type Theme = `${ThemeMode}-${ColorTheme}` | ThemeMode;

const COLOR_THEMES: ColorTheme[] = ["blue", "emerald", "violet", "rose", "orange", "slate"];

function isValidColorTheme(value: string): value is ColorTheme {
  return COLOR_THEMES.includes(value as ColorTheme);
}

function parseTheme(stored: string | null): { mode: ThemeMode; color: ColorTheme } {
  if (!stored) return { mode: "dark", color: "blue" };
  
  // Check for combined theme format: "light-emerald", "dark-violet", etc.
  const parts = stored.split("-");
  if (parts.length === 2) {
    const [mode, color] = parts;
    if ((mode === "light" || mode === "dark") && isValidColorTheme(color)) {
      return { mode, color };
    }
  }
  
  // Legacy format: just "light" or "dark"
  if (stored === "light" || stored === "dark") {
    return { mode: stored, color: "blue" };
  }
  
  return { mode: "dark", color: "blue" };
}

type ThemeContextValue = {
  theme: Theme;
  mode: ThemeMode;
  color: ColorTheme;
  setTheme: (theme: Theme) => void;
  setMode: (mode: ThemeMode) => void;
  setColor: (color: ColorTheme) => void;
  toggleMode: () => void;
  colorThemes: readonly ColorTheme[];
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readInitialTheme(): { mode: ThemeMode; color: ColorTheme } {
  if (typeof window === "undefined") return { mode: "dark", color: "blue" };
  const stored = window.localStorage.getItem("theme");
  const parsed = parseTheme(stored);
  // Check system preference for mode only if no stored preference
  if (!stored) {
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
    return { mode: prefersDark ? "dark" : "light", color: "blue" };
  }
  return parsed;
}

function applyThemeToDom(mode: ThemeMode, color: ColorTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  
  // Apply dark/light mode
  if (mode === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  
  // Apply color theme
  root.setAttribute("data-color-theme", color);
}

export function ThemeProvider({ 
  children, 
  initialColorTheme 
}: { 
  children: React.ReactNode;
  initialColorTheme?: ColorTheme;
}) {
  const [mounted, setMounted] = useState(false);
  const [mode, setModeState] = useState<ThemeMode>(() => readInitialTheme().mode);
  const [color, setColorState] = useState<ColorTheme>(() => initialColorTheme || readInitialTheme().color);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    applyThemeToDom(mode, color);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("theme", `${mode}-${color}`);
    }
  }, [mode, color]);

  const value = useMemo<ThemeContextValue>(() => {
    const theme: Theme = `${mode}-${color}`;
    return {
      theme,
      mode,
      color,
      setTheme: (newTheme) => {
        const parsed = parseTheme(newTheme);
        setModeState(parsed.mode);
        setColorState(parsed.color);
      },
      setMode: setModeState,
      setColor: setColorState,
      toggleMode: () => setModeState((prev) => (prev === "dark" ? "light" : "dark")),
      colorThemes: COLOR_THEMES,
    };
  }, [mode, color]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
