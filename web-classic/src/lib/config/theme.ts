// lib/config/theme.ts - Theme utilities and CSS generation

import type { CustomerTheme } from '@/types/config';

/**
 * Convert borderRadius value to Tailwind-compatible class
 */
export function getBorderRadiusClass(radius: CustomerTheme['borderRadius']): string {
  const radiusMap = {
    none: '0',
    small: '0.25rem',
    medium: '0.5rem',
    large: '0.75rem',
    full: '9999px',
  };
  return radiusMap[radius] || radiusMap.medium;
}

/**
 * Generate CSS variables from theme configuration
 */
export function generateThemeCSS(theme: CustomerTheme): string {
  const radius = getBorderRadiusClass(theme.borderRadius);

  // Density-based spacing adjustments
  const densitySpacing = {
    compact: '0.5rem',
    comfortable: '1rem',
    spacious: '1.5rem',
  }[theme.density] || '1rem';

  return `
:root {
  /* Brand Colors */
  --primary: ${theme.primary};
  --primary-foreground: 0 0% 98%;
  --secondary: ${theme.secondary};
  --secondary-foreground: ${adjustColorForContrast(theme.secondary)};
  --accent: ${theme.accent};
  --accent-foreground: ${adjustColorForContrast(theme.accent)};
  
  /* Semantic Colors */
  --success: ${theme.success};
  --warning: ${theme.warning};
  --error: ${theme.error};
  --info: ${theme.info};
  
  /* Typography */
  --font-sans: ${theme.fontFamily.primary};
  ${theme.fontFamily.secondary ? `--font-serif: ${theme.fontFamily.secondary};` : ''}
  ${theme.fontFamily.monospace ? `--font-mono: ${theme.fontFamily.monospace};` : ''}
  
  /* Spacing & Shapes */
  --radius: ${radius};
  --spacing-unit: ${densitySpacing};
}

/* Dark mode overrides */
.dark {
  --primary: ${adjustColorForDarkMode(theme.primary)};
  --primary-foreground: 0 0% 98%;
  --secondary: ${adjustSecondaryForDarkMode(theme.secondary)};
  --accent: ${adjustAccentForDarkMode(theme.accent)};
}
`;
}

/**
 * Generate a dark mode variant of a color
 * Reduces lightness by ~15% for dark mode
 */
function adjustColorForDarkMode(hslColor: string): string {
  const parts = hslColor.split(' ');
  if (parts.length !== 3) return hslColor;

  const h = parts[0];
  const s = parts[1];
  const l = parseInt(parts[2].replace('%', ''));

  // Darken by 15% but keep at least 20% lightness
  const newL = Math.max(20, l - 15);
  return `${h} ${s} ${newL}%`;
}

/**
 * Generate a dark mode variant of secondary color
 */
function adjustSecondaryForDarkMode(hslColor: string): string {
  const parts = hslColor.split(' ');
  if (parts.length !== 3) return '215 22% 14%';

  const h = parts[0];
  const s = parseInt(parts[1].replace('%', ''));
  const l = parseInt(parts[2].replace('%', ''));

  // For dark mode: much darker, lower saturation
  return `${h} ${Math.max(10, s - 15)}% ${Math.min(15, l / 5)}%`;
}

/**
 * Generate a dark mode variant of accent color
 */
function adjustAccentForDarkMode(hslColor: string): string {
  const parts = hslColor.split(' ');
  if (parts.length !== 3) return '215 26% 18%';

  const h = parts[0];
  const s = parseInt(parts[1].replace('%', ''));
  const l = parseInt(parts[2].replace('%', ''));

  // For dark mode: darker accent
  return `${h} ${Math.max(10, s - 10)}% ${Math.max(15, l - 70)}%`;
}

/**
 * Determine appropriate foreground color based on background lightness
 * Returns HSL for white (light text) or dark (dark text)
 */
function adjustColorForContrast(hslColor: string): string {
  const parts = hslColor.split(' ');
  if (parts.length !== 3) return '215 25% 8%';

  const l = parseInt(parts[2].replace('%', ''));

  // If background is light (lightness > 50%), use dark text
  // If background is dark (lightness <= 50%), use light text
  return l > 50 ? '215 25% 8%' : '0 0% 98%';
}

/**
 * Convert hex color to HSL string
 */
export function hexToHSL(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');

  // Parse RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);

  return `${hDeg} ${sPct}% ${lPct}%`;
}

/**
 * Convert HSL string to hex color
 */
export function hslToHex(hsl: string): string {
  const parts = hsl.split(' ');
  if (parts.length !== 3) return '#000000';

  const h = parseInt(parts[0]) / 360;
  const s = parseInt(parts[1].replace('%', '')) / 100;
  const l = parseInt(parts[2].replace('%', '')) / 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Preset color themes for quick selection
 */
export const colorPresets: Record<string, { primary: string; name: string }> = {
  blue: { primary: '215 62% 30%', name: 'Blue' },
  emerald: { primary: '160 84% 24%', name: 'Emerald' },
  violet: { primary: '262 56% 46%', name: 'Violet' },
  rose: { primary: '346 84% 40%', name: 'Rose' },
  orange: { primary: '24 95% 42%', name: 'Orange' },
  slate: { primary: '215 25% 25%', name: 'Slate' },
  cyan: { primary: '189 94% 43%', name: 'Cyan' },
  amber: { primary: '38 92% 50%', name: 'Amber' },
  fuchsia: { primary: '292 84% 40%', name: 'Fuchsia' },
};

/**
 * Generate complete theme from a primary color
 */
export function generateThemeFromPrimary(
  primaryHSL: string,
  options: Partial<CustomerTheme> = {}
): CustomerTheme {
  const parts = primaryHSL.split(' ');
  const h = parts[0];
  const s = parseInt(parts[1].replace('%', ''));

  return {
    primary: primaryHSL,
    secondary: `${h} ${Math.max(20, s - 30)}% 92%`,
    accent: `${h} ${Math.max(25, s - 25)}% 90%`,
    success: '160 84% 39%',
    warning: '38 92% 50%',
    error: '0 84% 60%',
    info: '215 62% 50%',
    fontFamily: options.fontFamily || {
      primary: '"Rubik", ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
    },
    borderRadius: options.borderRadius || 'medium',
    density: options.density || 'comfortable',
  };
}
