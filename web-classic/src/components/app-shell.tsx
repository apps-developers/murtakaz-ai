"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { getMyOrganizationEntityTypes } from "@/actions/navigation";
import { NotificationBell } from "@/components/notification-bell";
import { getPendingApprovalCount } from "@/actions/approvals";
import { getOrgLogo } from "@/actions/org-admin";
import { useAuth } from "@/providers/auth-provider";
import { type TranslationKey, useLocale } from "@/providers/locale-provider";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { useDashboardsEnabled, useNotificationsEnabled } from "@/lib/ai-features";
import { SessionTimeoutWarning } from "@/components/session-timeout-warning";

const marketingRouteSet = new Set(["/"]);

const brandLogoSrc = "/AlmosaLogoWhite.png";

const entityTypeIconMap: Record<string, string> = {
  pillar: "tabler:columns-3",
  objective: "tabler:flag-3",
  department: "tabler:building-bank",
  initiative: "tabler:rocket",
  project: "tabler:briefcase-2",
  task: "tabler:checklist",
  kpi: "tabler:chart-line",
};

const entityTypeLabelMap: Partial<Record<string, TranslationKey>> = {
  pillar: "pillar",
  objective: "objective",
  departments: "departments",
  initiative: "initiative",
  project: "project",
  task: "task",
  kpis: "kpis",
};

const navItems = [
  { href: "/overview", key: "home", icon: "tabler:home" },
  { href: "/pillars", key: "pillar", icon: "tabler:layers-subtract" },
  { href: "/objectives", key: "objective", icon: "tabler:flag-3" },
  { href: "/strategy-map", key: "strategyMap", icon: "tabler:hierarchy-3" },
  { href: "/dashboards", key: "dashboards", icon: "tabler:chart-line" },
  { href: "/reports", key: "reports", icon: "tabler:table" },
  { href: "/responsibilities", key: "responsibilities", icon: "tabler:user-check" },
  { href: "/approvals", key: "approvals", icon: "tabler:gavel" },
  { href: "/admin", key: "admin", icon: "tabler:shield" },
  { href: "/organization", key: "organization", icon: "tabler:building" },
  { href: "/users", key: "users", icon: "tabler:users" },
  { href: "/departments", key: "departments", icon: "tabler:building-bank" },
  { href: "/super-admin", key: "superAdminOverview", icon: "tabler:home" },
  { href: "/super-admin/organizations", key: "organizations", icon: "tabler:building-community" },
  { href: "/super-admin/users", key: "users", icon: "tabler:users" },
  { href: "/super-admin/settings", key: "settings", icon: "tabler:settings" },
] as const;

type StaticNavItem = (typeof navItems)[number];

type DynamicNavItem = {
  href: string;
  key: string;
  icon: string;
  label: string;
};

type NavSection = {
  sectionKey: string;
  labelKey?: TranslationKey;
  items: NavItem[];
};

type NavItem = StaticNavItem | DynamicNavItem;

function stripLocale(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "en" || segments[0] === "ar") {
    return `/${segments.slice(1).join("/")}`;
  }
  return pathname;
}

function withLocale(locale: string, href: string) {
  return `/${locale}${href}`;
}

function getAppHomeHref(userRole: unknown) {
  return userRole === "SUPER_ADMIN" ? "/super-admin" : "/overview";
}

function BrandLogo({ compact, logoUrl, useSystemFallback }: { compact?: boolean; logoUrl?: string | null; useSystemFallback?: boolean }) {
  // Show system icon when explicitly requested (no customer context) or when no logo available
  if (useSystemFallback || !logoUrl || !logoUrl.trim()) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm",
          compact ? "h-10 w-10" : "h-10 w-10",
        )}
      >
        <Icon name="tabler:chart-arrows-vertical" className={cn("text-primary-foreground", compact ? "h-5 w-5" : "h-5 w-5")} />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm",
        compact ? "h-10 w-10" : "h-10 px-3",
      )}
    >
      <Image
        src={logoUrl}
        alt="Logo"
        width={160}
        height={40}
        className={cn("w-auto object-contain", compact ? "h-7 max-w-[2.25rem]" : "h-7")}
        sizes={compact ? "40px" : "160px"}
      />
    </div>
  );
}

