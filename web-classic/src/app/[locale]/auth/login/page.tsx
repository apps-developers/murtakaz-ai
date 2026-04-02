"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useLocale } from "@/providers/locale-provider";
import Link from "next/link";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const { locale, t } = useLocale();
  const isRtl = locale === "ar";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [shake, setShake] = useState(false);

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await authClient.signIn.email({
        email,
        password,
        fetchOptions: {
          onError: (ctx) => {
            const status = ctx.error?.status;
            const message = ctx.error?.message;
            
            if (status === 401 || message?.toLowerCase().includes("invalid")) {
              setError(t("invalidEmailOrPassword") || "Invalid email or password");
            } else if (status === 429) {
              setError(t("tooManyAttempts") || "Too many attempts. Please try again later.");
            } else if (status >= 500) {
              setError(t("serverError") || "Server error. Please try again later.");
            } else {
              setError(t("signInFailed") || "Sign in failed. Please try again.");
            }
            
            triggerShake();
            setLoading(false);
          },
          onSuccess: async () => {
            try {
              const next = searchParams.get("next");
              const sessionPromise = authClient.getSession();
              const timeoutPromise = new Promise<never>((_, reject) => {
                window.setTimeout(() => reject(new Error("Session fetch timeout")), 10000);
              });

              const { data } = await Promise.race([sessionPromise, timeoutPromise]);
              const user = data?.user as { role?: string } | undefined;

              const fallbackTarget = user?.role === "SUPER_ADMIN" ? `/${locale}/super-admin` : `/${locale}/overview`;
              const target = next && next.startsWith("/") ? next : fallbackTarget;

              window.location.href = target;
            } catch (err) {
              console.error("Post-login session/redirect failed:", err);
              setError(t("failedToLoad"));
              triggerShake();
              setLoading(false);
            }
          },
        },
      });
    } catch (err) {
      console.error("Sign-in failed:", err);
      setError(t("signInFailed") || "Sign in failed. Please try again.");
      triggerShake();
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Branding panel */}
      <div
        className={`hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-10 relative
          bg-muted/30 border-border/60
          ${isRtl ? "order-last border-l" : "order-first border-r"}`}
      >
        {/* Logo area */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-border/60 bg-background shadow-sm">
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">{t("appShortTitle")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("appTagline")}</p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-10">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/60 bg-muted/30">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <span className="font-semibold text-foreground">{t("appShortTitle")}</span>
        </div>

        <div className="w-full max-w-sm space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">{t("signIn")}</h2>
            <p className="text-sm text-muted-foreground">{t("signInSubtitle")}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className={`space-y-4 transition-transform ${shake ? "animate-shake" : ""}`}>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm">{t("password")}</Label>
                <Link
                  href={`/${locale}/auth/forgot-password`}
                  className="text-xs text-primary hover:underline"
                >
                  {t("forgotPassword")}
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pe-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t("signingIn")}
                </span>
              ) : t("signIn")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
