"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { useLocale } from "@/providers/locale-provider";
import { AiMarkdown } from "./ai-markdown";

type Props = {
  entityId: string;
};

export function AiKpiExplainer({ entityId }: Props) {
  const { tr, locale } = useLocale();
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function handleExplain() {
    if (explanation && expanded) {
      setExpanded(false);
      return;
    }

    if (explanation) {
      setExpanded(true);
      return;
    }

    setLoading(true);
    setExplanation("");
    setExpanded(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId, locale }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error("ai_error");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value);
          setExplanation(fullText);
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setExplanation(tr("Could not load explanation.", "تعذر تحميل الشرح."));
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function handleClose() {
    if (abortRef.current) abortRef.current.abort();
    setExpanded(false);
    setExplanation(null);
    setLoading(false);
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void handleExplain()}
        disabled={loading}
        className="gap-2"
      >
        {loading ? (
          <Icon name="tabler:loader-2" className="h-4 w-4 animate-spin" />
        ) : (
          <Icon name="tabler:bulb" className="h-4 w-4 text-primary" />
        )}
        {loading
          ? tr("Explaining…", "جارٍ الشرح…")
          : explanation
            ? expanded
              ? tr("Hide Explanation", "إخفاء الشرح")
              : tr("Show Explanation", "عرض الشرح")
            : tr("Explain this KPI", "اشرح هذا المؤشر")}
      </Button>

      {expanded && explanation && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Icon name="tabler:bulb" className="h-3.5 w-3.5 text-primary shrink-0" />
              <p className="text-xs font-medium text-primary">
                {tr("AI Explanation", "شرح الذكاء الاصطناعي")}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleClose}
            >
              <Icon name="tabler:x" className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="text-sm text-foreground leading-relaxed" dir={locale === "ar" ? "rtl" : "ltr"}>
            <AiMarkdown content={explanation} />
            {loading && (
              <span className="inline-flex ms-1 items-center gap-0.5">
                <span className="h-1 w-1 rounded-full bg-foreground animate-bounce [animation-delay:0ms]" />
                <span className="h-1 w-1 rounded-full bg-foreground animate-bounce [animation-delay:150ms]" />
                <span className="h-1 w-1 rounded-full bg-foreground animate-bounce [animation-delay:300ms]" />
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Icon name="tabler:info-circle" className="h-3 w-3" />
            {tr("AI-generated — verify before sharing", "مُنشأ بالذكاء الاصطناعي — تحقق قبل المشاركة")}
          </p>
        </div>
      )}
    </div>
  );
}
