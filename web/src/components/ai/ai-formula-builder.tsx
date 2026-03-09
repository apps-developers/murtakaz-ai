"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

type Variable = {
  code: string;
  displayName: string;
};

type Props = {
  variables?: Variable[];
  onInsert: (formula: string) => void;
};

type GeneratedResult = {
  formula: string;
  explanation: string;
  example?: string;
};

export function AiFormulaBuilder({ variables = [], onInsert }: Props) {
  const { t, isArabic } = useLocale();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    const text = description.trim();
    if (!text) return;

    setGenerating(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/ai/formula", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: text, variables }),
      });

      if (!res.ok) throw new Error("ai_error");

      const data = (await res.json()) as GeneratedResult;
      setResult(data);
    } catch {
      setError(t("aiUnavailable"));
    } finally {
      setGenerating(false);
    }
  }

  function handleInsert() {
    if (!result?.formula) return;
    onInsert(result.formula);
    setOpen(false);
    setDescription("");
    setResult(null);
  }

  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (!val) {
      setDescription("");
      setResult(null);
      setError(null);
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="shrink-0">
          <Icon name="tabler:sparkles" className="me-2 h-4 w-4 text-primary" />
          {t("aiAskAi")}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="tabler:sparkles" className="h-5 w-5 text-primary" />
            {t("aiFormulaBuilder")}
          </DialogTitle>
          <DialogDescription>{t("aiFormulaBuilderSubtitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {variables.length > 0 && (
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {isArabic ? "المتغيرات المتاحة:" : "Available variables:"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {variables.map((v) => (
                  <code
                    key={v.code}
                    className="rounded-md border border-border bg-background px-2 py-0.5 text-xs font-mono"
                    title={v.displayName}
                  >
                    vars.{v.code}
                  </code>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("aiDescribeFormula")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("aiDescribeFormulaPlaceholder")}
              rows={3}
              dir={isArabic ? "rtl" : "ltr"}
              className="bg-card resize-none"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {result ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("aiGeneratedFormula")}
                </p>
                <div
                  dir="ltr"
                  className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 font-mono text-sm text-foreground"
                >
                  {result.formula}
                </div>
              </div>

              {result.explanation && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("aiFormulaExplanation")}
                  </p>
                  <p
                    className={cn("text-sm text-muted-foreground leading-relaxed", isArabic && "text-right")}
                    dir={isArabic ? "rtl" : "ltr"}
                  >
                    {result.explanation}
                  </p>
                </div>
              )}

              {result.example && (
                <div
                  dir="ltr"
                  className="rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground font-mono"
                >
                  {result.example}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setResult(null); setError(null); }}
                >
                  {t("aiTryAgain")}
                </Button>
                <Button type="button" size="sm" onClick={handleInsert}>
                  <Icon name="tabler:code-plus" className="me-2 h-4 w-4" />
                  {t("aiInsertFormula")}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              className="w-full"
              onClick={() => void handleGenerate()}
              disabled={!description.trim() || generating}
            >
              {generating ? (
                <>
                  <Icon name="tabler:loader-2" className="me-2 h-4 w-4 animate-spin" />
                  {t("aiGenerating")}
                </>
              ) : (
                <>
                  <Icon name="tabler:sparkles" className="me-2 h-4 w-4" />
                  {t("aiGenerateFormula")}
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
