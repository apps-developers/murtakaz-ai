"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EChart } from "@/components/charts/echart";
import { useLocale } from "@/providers/locale-provider";
import type { EChartsOption } from "echarts";

type SavedChart = {
  id: string;
  title: string;
  chartType: string;
  option: EChartsOption;
  createdAt: string;
};

const STORAGE_KEY = "ai-saved-charts";

function loadSavedCharts(): SavedChart[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedChart[]) : [];
  } catch {
    return [];
  }
}

function persistCharts(charts: SavedChart[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(charts));
  } catch {
    // quota exceeded — silently fail
  }
}

export function AiChartGenerator() {
  const { tr } = useLocale();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ title: string; chartType: string; option: EChartsOption } | null>(null);
  const [savedCharts, setSavedCharts] = useState<SavedChart[]>([]);

  useEffect(() => {
    setSavedCharts(loadSavedCharts());
  }, []);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const res = await fetch("/api/ai/generate-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!res.ok) throw new Error("ai_error");

      const data = await res.json();
      setPreview({
        title: data.title,
        chartType: data.chartType,
        option: data.option as EChartsOption,
      });
    } catch {
      setError(tr("Failed to generate chart. Try again.", "فشل توليد الرسم البياني. حاول مجدداً."));
    } finally {
      setLoading(false);
    }
  }

  function handleSave() {
    if (!preview) return;
    const chart: SavedChart = {
      id: Math.random().toString(36).slice(2),
      title: preview.title,
      chartType: preview.chartType,
      option: preview.option,
      createdAt: new Date().toISOString(),
    };
    const updated = [chart, ...savedCharts];
    setSavedCharts(updated);
    persistCharts(updated);
    setPreview(null);
    setPrompt("");
  }

  function handleDelete(id: string) {
    const updated = savedCharts.filter((c) => c.id !== id);
    setSavedCharts(updated);
    persistCharts(updated);
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card/70 backdrop-blur shadow-sm border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon name="tabler:sparkles" className="h-5 w-5 text-primary" />
            {tr("AI Chart Generator", "مُولّد الرسوم البيانية بالذكاء الاصطناعي")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={tr(
                "e.g. Bar chart comparing top 5 KPIs by achievement rate",
                "مثال: رسم بياني شريطي يقارن أفضل 5 مؤشرات حسب معدل الإنجاز",
              )}
              className="bg-card"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading) void handleGenerate();
              }}
            />
            <Button
              onClick={() => void handleGenerate()}
              disabled={loading || !prompt.trim()}
              className="shrink-0"
            >
              {loading ? (
                <>
                  <Icon name="tabler:loader-2" className="me-2 h-4 w-4 animate-spin" />
                  {tr("Generating…", "جارٍ التوليد…")}
                </>
              ) : (
                <>
                  <Icon name="tabler:sparkles" className="me-2 h-4 w-4" />
                  {tr("Generate", "توليد")}
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {preview && (
            <div className="space-y-3">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">{preview.title}</h3>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider bg-muted/30 px-2 py-0.5 rounded-full">
                    {preview.chartType}
                  </span>
                </div>
                <EChart option={preview.option} height={300} />
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setPreview(null)}>
                  {tr("Discard", "تجاهل")}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => void handleGenerate()}>
                  <Icon name="tabler:refresh" className="me-1.5 h-3.5 w-3.5" />
                  {tr("Regenerate", "إعادة التوليد")}
                </Button>
                <Button type="button" size="sm" onClick={handleSave}>
                  <Icon name="tabler:device-floppy" className="me-1.5 h-3.5 w-3.5" />
                  {tr("Save to Dashboard", "حفظ في لوحة المعلومات")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {savedCharts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {tr("Saved Charts", "الرسوم البيانية المحفوظة")} ({savedCharts.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {savedCharts.map((chart) => (
              <Card key={chart.id} className="bg-card/70 backdrop-blur shadow-sm group relative">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{chart.title}</CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDelete(chart.id)}
                    >
                      <Icon name="tabler:x" className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <EChart option={chart.option} height={220} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
