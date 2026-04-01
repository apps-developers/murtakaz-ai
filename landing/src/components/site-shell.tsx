"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/providers/locale-provider";
import { useTheme } from "@/providers/theme-provider";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import footerData from "@/content/footer.json";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const { locale, t, dir, isArabic } = useLocale();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  const otherLocale = locale === "en" ? "ar" : "en";
  const canonicalPath = pathname.replace(/^\/(en|ar)/, "") || "/";
  const localeSwitchHref = `/${otherLocale}${canonicalPath}`;

  const companyName = isArabic ? footerData.company.nameAr : footerData.company.name;
  const companyDesc = isArabic ? footerData.company.descriptionAr : footerData.company.description;
  const copyright = isArabic ? footerData.copyrightAr : footerData.copyright;
  const allLinks = footerData.links.flatMap((group) =>
    group.items.map((item) => ({
      label: isArabic ? item.labelAr : item.label,
      href: item.href,
    }))
  );

  return (
    <div dir={dir} className="flex min-h-screen flex-col">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          {/* Brand + nav */}
          <div className="flex items-center gap-6">
            <Link href={`/${locale}`} className="flex items-center gap-3">
              <div className="leading-tight">
                <p className="text-sm font-semibold text-foreground">{t("murtakaz")}</p>
                <p className="text-xs text-muted-foreground">{t("strategyExecutionPlatform")}</p>
              </div>
            </Link>

            <nav className={cn("hidden items-center gap-5 text-sm text-muted-foreground lg:flex")}>
              <Link href={`/${locale}#features`} className="hover:text-foreground transition-colors">
                {t("features")}
              </Link>
              <Link href={`/${locale}#how-it-works`} className="hover:text-foreground transition-colors">
                {t("howItWorks")}
              </Link>
              <Link href={`/${locale}#benefits`} className="hover:text-foreground transition-colors">
                {isArabic ? "لماذا نحن" : "Why Us"}
              </Link>
              <Link href={`/${locale}/pricing`} className="hover:text-foreground transition-colors">
                {t("pricing")}
              </Link>
              <Link href={`/${locale}#faq`} className="hover:text-foreground transition-colors">
                {t("faq")}
              </Link>
              <Link href={`/${locale}/contact`} className="hover:text-foreground transition-colors">
                {t("contact")}
              </Link>
            </nav>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link href={localeSwitchHref}>
              <Button variant="ghost" size="sm">
                {t("language")}
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Icon name={theme === "dark" ? "lucide:sun" : "lucide:moon"} className="h-4 w-4" />
            </Button>
            <a href={`${APP_URL}/${locale}/auth/login`}>
              <Button variant="outline" size="sm">
                {t("signIn")}
              </Button>
            </a>
            <a href={`${APP_URL}/${locale}/auth/login`}>
              <Button size="sm">{t("requestDemo")}</Button>
            </a>
          </div>
        </div>
      </header>

      {/* ─── Main ─── */}
      <main className="flex-1">{children}</main>

      {/* ─── Footer ─── */}
      <footer className="border-t bg-muted/40 py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
            <div>
              <p className="text-sm font-semibold">{companyName}</p>
              <p className="text-xs text-muted-foreground">{companyDesc}</p>
            </div>
            <nav className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {allLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href.startsWith("/") ? `/${locale}${link.href}` : `/${locale}${link.href}`}
                  className="hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <p className="mt-8 text-center text-xs text-muted-foreground">{copyright}</p>
        </div>
      </footer>
    </div>
  );
}
