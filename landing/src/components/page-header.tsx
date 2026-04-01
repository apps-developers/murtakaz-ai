"use client";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/icon";
import { useLocale } from "@/providers/locale-provider";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, icon, actions, className }: PageHeaderProps) {
  const { dir } = useLocale();

  return (
    <div
      className={cn(
        "flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {icon && <Icon name={icon} className="h-6 w-6 text-muted-foreground" />}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className={cn("flex items-center gap-2", dir === "rtl" && "flex-row-reverse")}>
          {actions}
        </div>
      )}
    </div>
  );
}
