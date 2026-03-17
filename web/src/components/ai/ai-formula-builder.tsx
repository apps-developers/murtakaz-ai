"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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

type SuggestedVariable = {
  code: string;
  displayName: string;
  nameAr?: string;
  description?: string;
  dataType: "NUMBER" | "PERCENTAGE";
  isRequired?: boolean;
  isStatic?: boolean;
  staticValue?: number;
};

type Props = {
  variables?: Variable[];
  onInsert: (formula: string, suggestedVariables?: SuggestedVariable[]) => void;
};

type GeneratedResult = {
  formula: string;
  explanation: string;
  example?: string;
  suggestedVariables?: SuggestedVariable[];
};

export function AiFormulaBuilder({ variables = [], onInsert }: Props) {
  const { t, tr, isArabic } = useLocale();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [refinement, setRefinement] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(refineText?: string) {
    const text = refineText?.trim() || description.trim();
    if (!text) return;

    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/formula", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: text,
          variables,
          previousFormula: result?.formula || undefined,
        }),
      });

      if (!res.ok) throw new Error("ai_error");

      const data = (await res.json()) as GeneratedResult;
      setResult(data);
      setRefinement("");
    } catch {
      setError(t("aiUnavailable"));
    } finally {
      setGenerating(false);
    }
  }

  function handleInsert() {
    if (!result?.formula) return;
    onInsert(result.formula, result.suggestedVariables);
    setOpen(false);
    setDescription("");
    setRefinement("");
    setResult(null);
  }

  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (!val) {
      setDescription("");
      setRefinement("");
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

          {!result && (
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
          )}

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

              {result.suggestedVariables && result.suggestedVariables.length > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    {tr("Suggested Variables", "متغيرات مقترحة")} ({result.suggestedVariables.length})
                  </p>
                  <div className="space-y-2">
                    {result.suggestedVariables.map((sv) => (
                      <div key={sv.code} className="rounded-md border border-border/50 bg-background/50 p-2 space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <code className="rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[11px]">
                            {sv.code}
                          </code>
                          <span className="font-medium">{sv.displayName}</span>
                          <span className="text-[10px] text-muted-foreground/60">[{sv.dataType}]</span>
                          {sv.isRequired && (
                            <span className="text-[10px] text-red-500 font-medium">{tr("Required", "مطلوب")}</span>
                          )}
                          {sv.isStatic && (
                            <span className="text-[10px] text-blue-500 font-medium">{tr("Static", "ثابت")}={sv.staticValue}</span>
                          )}
                        </div>
                        {sv.nameAr && (
                          <div className="text-[11px] text-muted-foreground text-right" dir="rtl">
                            {sv.nameAr}
                          </div>
                        )}
                        {sv.description && (
                          <div className="text-[11px] text-muted-foreground">
                            {sv.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {tr("These variables will be created when you insert the formula.", "سيتم إنشاء هذه المتغيرات عند إدراج المعادلة.")}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Input
                  value={refinement}
                  onChange={(e) => setRefinement(e.target.value)}
                  placeholder={tr("Refine: e.g. use percentage instead…", "تحسين: مثلاً استخدم النسبة المئوية…")}
                  dir={isArabic ? "rtl" : "ltr"}
                  className="bg-card text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !generating && refinement.trim()) {
                      void handleGenerate(refinement);
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleGenerate(refinement)}
                  disabled={generating || !refinement.trim()}
                  className="shrink-0"
                >
                  {generating ? (
                    <Icon name="tabler:loader-2" className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon name="tabler:refresh" className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setResult(null); setError(null); setDescription(""); }}
                >
                  {tr("Start Over", "البدء من جديد")}
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
