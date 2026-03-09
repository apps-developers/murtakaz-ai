"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLocale } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";

type ReportType = "full" | "digest";
type ReportLang = "en" | "ar";
type ReportPeriod = "ytd" | "q1" | "q2" | "q3" | "q4";

export function AiGenerateSummaryModal() {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("full");
  const [reportLang, setReportLang] = useState<ReportLang>(locale as ReportLang);
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>("ytd");
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    setReport(null);

    try {
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType, lang: reportLang, period: reportPeriod }),
      });

      if (!res.ok) throw new Error("ai_error");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      setReport("");
      setGenerating(false);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          fullText += chunk;
          setReport(fullText);
        }
      }
    } catch {
      setGenerating(false);
      setReport(t("aiUnavailable"));
    }
  }

  async function handleCopy() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (!val) {
      setReport(null);
      setGenerating(false);
      setCopied(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Icon name="tabler:sparkles" className="me-2 h-4 w-4 text-primary" />
          {t("aiGenerateReport")}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="tabler:sparkles" className="h-5 w-5 text-primary" />
            {t("aiGenerateReport")}
          </DialogTitle>
          <DialogDescription>{t("aiGenerateReportSubtitle")}</DialogDescription>
        </DialogHeader>

        {!report ? (
          <div className="space-y-5 pt-2">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>{t("aiReportType")}</Label>
                <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                  <SelectTrigger className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">{t("aiReportTypeFull")}</SelectItem>
                    <SelectItem value="digest">{t("aiReportTypeDigest")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("aiReportLanguage")}</Label>
                <Select value={reportLang} onValueChange={(v) => setReportLang(v as ReportLang)}>
                  <SelectTrigger className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("aiReportPeriod")}</Label>
                <Select value={reportPeriod} onValueChange={(v) => setReportPeriod(v as ReportPeriod)}>
                  <SelectTrigger className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ytd">{t("aiReportPeriodCurrent")}</SelectItem>
                    <SelectItem value="q1">Q1</SelectItem>
                    <SelectItem value="q2">Q2</SelectItem>
                    <SelectItem value="q3">Q3</SelectItem>
                    <SelectItem value="q4">Q4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => void handleGenerate()}
              disabled={generating}
            >
              {generating ? (
                <>
                  <Icon name="tabler:loader-2" className="me-2 h-4 w-4 animate-spin" />
                  {t("aiGenerating")}
                </>
              ) : (
                <>
                  <Icon name="tabler:sparkles" className="me-2 h-4 w-4" />
                  {t("aiGenerate")}
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div
              className={cn(
                "max-h-[380px] overflow-y-auto rounded-xl border border-border bg-muted/20 p-4",
                "text-sm leading-relaxed whitespace-pre-wrap font-sans",
                reportLang === "ar" ? "text-right" : "text-left",
              )}
              dir={reportLang === "ar" ? "rtl" : "ltr"}
            >
              {report}
              {generating && (
                <span className="inline-flex ms-1 items-center gap-0.5">
                  <span className="h-1 w-1 rounded-full bg-foreground animate-bounce [animation-delay:0ms]" />
                  <span className="h-1 w-1 rounded-full bg-foreground animate-bounce [animation-delay:150ms]" />
                  <span className="h-1 w-1 rounded-full bg-foreground animate-bounce [animation-delay:300ms]" />
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Icon name="tabler:info-circle" className="h-3.5 w-3.5" />
                {t("aiReportDisclaimer")}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setReport(null);
                    setGenerating(false);
                  }}
                >
                  <Icon name="tabler:refresh" className="me-2 h-4 w-4" />
                  {t("aiGenerate")}
                </Button>
                <Button size="sm" onClick={() => void handleCopy()}>
                  <Icon
                    name={copied ? "tabler:check" : "tabler:copy"}
                    className="me-2 h-4 w-4"
                  />
                  {copied ? t("aiReportCopied") : t("aiCopyReport")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
