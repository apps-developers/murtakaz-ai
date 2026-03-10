"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { useLocale } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";
import { AiMarkdown } from "./ai-markdown";
import { ChatCardRenderer, type ChatCard } from "./ai-chat-cards";

// ── Types ─────────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  cards?: ChatCard[];
  timestamp: Date;
};

type QuickAction = {
  id: string;
  icon: string;
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
  category: "overview" | "approvals" | "analytics" | "monitoring";
  mockResponse: {
    content: string;
    contentAr: string;
    cards: ChatCard[];
  };
};

// ── Mock quick-action data ────────────────────────────────────────────────────

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "health",
    icon: "tabler:chart-pie-2",
    label: "Health overview",
    labelAr: "نظرة عامة على الصحة",
    description: "Current KPI health score",
    descriptionAr: "درجة صحة المؤشرات الحالية",
    category: "overview",
    mockResponse: {
      content:
        "Here's the current KPI health overview for **Q1 2026**. The organization is performing at a **76% health score** across 48 active KPIs.",
      contentAr:
        "إليك نظرة عامة على صحة مؤشرات الأداء للربع الأول 2026. تحقق المنظمة **76% درجة صحة** عبر 48 مؤشراً نشطاً.",
      cards: [
        {
          type: "kpi-summary",
          data: {
            totalKpis: 48,
            green: 28,
            amber: 12,
            red: 8,
            noData: 0,
            healthScore: 76,
            period: "Q1 2026",
          },
        },
      ],
    },
  },
  {
    id: "red-kpis",
    icon: "tabler:circle-x",
    label: "KPIs behind target",
    labelAr: "مؤشرات متأخرة عن الهدف",
    description: "8 KPIs need attention",
    descriptionAr: "8 مؤشرات تحتاج اهتماماً",
    category: "monitoring",
    mockResponse: {
      content:
        "There are **8 KPIs** currently behind their targets. Here are the most critical ones requiring immediate attention:",
      contentAr:
        "يوجد حالياً **8 مؤشرات** متأخرة عن أهدافها. إليك الأكثر أهمية التي تتطلب اهتماماً فورياً:",
      cards: [
        {
          type: "kpi-red-list",
          data: {
            period: "Q1 2026",
            kpis: [
              { name: "Customer Satisfaction Score", nameAr: "مؤشر رضا العملاء", value: "72", target: "90", unit: "%", dept: "Operations", isAnomaly: true },
              { name: "Revenue Growth Rate", nameAr: "معدل نمو الإيرادات", value: "8.2", target: "15", unit: "%", dept: "Finance" },
              { name: "Project Delivery On-Time", nameAr: "تسليم المشاريع في الوقت", value: "61", target: "85", unit: "%", dept: "PMO" },
              { name: "Employee Engagement Index", nameAr: "مؤشر مشاركة الموظفين", value: "58", target: "75", unit: "%", dept: "HR" },
              { name: "Digital Adoption Rate", nameAr: "معدل التبني الرقمي", value: "43", target: "70", unit: "%", dept: "IT" },
            ],
          },
        },
      ],
    },
  },
  {
    id: "approvals",
    icon: "tabler:clock-check",
    label: "Pending approvals",
    labelAr: "الموافقات المعلقة",
    description: "7 submissions awaiting review",
    descriptionAr: "7 تقديمات تنتظر المراجعة",
    category: "approvals",
    mockResponse: {
      content:
        "There are **7 KPI submissions** currently pending your approval. **2 of them** have been flagged as anomalies and need closer review.",
      contentAr:
        "يوجد **7 تقديمات مؤشرات** معلقة تنتظر موافقتك. **2 منها** أُبلغ عنهما كشذوذات وتحتاج مراجعة دقيقة.",
      cards: [
        {
          type: "approvals",
          data: {
            totalPending: 7,
            items: [
              { kpiName: "Customer Satisfaction Score", kpiNameAr: "مؤشر رضا العملاء", submittedBy: "Ahmed Al-Rashidi", value: "72%", target: "90%", isAnomaly: true, dept: "Operations" },
              { kpiName: "Revenue Growth Rate", kpiNameAr: "معدل نمو الإيرادات", submittedBy: "Sara Al-Mansouri", value: "8.2%", target: "15%", dept: "Finance" },
              { kpiName: "Training Completion Rate", kpiNameAr: "معدل إتمام التدريب", submittedBy: "Khalid Al-Otaibi", value: "91%", target: "85%", dept: "HR" },
              { kpiName: "IT Incident Resolution", kpiNameAr: "حل حوادث تقنية المعلومات", submittedBy: "Nora Al-Harbi", value: "4.2h", target: "3h", isAnomaly: true, dept: "IT" },
            ],
          },
        },
      ],
    },
  },
  {
    id: "departments",
    icon: "tabler:building",
    label: "Department performance",
    labelAr: "أداء الإدارات",
    description: "Breakdown by department",
    descriptionAr: "تفصيل حسب الإدارات",
    category: "analytics",
    mockResponse: {
      content:
        "Here's the performance breakdown across departments. **Finance** leads at 88% health, while **IT** needs attention at 52%.",
      contentAr:
        "إليك تفصيل الأداء عبر الإدارات. تتصدر **المالية** بـ 88% صحة، بينما تحتاج **تقنية المعلومات** إلى اهتمام بـ 52%.",
      cards: [
        {
          type: "dept-health",
          data: {
            departments: [
              { name: "Finance", nameAr: "المالية", score: 88, green: 9, amber: 2, red: 1 },
              { name: "Operations", nameAr: "العمليات", score: 79, green: 7, amber: 4, red: 2 },
              { name: "Human Resources", nameAr: "الموارد البشرية", score: 74, green: 5, amber: 3, red: 2 },
              { name: "PMO", nameAr: "مكتب المشاريع", score: 67, green: 4, amber: 3, red: 3 },
              { name: "Marketing", nameAr: "التسويق", score: 62, green: 3, amber: 4, red: 2 },
              { name: "IT", nameAr: "تقنية المعلومات", score: 52, green: 3, amber: 2, red: 5 },
            ],
          },
        },
      ],
    },
  },
  {
    id: "trend",
    icon: "tabler:trending-up",
    label: "Q1 vs Q2 trend",
    labelAr: "اتجاه الربع الأول مقابل الثاني",
    description: "Quarter-over-quarter changes",
    descriptionAr: "التغييرات ربع السنوية",
    category: "analytics",
    mockResponse: {
      content:
        "Comparing **Q1 vs Q2 2026**: 19 KPIs improved while 11 declined. Notable improvement in Finance and HR, but IT showed a downward trend.",
      contentAr:
        "مقارنة **الربع الأول مقابل الثاني 2026**: تحسّن 19 مؤشراً بينما تراجع 11. تحسّن ملحوظ في المالية والموارد البشرية، لكن تقنية المعلومات أظهرت اتجاهاً تنازلياً.",
      cards: [
        {
          type: "trend",
          data: {
            periodA: "Q1",
            periodB: "Q2",
            improved: 19,
            declined: 11,
            unchanged: 8,
            highlights: [
              { name: "Customer Satisfaction", nameAr: "رضا العملاء", change: 12, direction: "up" },
              { name: "Revenue Growth", nameAr: "نمو الإيرادات", change: 8, direction: "up" },
              { name: "IT Incident Resolution", nameAr: "حل حوادث تقنية المعلومات", change: -15, direction: "down" },
              { name: "Digital Adoption Rate", nameAr: "معدل التبني الرقمي", change: -7, direction: "down" },
            ],
          },
        },
      ],
    },
  },
  {
    id: "anomalies",
    icon: "tabler:alert-triangle",
    label: "Anomalies this month",
    labelAr: "الشذوذات هذا الشهر",
    description: "Unusual KPI submissions",
    descriptionAr: "تقديمات مؤشرات غير عادية",
    category: "monitoring",
    mockResponse: {
      content:
        "**3 anomalous submissions** were detected this month. These values deviate significantly from historical averages and may require investigation before approval.",
      contentAr:
        "تم رصد **3 تقديمات شاذة** هذا الشهر. تنحرف هذه القيم بشكل ملحوظ عن المتوسطات التاريخية وقد تستلزم تحقيقاً قبل الموافقة.",
      cards: [
        {
          type: "kpi-red-list",
          data: {
            period: "March 2026",
            kpis: [
              { name: "Customer Satisfaction Score", nameAr: "مؤشر رضا العملاء", value: "72", target: "90", unit: "%", dept: "Operations", isAnomaly: true },
              { name: "IT Incident Resolution Time", nameAr: "وقت حل حوادث تقنية المعلومات", value: "4.2h", target: "3h", dept: "IT", isAnomaly: true },
              { name: "Supply Chain Lead Time", nameAr: "وقت دورة سلسلة التوريد", value: "18d", target: "12d", dept: "Operations", isAnomaly: true },
            ],
          },
        },
      ],
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMsgId() {
  return Math.random().toString(36).slice(2);
}

function parseCardsFromContent(content: string): { text: string; cards: ChatCard[] } {
  const cards: ChatCard[] = [];
  const text = content
    .replace(/```card\n([\s\S]*?)\n```/g, (_, json: string) => {
      try {
        cards.push(JSON.parse(json) as ChatCard);
      } catch {}
      return "";
    })
    .trim();
  return { text, cards };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AiChatPanel() {
  const { t, tr, locale, isArabic } = useLocale();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          id: makeMsgId(),
          role: "assistant",
          content: t("aiWelcomeMessage"),
          timestamp: new Date(),
        },
      ]);
    }
  }, [open, messages.length, t]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  function handleQuickAction(action: QuickAction) {
    if (thinking) return;
    const userMsg: Message = {
      id: makeMsgId(),
      role: "user",
      content: isArabic ? action.labelAr : action.label,
      timestamp: new Date(),
    };
    const assistantMsg: Message = {
      id: makeMsgId(),
      role: "assistant",
      content: isArabic ? action.mockResponse.contentAr : action.mockResponse.content,
      cards: action.mockResponse.cards,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || thinking) return;

    const userMsg: Message = {
      id: makeMsgId(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, locale }),
      });

      if (!res.ok) throw new Error("ai_error");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      const assistantId = makeMsgId();

      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", timestamp: new Date() },
      ]);
      setThinking(false);

      if (reader) {
        let accumulated = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: accumulated } : m,
            ),
          );
        }
        const { text: parsed, cards } = parseCardsFromContent(accumulated);
        if (cards.length > 0) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: parsed, cards } : m,
            ),
          );
        }
      }
    } catch {
      setThinking(false);
      setMessages((prev) => [
        ...prev,
        {
          id: makeMsgId(),
          role: "assistant",
          content: t("aiUnavailable"),
          timestamp: new Date(),
        },
      ]);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  function handleClear() {
    setMessages([]);
    setInput("");
  }

  const showSuggestions = messages.length <= 1 && !thinking;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t("aiAssistant")}
        className={cn(
          "fixed bottom-6 end-6 z-[70] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200",
          "bg-primary text-primary-foreground hover:scale-105 hover:shadow-xl",
          open && "opacity-0 pointer-events-none scale-90",
        )}
      >
        <Icon name="tabler:message-chatbot" className="h-6 w-6" />
      </button>

      <div
        className={cn(
          "fixed bottom-0 end-0 z-[70] flex flex-col",
          "h-full max-h-[680px] w-full max-w-[440px]",
          "transition-all duration-300 ease-in-out",
          open
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-4 opacity-0 pointer-events-none",
          "sm:bottom-6 sm:end-6 sm:rounded-2xl sm:shadow-2xl sm:border sm:border-border",
          "bg-background",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border bg-primary px-4 py-3 sm:rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20">
              <Icon name="tabler:sparkles" className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-foreground">{t("aiAssistant")}</p>
              <p className="text-[10px] text-primary-foreground/70">{t("aiPowered")}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                onClick={handleClear}
                title={tr("Clear chat", "مسح المحادثة")}
              >
                <Icon name="tabler:trash" className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
              onClick={() => setOpen(false)}
            >
              <Icon name="tabler:x" className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-3"
          dir={isArabic ? "rtl" : "ltr"}
        >
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs text-muted-foreground">
            {t("aiReadOnly")}
          </div>

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn("flex flex-col w-full", msg.role === "user" ? "items-end" : "items-start")}
            >
              <div className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start", "w-full")}>
                {msg.role === "assistant" && (
                  <div className="me-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Icon name="tabler:sparkles" className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm",
                  )}
                >
                  {msg.content ? (
                    msg.role === "assistant" ? (
                      <AiMarkdown content={msg.content} dir={isArabic ? "rtl" : "ltr"} />
                    ) : (
                      msg.content
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
                    </span>
                  )}
                </div>
              </div>

              {/* Inline cards below assistant bubble */}
              {msg.role === "assistant" && msg.cards && msg.cards.length > 0 && (
                <div className="w-full ps-9 space-y-1">
                  {msg.cards.map((card, i) => (
                    <ChatCardRenderer key={i} card={card} />
                  ))}
                </div>
              )}
            </div>
          ))}

          {thinking && (
            <div className="flex justify-start">
              <div className="me-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Icon name="tabler:sparkles" className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}

          {/* Quick action suggestions — shown on empty state */}
          {showSuggestions && (
            <div className="space-y-2.5 pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
                {tr("Quick Insights", "رؤى سريعة")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleQuickAction(action)}
                    className={cn(
                      "flex items-start gap-2 rounded-xl border border-border bg-card p-2.5 text-start",
                      "hover:bg-muted/50 hover:border-primary/30 transition-colors",
                    )}
                  >
                    <Icon name={action.icon} className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground leading-tight">
                        {isArabic ? action.labelAr : action.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                        {isArabic ? action.descriptionAr : action.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("aiAskPlaceholder")}
              rows={1}
              dir={isArabic ? "rtl" : "ltr"}
              className={cn(
                "flex-1 resize-none rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm",
                "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30",
                "min-h-[42px] max-h-[120px]",
              )}
              style={{ overflowY: "auto" }}
            />
            <Button
              size="icon"
              className="h-[42px] w-[42px] shrink-0"
              onClick={() => void handleSend()}
              disabled={!input.trim() || thinking}
              aria-label={t("aiSend")}
            >
              <Icon name={isArabic ? "tabler:send-2" : "tabler:send"} className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            {t("aiDataAsOf")} {new Date().toLocaleDateString(locale)}
          </p>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[65] sm:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
