"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import {
  getMyNotifications,
  getMyNotificationCount,
  markNotificationsRead,
} from "@/actions/notifications";

type Notification = Awaited<ReturnType<typeof getMyNotifications>>[number];

export function NotificationBell({ locale }: { locale: string }) {
  const { df, tr } = useLocale();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Poll unread count
  useEffect(() => {
    let cancelled = false;
    async function fetchCount() {
      try {
        const count = await getMyNotificationCount();
        if (!cancelled) setUnreadCount(count);
      } catch { /* ignore */ }
    }
    void fetchCount();
    const interval = setInterval(() => void fetchCount(), 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const loadNotifications = useCallback(async () => {
    if (loaded) return;
    try {
      const data = await getMyNotifications();
      setNotifications(data);
      setLoaded(true);
    } catch { /* ignore */ }
  }, [loaded]);

  function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      void loadNotifications();
    }
  }

  async function handleMarkAllRead() {
    try {
      await markNotificationsRead();
      setUnreadCount(0);
      setNotifications([]);
      setLoaded(false);
    } catch { /* ignore */ }
  }

  function notificationIcon(type: string) {
    if (type === "APPROVAL_PENDING") return "tabler:clock";
    if (type === "VALUE_APPROVED") return "tabler:check";
    if (type === "VALUE_REJECTED") return "tabler:x";
    return "tabler:bell";
  }

  function notificationColor(type: string) {
    if (type === "APPROVAL_PENDING") return "text-amber-500";
    if (type === "VALUE_APPROVED") return "text-emerald-500";
    if (type === "VALUE_REJECTED") return "text-rose-500";
    return "text-muted-foreground";
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        className="relative h-9 w-9 px-0 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label={tr("Notifications", "الإشعارات")}
        onClick={handleToggle}
      >
        <Icon name="tabler:bell" className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -end-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[70]" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute end-0 top-full z-[80] mt-2 w-80 max-w-[90vw] rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold">{tr("Notifications", "الإشعارات")}</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => void handleMarkAllRead()}
                  className="text-xs text-primary hover:underline"
                >
                  {tr("Mark all read", "تعيين الكل كمقروء")}
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {tr("No notifications", "لا توجد إشعارات")}
                </div>
              ) : (
                notifications.map((n) => (
                  <Link
                    key={n.id}
                    href={n.entityId ? `/${locale}/entities/kpi/${n.entityId}` : `/${locale}/approvals`}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 border-b border-border/50 px-4 py-3 transition-colors hover:bg-muted/30 last:border-0"
                  >
                    <div className={`mt-0.5 rounded-full bg-muted p-1.5 ${notificationColor(n.type)}`}>
                      <Icon name={notificationIcon(n.type)} className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug line-clamp-2">
                        {df(n.message, n.messageAr)}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {new Date(n.createdAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>

            <div className="border-t border-border px-4 py-2">
              <Link
                href={`/${locale}/approvals`}
                onClick={() => setOpen(false)}
                className="block text-center text-xs text-primary hover:underline"
              >
                {tr("View all approvals", "عرض جميع الاعتمادات")}
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
