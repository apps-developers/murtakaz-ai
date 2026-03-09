"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { useLocale } from "@/providers/locale-provider";

type Props = {
  entityTitle?: string;
  enteredValue?: number | null;
  historicalAvg?: number | null;
  unit?: string;
  onSuggested: (note: string) => void;
};

export function AiSuggestNoteButton({
  entityTitle,
  enteredValue,
  historicalAvg,
  unit = "",
  onSuggested,
}: Props) {
  const { t, locale } = useLocale();
  const [loading, setLoading] = useState(false);

  async function handleSuggest() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/suggest-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityTitle, enteredValue, historicalAvg, unit, locale }),
      });
      if (!res.ok) throw new Error("ai_error");
      const data = (await res.json()) as { note: string };
      onSuggested(data.note);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-primary"
      onClick={() => void handleSuggest()}
      disabled={loading}
    >
      {loading ? (
        <Icon name="tabler:loader-2" className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Icon name="tabler:sparkles" className="h-3.5 w-3.5 text-primary" />
      )}
      {loading ? t("aiThinking") : t("aiSuggestNote")}
    </Button>
  );
}
