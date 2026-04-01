"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, BarChart3, ShieldCheck, TrendingUp, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useLocale } from "@/providers/locale-provider";
import Link from "next/link";
import Image from "next/image";

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
            
            // User-friendly error messages based on status code
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

  const features = [
    { icon: BarChart3, labelKey: "appTagline" as const },
    { icon: TrendingUp, labelKey: "bilingualRtlSupport" as const },
    { icon: ShieldCheck, labelKey: "auditableDecisions" as const },
    { icon: Layers, labelKey: "approveRejectWorkflowDesc" as const },
  ];

  return (
    <div className="flex min-h-screen w-full">
      {/* Branding panel */}
      <div
        className={`hidden lg:flex lg:w-[52%] flex-col justify-between p-10 xl:p-14 relative overflow-hidden
          bg-[hsl(215,62%,22%)] dark:bg-[hsl(215,62%,14%)]
          ${isRtl ? "order-last" : "order-first"}`}
      >
        {/* Subtle grid overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
        {/* Radial glow */}
        <div className="pointer-events-none absolute -top-32 -start-32 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 end-0 h-64 w-64 rounded-full bg-white/5 blur-3xl" />

        {/* Logo area */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">{t("appTitle")}</p>
            <p className="text-sm font-semibold text-white">{t("appShortTitle")}</p>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 flex flex-col gap-8">
          <div className="space-y-3">
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-snug">
              {t("appTagline")}
            </h1>
            <p className="text-base text-white/60 max-w-sm leading-relaxed">
              {t("aboutProductDesc")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {features.map(({ icon: Icon, labelKey }) => (
              <div key={labelKey} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4 text-white/80" />
                </div>
                <p className="text-sm text-white/75">{t(labelKey)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom logo - system icon when no customer logged in */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">{t("appTitle")}</p>
            <p className="text-sm font-semibold text-white">{t("appShortTitle")}</p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-10">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted/60">
            <BarChart3 className="h-5 w-5 text-foreground" />
          </div>
          <div className="leading-tight">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{t("appTitle")}</p>
            <p className="text-sm font-semibold text-foreground">{t("appShortTitle")}</p>
          </div>
        </div>

        <div className="w-full max-w-sm space-y-8">
          {/* Header */}
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{t("signIn")}</h2>
            <p className="text-sm text-muted-foreground">{t("signInSubtitle")}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className={`space-y-5 transition-transform ${shake ? "animate-shake" : ""}`}>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                autoComplete="email"
                className="h-11 border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/40"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">{t("password")}</Label>
                <Link
                  href={`/${locale}/auth/forgot-password`}
                  className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
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
                  className="h-11 border-border bg-background text-foreground pe-10 focus-visible:ring-primary/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <svg className="h-4 w-4 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full bg-[hsl(215,62%,28%)] text-white hover:bg-[hsl(215,62%,24%)] dark:bg-primary dark:hover:bg-primary/90 transition-all font-semibold shadow-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
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
