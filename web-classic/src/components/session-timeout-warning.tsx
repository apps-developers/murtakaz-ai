"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import { Loader2 } from "lucide-react";

// Session timeout configuration
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_THRESHOLD = 5 * 60 * 1000; // Show warning 5 minutes before

export function SessionTimeoutWarning() {
  const { session, refresh, signOut } = useAuth();
  const { t, tr } = useLocale();
  const [mounted, setMounted] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(WARNING_THRESHOLD);
  const [isExtending, setIsExtending] = useState(false);

  // Delay rendering until after hydration to avoid mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const calculateTimeRemaining = useCallback(() => {
    if (!session?.expiresAt) return SESSION_TIMEOUT;
    const expiresAt = new Date(session.expiresAt).getTime();
    const now = Date.now();
    return Math.max(0, expiresAt - now);
  }, [session]);

  useEffect(() => {
    if (!session) {
      setShowWarning(false);
      return;
    }

    const checkInterval = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      if (remaining <= WARNING_THRESHOLD && remaining > 0) {
        setShowWarning(true);
      } else if (remaining === 0) {
        // Session expired - sign out
        setShowWarning(false);
        void signOut();
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [session, calculateTimeRemaining, signOut]);

  const handleExtend = async () => {
    setIsExtending(true);
    try {
      await refresh();
      setShowWarning(false);
    } catch (err) {
      console.error("Failed to extend session:", err);
    } finally {
      setIsExtending(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Prevent hydration mismatch - don't render until mounted
  if (!mounted || !session) return null;

  return (
    <Dialog open={showWarning} onOpenChange={setShowWarning}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tr("Session Expiring Soon", "الجلسة تنتهي قريباً")}</DialogTitle>
          <DialogDescription>
            {tr(
              "Your session will expire in {time}. Extend your session to continue working.",
              "ستنتهي جلستك خلال {time}. قم بتمديد الجلسة للمتابعة."
            ).replace("{time}", formatTime(timeRemaining))}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-500 tabular-nums">
                {formatTime(timeRemaining)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {tr("remaining", "متبقي")}
              </p>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleLogout}>
            {t("logout")}
          </Button>
          <Button onClick={handleExtend} disabled={isExtending}>
            {isExtending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tr("Extending...", "جاري التمديد...")}
              </>
            ) : (
              tr("Extend Session", "تمديد الجلسة")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
