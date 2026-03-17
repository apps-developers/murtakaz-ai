"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { useLocale } from "@/providers/locale-provider";

type TranslateFields = {
  title?: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  unit?: string;
  unitAr?: string;
};

type TranslatedToEn = {
  title?: string;
  description?: string;
  unit?: string;
};

type TranslatedToAr = {
  titleAr?: string;
  descriptionAr?: string;
  unitAr?: string;
};

type Props = {
  fields: TranslateFields;
  direction?: "en_to_ar" | "ar_to_en";
  hasExisting?: boolean;
  onTranslated: (result: TranslatedToEn | TranslatedToAr) => void;
};

export function AiTranslateButton({ fields, direction = "ar_to_en", hasExisting, onTranslated }: Props) {
  const { t, tr } = useLocale();
  const [translating, setTranslating] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const isToEn = direction === "ar_to_en";

  async function doTranslate() {
    setTranslating(true);
    setConfirming(false);
    try {
      const payload = isToEn
        ? { title: fields.titleAr, description: fields.descriptionAr, unit: fields.unitAr }
        : { title: fields.title, description: fields.description, unit: fields.unit };

      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: payload, direction }),
      });
      if (!res.ok) throw new Error("ai_error");
      const data = await res.json();
      onTranslated(data);
    } catch {
      // silently fail — user still has manual fields
    } finally {
      setTranslating(false);
    }
  }

  const sourceField = isToEn ? fields.titleAr : fields.title;

  function handleClick() {
    if (hasExisting) {
      setConfirming(true);
      return;
    }
    void doTranslate();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
        <Icon name="tabler:alert-triangle" className="h-4 w-4 shrink-0" />
        <span className="flex-1">
          {isToEn
            ? tr("English fields already have content. Overwrite with AI translation?", "الحقول الإنجليزية تحتوي على محتوى بالفعل. هل تريد الاستبدال بالترجمة؟")
            : t("aiTranslateConfirmOverwrite")}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => setConfirming(false)}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => void doTranslate()}
          >
            {tr("Overwrite", "استبدال")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={translating || !sourceField?.trim()}
      className="gap-2"
    >
      {translating ? (
        <Icon name="tabler:loader-2" className="h-4 w-4 animate-spin" />
      ) : (
        <Icon name="tabler:sparkles" className="h-4 w-4 text-primary" />
      )}
      {translating
        ? t("aiTranslating")
        : isToEn
          ? t("aiTranslateToEnglish")
          : t("aiTranslateToArabic")}
    </Button>
  );
}