function NavItemLink({
  item,
  href,
  isActive,
  isMobile,
  mobileContentVisible,
  sidebarExpanded,
  sidebarContentVisible,
  t,
  badge,
}: {
  item: NavItem;
  href: string;
  isActive: boolean;
  isMobile: boolean;
  mobileContentVisible: boolean;
  sidebarExpanded: boolean;
  sidebarContentVisible: boolean;
  t: (key: TranslationKey) => string;
  badge?: number;
}) {
  const label = "label" in item ? item.label : t(item.key as TranslationKey);

  if (isMobile) {
    return (
      <Link
        href={href}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
        aria-current={isActive ? "page" : undefined}
      >
        {isActive && (
          <span className="absolute inset-y-1.5 start-0 w-0.5 rounded-full bg-primary" />
        )}
        <Icon
          name={item.icon}
          className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}
        />
        <span
          className={cn(
            "whitespace-nowrap transition-all duration-200 flex-1",
            mobileContentVisible ? "opacity-100 translate-x-0" : "opacity-0 ltr:translate-x-2 rtl:-translate-x-2",
          )}
        >
          {label}
        </span>
        {badge && badge > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center rounded-md py-1.5 text-sm font-medium transition-colors",
        sidebarExpanded ? "gap-2 px-2" : "justify-center px-1",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      aria-current={isActive ? "page" : undefined}
      title={!sidebarExpanded ? label : undefined}
    >
      <Icon
        name={item.icon}
        className={cn("h-4 w-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")}
      />
      <span
        className={cn(
          "overflow-hidden whitespace-nowrap transition-all duration-200 flex-1",
          sidebarExpanded ? "max-w-[180px] opacity-100" : "max-w-0 opacity-0",
        )}
      >
        {label}
      </span>
      {badge && badge > 0 ? (
        <span className={cn(
          "flex items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white transition-all",
          sidebarExpanded ? "h-4 min-w-4 px-1" : "absolute -top-0.5 -end-0.5 h-3 min-w-3 px-0.5 text-[8px]",
        )}>
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

function useDelayedVisibility(isOpen: boolean, delayMs = 160) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setVisible(false);
      return;
    }
    const id = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(id);
  }, [delayMs, isOpen]);

  return visible;
}

export function AppShell({ children, showLogo = true }: { children: React.ReactNode; showLogo?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale } = useLocale();
  const { user, loading } = useAuth();
  const dashboardsEnabled = useDashboardsEnabled();
  const notificationsEnabled = useNotificationsEnabled();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (user as any)?.role;
  const profileHref = userRole === "SUPER_ADMIN" ? withLocale(locale, "/super-admin/profile") : withLocale(locale, "/profile");
  const userInitials = useMemo(() => {
    const name = user?.name?.trim() ?? "";
    if (!name) return "—";
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }, [user?.name]);
  const canonicalPath = useMemo(() => stripLocale(pathname ?? "/"), [pathname]);
  const isAuthRoute = canonicalPath.startsWith("/auth/");
  const isMarketingRoute = marketingRouteSet.has(canonicalPath);
 
  const [mounted, setMounted] = useState(false);
  const authReady = mounted && !loading;
  const showAppNav = !isAuthRoute && !isMarketingRoute && authReady && Boolean(user);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (loading) return;
    if (user) return;
    if (isAuthRoute || isMarketingRoute) return;

    const nextParam = encodeURIComponent(pathname ?? withLocale(locale, getAppHomeHref(userRole)));
    router.replace(withLocale(locale, `/auth/login?next=${nextParam}`));
  }, [isAuthRoute, isMarketingRoute, loading, locale, mounted, pathname, router, user, userRole]);

  useEffect(() => {
    if (!showAppNav) return;
    if (userRole !== "SUPER_ADMIN") return;
    if (canonicalPath.startsWith("/super-admin")) return;
    router.replace(withLocale(locale, "/super-admin"));
  }, [canonicalPath, locale, router, showAppNav, userRole]);

  useEffect(() => {
    setSidebarPinned(false);
    setSidebarHovered(false);
  }, [userRole]);

  const sidebarExpanded = showAppNav && (sidebarPinned || sidebarHovered);
  const sidebarContentVisible = useDelayedVisibility(sidebarExpanded, 160);
  const sidebarFooterVisible = useDelayedVisibility(sidebarExpanded, 220);
  const mobileContentVisible = useDelayedVisibility(mobileNavOpen, 120);

  const activeKey = useMemo(() => {
    if (canonicalPath.startsWith("/entities/")) {
      const slug = canonicalPath.split("/").filter(Boolean)[1];
      return slug ? `entities-${slug.toLowerCase()}` : "entities";
    }
    const matches = navItems.filter((item) => {
      if (item.href === "/overview") return canonicalPath === "/overview";
      return canonicalPath.startsWith(item.href);
    });

    matches.sort((a, b) => b.href.length - a.href.length);
    return matches[0]?.key;
  }, [canonicalPath]);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [orgEntityTypes, setOrgEntityTypes] = useState<Array<{ code: string; name: string; nameAr: string | null; sortOrder: number }>>([]); 
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);

  useEffect(() => {
    if (!showAppNav || !user || userRole === "SUPER_ADMIN") return;
    let cancelledAC = false;
    void (async () => {
      try {
        const c = await getPendingApprovalCount();
        if (!cancelledAC) setPendingApprovalCount(c);
      } catch { /* ignore */ }
    })();
    const acInterval = setInterval(async () => {
      try {
        const c = await getPendingApprovalCount();
        if (!cancelledAC) setPendingApprovalCount(c);
      } catch { /* ignore */ }
    }, 60_000);
    return () => { cancelledAC = true; clearInterval(acInterval); };
  }, [showAppNav, user, userRole]);

  useEffect(() => {
    if (!showAppNav) return;
    if (!user) return;
    if (userRole === "SUPER_ADMIN") return;

    void (async () => {
      try {
        const types = await getMyOrganizationEntityTypes();
        setOrgEntityTypes(
          (types as Array<{ code: string; name: string; nameAr: string | null; sortOrder: number }>).map((t) => ({
            code: String(t.code),
            name: String(t.name),
            nameAr: t.nameAr ? String(t.nameAr) : null,
            sortOrder: Number(t.sortOrder ?? 0),
          })),
        );
      } catch {
        setOrgEntityTypes([]);
      }
    })();
  }, [showAppNav, user, userRole]);

  useEffect(() => {
    if (!showAppNav || !user || userRole === "SUPER_ADMIN") return;
    let cancelled = false;
    async function fetchLogo() {
      try {
        const { logoUrl } = await getOrgLogo();
        if (!cancelled) setLogoUrl(logoUrl);
      } catch { /* ignore */ }
    }
    void fetchLogo();
    return () => { cancelled = true; };
  }, [showAppNav, user, userRole]);

  const entityTypeItems = useMemo<DynamicNavItem[]>(() => orgEntityTypes
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((et) => {
      const code = String(et.code).trim();
      const lower = code.toLowerCase();
      const icon = entityTypeIconMap[lower] ?? "tabler:layers-subtract";
      const labelFromDb = locale === "ar" ? et.nameAr ?? et.name : et.name;
      const labelKey = entityTypeLabelMap[lower];
      return {
        href: `/entities/${code}`,
        key: `entities-${code}`,
        icon,
        label: labelKey ? t(labelKey) : labelFromDb,
      };
    }), [locale, orgEntityTypes, t]);

  const visibleNavSections = useMemo((): NavSection[] => {
    if (userRole === "SUPER_ADMIN") {
      return [{
        sectionKey: "super-admin",
        items: navItems.filter((item) => item.href.startsWith("/super-admin")) as NavItem[],
      }];
    }

    const overviewItem = navItems.find((item) => item.href === "/overview");
    
    // Filter workflow items based on feature flags
    const workflowItemHrefs = ["/reports", "/responsibilities", "/strategy-map", "/approvals"];
    if (dashboardsEnabled) workflowItemHrefs.push("/dashboards");
    
    const workflowItems = navItems.filter((item) =>
      workflowItemHrefs.includes(item.href),
    ) as NavItem[];
    
    const adminItems = navItems.filter((item) =>
      ["/admin", "/organization", "/users"].includes(item.href) && userRole === "ADMIN",
    ) as NavItem[];

    return [
      ...(overviewItem ? [{ sectionKey: "main", items: [overviewItem as NavItem] }] : []),
      ...(entityTypeItems.length > 0 ? [{ sectionKey: "entities", labelKey: "strategicEntities" as TranslationKey, items: entityTypeItems }] : []),
      ...(workflowItems.length > 0 ? [{ sectionKey: "workflow", labelKey: "workflowAndTools" as TranslationKey, items: workflowItems }] : []),
      ...(adminItems.length > 0 ? [{ sectionKey: "admin", labelKey: "admin" as TranslationKey, items: adminItems }] : []),
    ];
  }, [entityTypeItems, userRole, dashboardsEnabled]);

  // flat list for mobile (keeps same order)
  const visibleNavItems = useMemo(
    () => visibleNavSections.flatMap((s) => s.items),
    [visibleNavSections],
  );

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:start-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        {t("skipToContent")}
      </a>
      {/* Clean minimal background */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-muted/30 via-transparent to-transparent" />

      <div className={cn("relative flex min-h-screen")}>
        {mounted && showAppNav ? (
          <div className={cn("fixed inset-0 z-[60] lg:hidden", mobileNavOpen ? "pointer-events-auto" : "pointer-events-none")}>
            <div
              className={cn(
                "absolute inset-0 bg-black/40 transition-opacity duration-200",
                mobileNavOpen ? "opacity-100" : "opacity-0",
              )}
              onClick={() => setMobileNavOpen(false)}
            />

            <div
              className={cn(
                "absolute inset-y-0 w-80 max-w-[85vw] bg-background shadow-2xl transition-transform duration-300 ease-in-out",
                "start-0 border-e border-border",
                mobileNavOpen ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full",
              )}
            >
              <div className="flex items-center justify-between gap-3 px-4 py-4">
                <Link
                  href={withLocale(locale, getAppHomeHref(userRole))}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-muted/30 text-foreground">
                    <Icon name="tabler:layout-grid" className="h-5 w-5" />
                  </div>
                  <div className="leading-tight">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{t("appTitle")}</p>
                    <p className="text-sm font-semibold text-foreground">{t("appShortTitle")}</p>
                  </div>
                </Link>

                <Button
                  variant="ghost"
                  className="h-9 w-9 px-0 text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => setMobileNavOpen(false)}
                >
                  <Icon name="tabler:x" />
                </Button>
              </div>

              <nav className="px-3">
                <div className="space-y-1">
                  {visibleNavItems.map((item) => {
                    const isActive = activeKey === item.key;
                    return (
                      <NavItemLink
                        key={item.href}
                        item={item}
                        href={withLocale(locale, item.href)}
                        isActive={isActive}
                        isMobile
                        mobileContentVisible={mobileContentVisible}
                        sidebarExpanded={sidebarExpanded}
                        sidebarContentVisible={sidebarContentVisible}
                        t={t}
                        badge={item.key === "approvals" ? pendingApprovalCount : undefined}
                      />
                    );
                  })}
                </div>
              </nav>

              <div className="mt-auto border-t border-border p-4">
                <Link
                  href={profileHref}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-accent"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/50 text-xs font-semibold text-foreground">
                    {userInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{user?.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{userRole === "ADMIN" ? t("roleAdmin") : userRole === "EXECUTIVE" ? t("roleExecutive") : userRole === "MANAGER" ? t("roleManager") : userRole ?? ""}</p>
                  </div>
                </Link>
                <div className="mt-3 flex items-center justify-between">
                  <div
                    className={cn(
                      "flex items-center gap-1 transition-all duration-200",
                      mobileContentVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2",
                    )}
                  >
                    <ThemeToggle />
                    <LanguageToggle />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {showAppNav ? <div className={cn("hidden lg:block lg:shrink-0", sidebarExpanded ? "lg:w-64" : "lg:w-16")} /> : null}

        {showAppNav ? (
          <aside
            aria-label={t("mainNavigation")}
            onMouseEnter={() => setSidebarHovered(true)}
            onMouseLeave={() => setSidebarHovered(false)}
            className={cn(
              "hidden lg:flex lg:flex-col lg:border-e lg:border-border/60 lg:bg-card",
              "fixed top-0 z-[60] h-screen",
              "start-0",
              "transition-[width] duration-200 ease-out",
              sidebarExpanded ? "w-64" : "w-16",
            )}
          >
            <div className={cn("flex items-center gap-3 px-3 py-3 border-b border-border/60", sidebarExpanded ? "justify-between" : "justify-center")}> 
              <Link
                href={withLocale(locale, getAppHomeHref(userRole))}
                className={cn("flex items-center gap-2", !sidebarExpanded && "justify-center")}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Icon name="tabler:chart-arrows-vertical" className="h-4 w-4" />
                </div>
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-200",
                    sidebarExpanded ? "max-w-[180px] opacity-100" : "max-w-0 opacity-0",
                  )}
                >
                  <p className="text-sm font-semibold">{t("appShortTitle")}</p>
                </div>
              </Link>

              {sidebarExpanded ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setSidebarPinned((prev) => !prev)}
                  aria-label={sidebarPinned ? t("unpinSidebar") : t("pinSidebar")}
                >
                  <Icon name={sidebarPinned ? "tabler:pin-filled" : "tabler:pin"} className="h-4 w-4" />
                </Button>
              ) : null}
            </div>

            <nav className="flex-1 px-3 pb-3 overflow-y-auto">
              <div className="space-y-4">
                {visibleNavSections.map((section, si) => (
                  <div key={section.sectionKey}>
                    {/* Section label — only shown when expanded and not the first "main" section */}
                    {section.labelKey && sidebarExpanded && (
                      <div
                        className={cn(
                          "mb-1 px-3 transition-all duration-300 motion-reduce:transition-none",
                          sidebarContentVisible ? "opacity-100" : "opacity-0",
                        )}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                          {t(section.labelKey)}
                        </p>
                      </div>
                    )}
                    {/* Divider between sections when collapsed */}
                    {si > 0 && !sidebarExpanded && (
                      <div className="mx-3 my-1 h-px bg-border/50" />
                    )}
                    <div className="space-y-0.5">
                      {section.items.map((item) => {
                        const isActive = activeKey === item.key;
                        return (
                          <NavItemLink
                            key={item.href}
                            item={item}
                            href={withLocale(locale, item.href)}
                            isActive={isActive}
                            isMobile={false}
                            mobileContentVisible={mobileContentVisible}
                            sidebarExpanded={sidebarExpanded}
                            sidebarContentVisible={sidebarContentVisible}
                            t={t}
                            badge={item.key === "approvals" ? pendingApprovalCount : undefined}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </nav>

            <div className="mt-auto border-t border-border/60 px-2 py-2">
              <Link
                href={profileHref}
                className={cn(
                  "flex items-center rounded-md transition-colors hover:bg-muted",
                  sidebarExpanded ? "gap-2 px-2 py-1.5" : "justify-center p-1.5",
                )}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[10px] font-medium text-primary">
                  {userInitials}
                </div>
                <div
                  className={cn(
                    "min-w-0 flex-1 overflow-hidden transition-all duration-200",
                    sidebarExpanded ? "max-w-[160px] opacity-100" : "max-w-0 opacity-0",
                  )}
                >
                  <p className="truncate text-sm font-medium leading-tight">{user?.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {userRole === "ADMIN" ? t("roleAdmin") : userRole === "EXECUTIVE" ? t("roleExecutive") : userRole === "MANAGER" ? t("roleManager") : userRole ?? ""}
                  </p>
                </div>
              </Link>

              {/* Theme + Language toggles */}
              <div
                className={cn(
                  "overflow-hidden transition-all duration-200",
                  sidebarExpanded ? "max-h-10 mt-1.5" : "max-h-0",
                )}
              >
                <div className="flex items-center gap-1 px-2">
                  <ThemeToggle />
                  <LanguageToggle />
                </div>
              </div>

              {/* Collapsed: icon-only toggles */}
              {!sidebarExpanded && (
                <div className="mt-1.5 flex flex-col items-center gap-1">
                  <ThemeToggle />
                  <LanguageToggle />
                </div>
              )}
            </div>
          </aside>
        ) : null}

        <div className="flex min-w-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            {!isAuthRoute && <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-sm">
              <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 lg:max-w-none">
              <Link href={`/${locale}`} className="flex items-center gap-2">
                {showLogo ? <BrandLogo logoUrl={logoUrl} useSystemFallback={!user} /> : null}
                <div className="leading-tight">
                  <p className="text-xs text-muted-foreground">{t("appTitle")}</p>
                </div>
              </Link>

              <div className="flex items-center gap-2">
                {showAppNav && notificationsEnabled && userRole !== "SUPER_ADMIN" ? (
                  <NotificationBell locale={locale} />
                ) : null}
                {showAppNav ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden h-8 w-8 text-muted-foreground"
                    onClick={() => setMobileNavOpen(true)}
                  >
                    <Icon name="tabler:menu-2" className="h-4 w-4" />
                  </Button>
                ) : null}
                {showAppNav ? null : <>
                  <ThemeToggle />
                  <LanguageToggle />
                </>}
                {isAuthRoute ? null : showAppNav ? null : !authReady ? null : user ? (
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/${locale}/overview`}>{t("workspace")}</Link>
                  </Button>
                ) : (
                  <Button asChild variant="secondary" size="sm">
                    <Link href={withLocale(locale, "/auth/login")}>{t("signIn")}</Link>
                  </Button>
                )}
              </div>
              </div>
            </header>}

            <main id="main-content" className={isAuthRoute ? "contents" : "relative w-full px-4 py-6 lg:px-6"}>
              {children}
            </main>
          </div>
        </div>
      </div>
      <SessionTimeoutWarning />
    </div>
  );
}
