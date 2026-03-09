"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useLocale } from "@/providers/locale-provider";
import Link from "next/link";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const { locale, t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
            setError(ctx.error.message);
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
              setLoading(false);
            }
          },
        },
      });
    } catch (err) {
      console.error("Sign-in failed:", err);
      setError(t("failedToLoad"));
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-md place-items-center py-10">
      <Card className="w-full border-border bg-card/50 shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">{t("signIn")}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {t("signInSubtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="border-border bg-muted/30 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("password")}</Label>
                <Link
                  href={`/${locale}/auth/forgot-password`}
                  className="text-xs font-semibold text-foreground underline underline-offset-4 decoration-primary/40 hover:decoration-primary/70"
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
                  className="border-border bg-muted/30 text-foreground pe-10"
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
              <p className="text-sm text-red-400">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              variant="secondary"
              className="w-full"
            >
              {loading ? t("signingIn") : t("signIn")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
