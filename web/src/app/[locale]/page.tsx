"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { LazyMotion, domAnimation, m, useReducedMotion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/icon";
import landing from "@/content/landing_page.json";
import faqs from "@/content/faqs.json";
import testimonials from "@/content/testimonials.json";
import footer from "@/content/footer.json";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

function iconForFeature(icon: string) {
  if (icon === "target") return "tabler:target";
  if (icon === "chart-bar") return "tabler:chart-bar";
  if (icon === "shield-check") return "tabler:shield-check";
  if (icon === "dashboard") return "tabler:layout-dashboard";
  if (icon === "alert") return "tabler:alert-triangle";
  if (icon === "language") return "tabler:language";
  return "tabler:sparkles";
}

function withLocale(locale: string, href: string) {
  if (href.startsWith("#")) return `/${locale}${href}`;
  if (href.startsWith("/")) return `/${locale}${href}`;
  return href;
}

function SectionHeading({
  title,
  subtitle,
  isArabic,
  centered = false,
}: {
  title: string;
  subtitle?: string;
  isArabic: boolean;
  centered?: boolean;
}) {
  return (
    <div className={cn("space-y-4 max-w-3xl", isArabic ? "text-right ms-auto" : "me-auto", centered && "mx-auto text-center")}>
      <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{title}</h2>
      {subtitle ? <p className="text-lg text-muted-foreground leading-relaxed">{subtitle}</p> : null}
    </div>
  );
}

