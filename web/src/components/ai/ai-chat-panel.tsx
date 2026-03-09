"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { useLocale } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

function makeMsgId() {
  return Math.random().toString(36).slice(2);
}

export function AiChatPanel() {
  const { t, locale, isArabic } = useLocale();
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
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + chunk } : m,
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
          "h-full max-h-[600px] w-full max-w-[420px]",
          "transition-all duration-300 ease-in-out",
          open
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-4 opacity-0 pointer-events-none",
          "sm:bottom-6 sm:end-6 sm:rounded-2xl sm:shadow-2xl sm:border sm:border-border",
          "bg-background",
        )}
      >
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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
            onClick={() => setOpen(false)}
          >
            <Icon name="tabler:x" className="h-4 w-4" />
          </Button>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
          dir={isArabic ? "rtl" : "ltr"}
        >
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs text-muted-foreground">
            {t("aiReadOnly")}
          </div>

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {msg.role === "assistant" && (
                <div className="me-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Icon name="tabler:sparkles" className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm",
                )}
              >
                {msg.content || (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
                  </span>
                )}
              </div>
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
        </div>

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
