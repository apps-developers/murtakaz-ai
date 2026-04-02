// components/theme/dynamic-theme-provider.tsx - Injects dynamic organization theme

'use client';

import { useEffect } from 'react';
import { generateThemeCSS } from '@/lib/config/theme';
import { useOrgConfig } from '@/hooks/use-org-config';
import type { CustomerTheme } from '@/types/config';

interface DynamicThemeProviderProps {
  fallbackTheme?: CustomerTheme;
}

export function DynamicThemeProvider({ fallbackTheme }: DynamicThemeProviderProps) {
  const { theme, customCSS } = useOrgConfig();

  useEffect(() => {
    const themeToApply = theme || fallbackTheme;
    if (!themeToApply) return;

    // Generate and inject CSS
    const css = generateThemeCSS(themeToApply);
    
    // Create or update dynamic theme style element
    let styleEl = document.getElementById('dynamic-org-theme');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'dynamic-org-theme';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;

    // Apply custom CSS if provided
    if (customCSS) {
      let customEl = document.getElementById('custom-org-css');
      if (!customEl) {
        customEl = document.createElement('style');
        customEl.id = 'custom-org-css';
        document.head.appendChild(customEl);
      }
      customEl.textContent = customCSS;
    }

    // Cleanup function
    return () => {
      // Styles persist across route changes for better UX
      // Only remove if component unmounts completely
    };
  }, [theme, fallbackTheme, customCSS]);

  // Apply density and border radius classes to body
  useEffect(() => {
    const themeToApply = theme || fallbackTheme;
    if (!themeToApply) return;

    const { density, borderRadius } = themeToApply;
    
    // Remove existing classes
    document.body.classList.remove(
      'density-compact', 'density-comfortable', 'density-spacious',
      'radius-none', 'radius-small', 'radius-medium', 'radius-large', 'radius-full'
    );

    // Add new classes
    document.body.classList.add(`density-${density}`);
    document.body.classList.add(`radius-${borderRadius}`);
  }, [theme, fallbackTheme]);

  // This component doesn't render anything visible
  return null;
}