export default function LandingPage() {
  const { locale, isArabic, t } = useLocale();
  const { user, loading } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const heroTitle = isArabic ? landing.hero.titleAr : landing.hero.title;
  const heroSubtitle = isArabic ? landing.hero.subtitleAr : landing.hero.subtitle;

  const primaryCtaText = loading
    ? null
    : user
      ? t("enterWorkspace")
      : isArabic
        ? landing.hero.ctaAr
        : landing.hero.cta;

  const primaryCtaHref = user ? `/${locale}/overview` : `/${locale}/auth/login?next=/${locale}/overview`;

  const cardVariants = shouldReduceMotion
    ? undefined
    : {
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
      };

  const gridVariants = shouldReduceMotion
    ? undefined
    : {
        hidden: {},
        show: { transition: { staggerChildren: 0.08 } },
      };

  return (
    <>
    <LazyMotion features={domAnimation}>
      <m.div
        className="mx-auto max-w-7xl space-y-24 px-6 pb-24 pt-10 lg:px-8"
        initial={shouldReduceMotion ? false : "hidden"}
        animate={shouldReduceMotion ? undefined : "show"}
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
        }}
      >
        <section className="relative grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Background Gradient for Hero */}
          <div className="absolute -start-20 -top-20 -z-10 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px] opacity-30 mix-blend-screen" />

          <m.div
            className={cn("space-y-8", isArabic && "text-right")}
            variants={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_OUT } },
            }}
          >
            <div className="space-y-6">
              <m.div
                className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-sm dark:bg-primary/20"
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
                }}
              >
                <Icon name="tabler:language" className="h-3.5 w-3.5" />
                <span>{t("bilingualRtlSupport")}</span>
              </m.div>

              <m.h1
                className="text-4xl font-bold tracking-tight text-foreground md:text-6xl md:leading-tight lg:text-7xl lg:leading-tight"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_OUT } },
                }}
              >
                {heroTitle}
              </m.h1>

              <m.p
                className="max-w-xl text-lg text-muted-foreground md:text-xl md:leading-relaxed"
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.1, ease: EASE_OUT } },
                }}
              >
                {heroSubtitle}
              </m.p>
            </div>

            <m.div
              className={cn("flex flex-col gap-4 sm:flex-row sm:items-center")}
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.2, ease: EASE_OUT } },
              }}
            >
              {primaryCtaText ? (
                <Button asChild size="lg" className="h-12 bg-primary px-8 text-base text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(23,55,99,0.25)] hover:shadow-[0_0_25px_rgba(23,55,99,0.35)] transition-all">
                  <Link href={primaryCtaHref}>{primaryCtaText}</Link>
                </Button>
              ) : null}
              <Button asChild variant="outline" size="lg" className="h-12 border-border bg-card/50 text-base text-foreground hover:bg-muted/30 hover:text-foreground backdrop-blur-sm">
                <Link href={`/${locale}/contact`}>
                  <span className="inline-flex items-center gap-2">
                    <Icon name="tabler:message-circle" className="h-5 w-5" />
                    {isArabic ? landing.cta_section.buttonAr : landing.cta_section.button}
                  </span>
                </Link>
              </Button>
            </m.div>

            <m.div
              className={cn("flex flex-wrap gap-6 text-sm font-medium text-muted-foreground", isArabic && "justify-end")}
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { duration: 1, delay: 0.4 } },
              }}
            >
              <Link href={`/${locale}#features`} className="hover:text-foreground transition-colors">
                {t("features")}
              </Link>
              <Link href={`/${locale}#how-it-works`} className="hover:text-foreground transition-colors">
                {t("howItWorks")}
              </Link>
              <Link href={`/${locale}#faq`} className="hover:text-foreground transition-colors">
                {t("faq")}
              </Link>
            </m.div>
          </m.div>

          <m.div
            className="relative perspective-1000"
            variants={{
              hidden: { opacity: 0, scale: 0.95, rotateX: 5 },
              show: { opacity: 1, scale: 1, rotateX: 0, transition: { duration: 1, ease: EASE_OUT } },
            }}
          >
             {/* Glow behind image */}
            <div className="absolute -inset-10 -z-10 bg-gradient-to-tr from-primary/25 via-primary/15 to-transparent blur-3xl opacity-50" />
            
            <m.div
              className="relative overflow-hidden rounded-2xl border border-border bg-card/50 p-2 shadow-2xl backdrop-blur-xl ring-1 ring-border"
              whileHover={shouldReduceMotion ? undefined : { y: -5, scale: 1.01 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div className="relative overflow-hidden rounded-xl border border-white/5 bg-popover">
                  <Image
                    src={landing.hero.image}
                    alt={t("productUiPreview")}
                    width={880}
                    height={560}
                    priority
                    className="h-auto w-full object-cover"
                  />
                  {/* Overlay gradient for screen reflection feel */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-20 pointer-events-none" />
              </div>
            </m.div>
          </m.div>
        </section>

      {/* Stats bar */}
      <m.section
        className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm"
        variants={cardVariants}
        initial={shouldReduceMotion ? false : "hidden"}
        whileInView={shouldReduceMotion ? undefined : "show"}
        viewport={{ once: true, amount: 0.5 }}
      >
        <div className={cn("grid divide-border sm:grid-cols-2 lg:grid-cols-4 sm:divide-x", isArabic && "direction-rtl")}>
          {landing.stats.map((stat, i) => (
            <div key={i} className={cn("flex flex-col items-center gap-1 px-6 py-8 text-center", i > 0 && "border-t border-border sm:border-t-0")}>
              <span className="text-4xl font-bold tracking-tight text-foreground">{stat.value}</span>
              <span className="text-sm text-muted-foreground">{isArabic ? stat.labelAr : stat.label}</span>
            </div>
          ))}
        </div>
      </m.section>

      <section id="features" className="space-y-12 scroll-mt-28">
        <m.div variants={cardVariants} className="text-center">
          <SectionHeading
            isArabic={isArabic}
            title={t("coreFeatures")}
            subtitle={t("coreFeaturesDesc")}
            centered
          />
        </m.div>

        <m.div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" variants={gridVariants} initial={shouldReduceMotion ? false : "hidden"} whileInView={shouldReduceMotion ? undefined : "show"} viewport={{ once: true, amount: 0.2 }}>
          {landing.features.map((feature) => (
            <m.div key={feature.id} variants={cardVariants} whileHover={shouldReduceMotion ? undefined : { y: -8 }} transition={{ duration: 0.3, ease: "easeOut" }}>
              <Card className="h-full border-border bg-card/50 p-6 backdrop-blur-sm transition-colors hover:border-primary/30 hover:bg-card/80">
                <CardHeader className="space-y-4 p-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 ring-1 ring-inset ring-border">
                    <Icon name={iconForFeature(feature.icon)} className="h-6 w-6 text-foreground" />
                  </div>
                  <div className={cn("space-y-2", isArabic && "text-right")}>
                    <CardTitle className="text-xl text-foreground">{isArabic ? feature.titleAr : feature.title}</CardTitle>
                    <CardDescription className="text-base text-muted-foreground leading-relaxed">{isArabic ? feature.descriptionAr : feature.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </m.div>
          ))}
        </m.div>
      </section>

      <section id="how-it-works" className="space-y-12 scroll-mt-28">
        <m.div variants={cardVariants}>
          <SectionHeading
            isArabic={isArabic}
            title={t("howItWorks")}
            subtitle={t("howItWorksDesc")}
          />
        </m.div>

        <m.div
          className="grid gap-8 md:grid-cols-3"
          variants={gridVariants}
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView={shouldReduceMotion ? undefined : "show"}
          viewport={{ once: true, amount: 0.25 }}
        >
          {[
            {
              icon: "tabler:target-arrow",
              title: t("defineStrategy"),
              body: isArabic
                ? "أنشئ الركائز والأهداف والمبادرات والمشاريع في هيكل هرمي واضح. عيّن مالكين وحدد أُطرًا زمنية وتابع الحالة من المخطط حتى الإنجاز."
                : "Create pillars, goals, initiatives, and projects in a clear hierarchy. Assign owners, set timeframes, and track status from planned to complete.",
              step: "01"
            },
            {
              icon: "tabler:chart-line",
              title: t("trackPerformance"),
              body: isArabic
                ? "عرّف مؤشرات الأداء بأهداف وترددات وصيغ محاسبية. تُحدَّث لوحات المعلومات التنفيذية آليًا وتكشف المبادرات المعرضة للخطر وانحراف الأداء."
                : "Define KPIs with targets, frequencies, and calculation formulas. Executive dashboards update automatically, surfacing at-risk initiatives and performance variance.",
              step: "02"
            },
            {
              icon: "tabler:gavel",
              title: t("governAndComply"),
              body: isArabic
                ? "تسلك تغييرات الصيغة والهدف وقوائم الموافقات. يسجّل سجل التدقيق الثابت كل إجراء مع المنفذ والوقت والتفاصيل قبل وبعد التغيير."
                : "Formula and target changes flow through approval queues. The immutable audit log records every action with actor, timestamp, and before/after detail.",
              step: "03"
            },
          ].map((step) => (
            <m.div key={step.title} variants={cardVariants} whileHover={shouldReduceMotion ? undefined : { y: -5 }} transition={{ duration: 0.3, ease: "easeOut" }}>
              <div className="group relative h-full rounded-2xl border border-border bg-card/40 p-8 backdrop-blur-sm transition-all hover:bg-card/60">
                <div className="absolute top-8 end-8 text-4xl font-bold text-foreground/5 select-none">{step.step}</div>
                <div className="space-y-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card/50 group-hover:border-primary/30 group-hover:bg-primary/10 transition-colors">
                    <Icon name={step.icon} className="h-7 w-7 text-foreground transition-colors" />
                  </div>
                  <div className={cn("space-y-2", isArabic && "text-right")}>
                    <h3 className="text-xl font-bold text-foreground">{step.title}</h3>
                    <p className="text-base text-muted-foreground leading-relaxed">{step.body}</p>
                  </div>
                </div>
              </div>
            </m.div>
          ))}
        </m.div>
      </section>

      {/* Benefits Section - Why Choose Murtakaz */}
      <section id="benefits" className="space-y-12 scroll-mt-28">
        <m.div variants={cardVariants}>
          <SectionHeading
            isArabic={isArabic}
            title={isArabic ? landing.benefits.titleAr : landing.benefits.title}
            centered
          />
        </m.div>

        <m.div
          className="grid gap-6 md:grid-cols-3"
          variants={gridVariants}
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView={shouldReduceMotion ? undefined : "show"}
          viewport={{ once: true, amount: 0.25 }}
        >
          {[
            {
              icon: "tabler:eye",
              title: isArabic ? landing.benefits.items[0].titleAr : landing.benefits.items[0].title,
              body: isArabic ? landing.benefits.items[0].descriptionAr : landing.benefits.items[0].description,
            },
            {
              icon: "tabler:user-check",
              title: isArabic ? landing.benefits.items[1].titleAr : landing.benefits.items[1].title,
              body: isArabic ? landing.benefits.items[1].descriptionAr : landing.benefits.items[1].description,
            },
            {
              icon: "tabler:bolt",
              title: isArabic ? landing.benefits.items[2].titleAr : landing.benefits.items[2].title,
              body: isArabic ? landing.benefits.items[2].descriptionAr : landing.benefits.items[2].description,
            },
          ].map((benefit, idx) => (
            <m.div key={idx} variants={cardVariants} whileHover={shouldReduceMotion ? undefined : { y: -6, scale: 1.02 }} transition={{ duration: 0.3, ease: "easeOut" }}>
              <div className="group h-full rounded-2xl border border-border bg-gradient-to-br from-card/80 to-card/40 p-8 backdrop-blur-sm transition-all hover:border-primary/30 hover:from-card/90 hover:to-card/50">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <Icon name={benefit.icon} className="h-7 w-7" />
                </div>
                <div className={cn("mt-6 space-y-2", isArabic && "text-right")}>
                  <h3 className="text-xl font-bold text-foreground">{benefit.title}</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">{benefit.body}</p>
                </div>
              </div>
            </m.div>
          ))}
        </m.div>
      </section>

      {/* Trust & Security Badges */}
      <section className="py-8">
        <m.div
          className="rounded-2xl border border-border bg-card/30 px-8 py-6 backdrop-blur-sm"
          variants={cardVariants}
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView={shouldReduceMotion ? undefined : "show"}
          viewport={{ once: true, amount: 0.5 }}
        >
          <p className={cn("mb-6 text-center text-sm font-medium text-muted-foreground", isArabic && "text-right")}>
            {isArabic ? "موثوق من قِبَل فرق الاستراتيجية في مختلف القطاعات" : "Trusted by strategy teams across industries"}
          </p>
          <div className={cn("flex flex-wrap items-center justify-center gap-8 opacity-60", isArabic && "flex-row-reverse")}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon name="tabler:shield-check" className="h-5 w-5" />
              <span>{isArabic ? "بيانات مشفرة" : "Encrypted Data"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon name="tabler:server" className="h-5 w-5" />
              <span>{isArabic ? "استضافة سحابية آمنة" : "Secure Cloud Hosting"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon name="tabler:lock" className="h-5 w-5" />
              <span>{isArabic ? "مصادقة متعددة العوامل" : "Multi-Factor Auth"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon name="tabler:certificate" className="h-5 w-5" />
              <span>{isArabic ? "متوافق مع معايير الحوكمة" : "Governance Compliant"}</span>
            </div>
          </div>
        </m.div>
      </section>

      <section className="space-y-12">
        <m.div variants={cardVariants}>
          <SectionHeading
            isArabic={isArabic}
            title={t("whatTeamsSay")}
            subtitle={t("shortHighlightsDesc")}
            centered
          />
        </m.div>

        <m.div
          className="grid gap-8 md:grid-cols-3"
          variants={gridVariants}
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView={shouldReduceMotion ? undefined : "show"}
          viewport={{ once: true, amount: 0.25 }}
        >
          {testimonials.map((item) => (
            <m.div key={item.id} variants={cardVariants} whileHover={shouldReduceMotion ? undefined : { y: -6 }} transition={{ duration: 0.3, ease: "easeOut" }}>
              <div className="flex h-full flex-col justify-between rounded-2xl border border-border bg-card/40 p-6 shadow-xl backdrop-blur-sm transition-colors hover:bg-card/60">
                <div className="space-y-4">
                  <div className="flex gap-1 text-foreground/80">
                      {[...Array(5)].map((_, i) => (
                        <Icon key={i} name="tabler:star-filled" className="h-4 w-4" />
                      ))}
                  </div>
                  <p className={cn("text-lg font-medium leading-relaxed text-muted-foreground", isArabic && "text-right")}>&ldquo;{isArabic ? item.quoteAr : item.quote}&rdquo;</p>
                </div>
                
                <div className={cn("mt-6 flex items-center gap-4")}>
                    <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-border">
                      <Image
                        src={item.image}
                        alt={isArabic ? item.authorAr : item.author}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className={cn("leading-tight", isArabic && "text-right")}>
                      <p className="font-semibold text-foreground">{isArabic ? item.authorAr : item.author}</p>
                      <p className="text-sm text-muted-foreground">{isArabic ? item.roleAr : item.role}</p>
                    </div>
                </div>
              </div>
            </m.div>
          ))}
        </m.div>
      </section>

      <section id="faq" className="space-y-12 scroll-mt-28">
        <m.div variants={cardVariants}>
          <SectionHeading
            isArabic={isArabic}
            title={t("faq")}
            subtitle={t("quickAnswersDesc")}
            centered
          />
        </m.div>

        <m.div
          className="mx-auto max-w-3xl grid gap-3"
          variants={gridVariants}
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView={shouldReduceMotion ? undefined : "show"}
          viewport={{ once: true, amount: 0.15 }}
        >
          {faqs.map((item) => {
            const isOpen = openFaq === item.id;
            return (
              <m.div
                key={item.id}
                variants={cardVariants}
                className={cn(
                  "rounded-2xl border border-border bg-card/30 px-6 shadow-sm backdrop-blur-sm transition-colors hover:bg-card/50",
                  isOpen && "bg-card/60 ring-1 ring-border"
                )}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between gap-6 py-5 text-start",
                    isArabic && "text-right"
                  )}
                  onClick={() => setOpenFaq(isOpen ? null : item.id)}
                >
                  <span className="text-base font-medium text-foreground">{isArabic ? item.questionAr : item.question}</span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card/50 transition-colors hover:bg-muted/30">
                    <Icon
                      name="tabler:chevron-down"
                      className={cn("h-4 w-4 text-muted-foreground transition-transform duration-300", isOpen && "rotate-180")}
                    />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <m.div
                      key="answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className={cn("pb-5 text-sm leading-relaxed text-muted-foreground", isArabic && "text-right")}>
                        {isArabic ? item.answerAr : item.answer}
                      </p>
                    </m.div>
                  )}
                </AnimatePresence>
              </m.div>
            );
          })}
        </m.div>
      </section>

      <section className="relative overflow-hidden rounded-3xl border border-border bg-card/50 p-12 text-foreground shadow-2xl backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent opacity-50" />
        <div className="absolute -top-24 -end-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl opacity-30" />
        
        <m.div
          className={cn("relative z-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between")}
          variants={cardVariants}
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView={shouldReduceMotion ? undefined : "show"}
          viewport={{ once: true, amount: 0.5 }}
        >
          <div className={cn("space-y-4 max-w-2xl", isArabic && "text-right")}>
            <h3 className="text-3xl font-bold tracking-tight md:text-4xl">{isArabic ? landing.cta_section.titleAr : landing.cta_section.title}</h3>
            <p className="text-lg text-muted-foreground">
              {t("talkToUsForDemoDesc")}
            </p>
          </div>
          <Button asChild size="lg" className="bg-primary text-base text-primary-foreground hover:bg-primary/90 px-8 py-6 h-auto shadow-[0_0_20px_rgba(23,55,99,0.22)] hover:shadow-[0_0_30px_rgba(23,55,99,0.32)] transition-all">
            <Link href={`/${locale}/contact`}>{isArabic ? landing.cta_section.buttonAr : landing.cta_section.button}</Link>
          </Button>
        </m.div>
      </section>

      <footer className="border-t border-border pt-16 pb-8">
        <div className={cn("grid gap-8 lg:grid-cols-4", isArabic && "text-right")}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <Icon name="tabler:chart-arrows-vertical" className="h-4 w-4 text-primary-foreground" />
              </div>
              <p className="text-sm font-bold text-foreground">{isArabic ? footer.company.nameAr : footer.company.name}</p>
            </div>
            <p className="text-sm text-muted-foreground">{isArabic ? footer.company.descriptionAr : footer.company.description}</p>
          </div>
          {footer.links.map((group) => (
            <div key={group.title} className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{isArabic ? group.titleAr : group.title}</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link href={withLocale(locale, item.href)} className="hover:text-foreground">
                      {isArabic ? item.labelAr : item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className={cn("mt-8 text-xs text-muted-foreground", isArabic && "text-right")}>{isArabic ? footer.copyrightAr : footer.copyright}</p>
      </footer>
      </m.div>
    </LazyMotion>
    </>
  );
}
