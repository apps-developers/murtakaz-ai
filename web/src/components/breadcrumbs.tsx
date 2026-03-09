"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/locale-provider";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  const { dir, t } = useLocale();
  const isRtl = dir === "rtl";
  const ChevronIcon = isRtl ? ChevronLeft : ChevronRight;

  const all: BreadcrumbItem[] = [
    { label: t("home"), href: undefined },
    ...items,
  ];

  return (
    <nav
      aria-label="breadcrumb"
      className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}
    >
      {all.map((item, i) => {
        const isLast = i === all.length - 1;
        const isHome = i === 0;

        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronIcon className="h-3 w-3 shrink-0 text-muted-foreground/50" />
            )}
            {isLast || !item.href ? (
              <span
                className={cn(
                  "max-w-[180px] truncate",
                  isLast
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {isHome ? (
                  <span className="flex items-center gap-1">
                    <Home className="h-3 w-3" />
                    <span>{item.label}</span>
                  </span>
                ) : (
                  item.label
                )}
              </span>
            ) : (
              <Link
                href={item.href}
                className={cn(
                  "max-w-[180px] truncate transition-colors hover:text-foreground",
                  isHome && "flex items-center gap-1",
                )}
              >
                {isHome && <Home className="h-3 w-3 shrink-0" />}
                <span>{item.label}</span>
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
