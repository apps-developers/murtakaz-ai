"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLocale } from "@/providers/locale-provider";

type Suggestion = {
  description: string;
  descriptionAr?: string;
};

type Props = {
  title: string;
  onAccept: (description: string, descriptionAr?: string) => void;
};

export function AiDescribeModal({ title, onAccept }: Props) {
  const { t, tr, isArabic } = useLocale();
  const [open, setOpen] = useState(false);
  const [userPrompt, setUserPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/auto-describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          userPrompt: userPrompt.trim() || undefined,
          previousDescription: suggestion?.description || undefined,
        }),
      });

      if (!res.ok) throw new Error("ai_error");
      const data = (await res.json()) as Suggestion;
      setSuggestion(data);
      setUserPrompt("");
    } catch {
      setError(tr("AI is temporarily unavailable.", "الذكاء الاصطناعي غير متاح مؤقتاً."));
    } finally {
      setLoading(false);
    }
  }

  function handleAccept() {
    if (!suggestion) return;
    onAccept(suggestion.description, suggestion.descriptionAr);
    handleClose();
  }

  function handleClose() {
    setOpen(false);
    setSuggestion(null);
    setUserPrompt("");
    setError(null);
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="shrink-0 gap-2" disabled={!title?.trim()}>
          <Icon name="tabler:sparkles" className="h-4 w-4 text-primary" />
          {tr("AI Description", "وصف بالذكاء الاصطناعي")}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="tabler:sparkles" className="h-5 w-5 text-primary" />
            {tr("Generate Description", "توليد الوصف")}
          </DialogTitle>
          <DialogDescription>
            {tr(
              "AI will generate a professional description. You can refine it with additional instructions.",
              "سيولد الذكاء الاصطناعي وصفاً احترافياً. يمكنك تحسينه بتعليمات إضافية.",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">{tr("KPI Title", "عنوان المؤشر")}</p>
            <p className="text-sm font-medium mt-0.5">{title}</p>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {suggestion ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {tr("English", "الإنجليزية")}
                </p>
                <p className="text-sm text-foreground leading-relaxed" dir="ltr">
                  {suggestion.description}
                </p>

                {suggestion.descriptionAr && (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-1">
                      {tr("Arabic", "العربية")}
                    </p>
                    <p className="text-sm text-foreground leading-relaxed text-right" dir="rtl">
                      {suggestion.descriptionAr}
                    </p>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder={tr("Refine: e.g. make it shorter, add more detail…", "تحسين: مثلاً اجعله أقصر، أضف تفاصيل…")}
                  dir={isArabic ? "rtl" : "ltr"}
                  className="bg-card text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !loading) void handleGenerate();
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleGenerate()}
                  disabled={loading}
                  className="shrink-0"
                >
                  {loading ? (
                    <Icon name="tabler:loader-2" className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon name="tabler:refresh" className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
                  {t("cancel")}
                </Button>
                <Button type="button" size="sm" onClick={handleAccept}>
                  <Icon name="tabler:check" className="me-1.5 h-4 w-4" />
                  {tr("Accept", "قبول")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder={tr(
                  "Optional: specific instructions (leave empty to auto-generate)",
                  "اختياري: تعليمات محددة (اتركه فارغاً للتوليد التلقائي)",
                )}
                dir={isArabic ? "rtl" : "ltr"}
                className="bg-card text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) void handleGenerate();
                }}
              />

              <Button
                type="button"
                className="w-full"
                onClick={() => void handleGenerate()}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Icon name="tabler:loader-2" className="me-2 h-4 w-4 animate-spin" />
                    {t("aiGenerating")}
                  </>
                ) : (
                  <>
                    <Icon name="tabler:sparkles" className="me-2 h-4 w-4" />
                    {tr("Generate", "توليد")}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
