"use client";

import Link from "next/link";
import { useState } from "react";
import { BarChart3, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const { locale, t } = useLocale();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted/60">
            <BarChart3 className="h-5 w-5 text-foreground" />
          </div>
          <div className="leading-tight">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{t("appTitle")}</p>
            <p className="text-sm font-semibold text-foreground">{t("appShortTitle")}</p>
          </div>
        </div>

        {submitted ? (
          <div className="space-y-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">{t("checkYourEmail")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("resetLinkSentDesc")}{" "}
                <span className="font-semibold text-foreground">{email || t("yourEmail")}</span>
                {t("resetLinkSentEnd")}
              </p>
            </div>
            <Link
              href={`/${locale}/auth/login`}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("backToSignIn")}
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">{t("passwordReset")}</h2>
              <p className="text-sm text-muted-foreground">{t("forgotPasswordSubtitle")}</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">{t("email")}</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    autoComplete="email"
                    className="h-11 border-border bg-background ps-9 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/40"
                  />
                </div>
              </div>

              <Button
                onClick={() => setSubmitted(true)}
                className="h-11 w-full bg-[hsl(215,62%,28%)] text-white hover:bg-[hsl(215,62%,24%)] dark:bg-primary dark:hover:bg-primary/90 transition-all font-semibold shadow-sm"
              >
                {t("sendResetLink")}
              </Button>
            </div>

            <Link
              href={`/${locale}/auth/login`}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("backToSignIn")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
