// =============================================================
// ProductiveDay — AI Planner Chat  (mobile-first redesign)
// =============================================================

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Send, ChevronRight, ArrowRight } from "lucide-react";
import type { TimeBlockData } from "@/data/plannerData";
import {
  callGroq, parsePlanFromResponse,
  getGroqKey,
  type ChatMessage,
} from "@/lib/groq";

// ── Props ──────────────────────────────────────────────────────

interface Props {
  onSaveBlocks: (blocks: TimeBlockData[]) => Promise<void>;
  onViewPlanner: () => void;
  onUseClassic: () => void;
  dateLabel: string;
}

// ── Helpers ────────────────────────────────────────────────────

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}

const CAT_COLOURS: Record<string, string> = {
  Health: "#52be8b", Learning: "#2761d8", Revenue: "#e35758",
  Creative: "#a855f7", Personal: "#f59e0b", Product: "#0ea5e9",
  Operations: "#8b5cf6", Delivery: "#10b981", Branding: "#ec4899",
  "Side Projects": "#f97316", CIM: "#eab308", Networking: "#14b8a6",
};
const catColour = (cat: string) => CAT_COLOURS[cat] ?? "#9ca3af";

interface UIMessage {
  role: "user" | "assistant" | "greeting";
  content: string;
  plan?: { message: string; blocks: TimeBlockData[] } | null;
}

// ── Component ──────────────────────────────────────────────────

export function AIPlannerChat({ onSaveBlocks, onViewPlanner, onUseClassic, dateLabel }: Props) {
  const [messages, setMessages] = useState<UIMessage[]>([{ role: "greeting", content: "" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planReady, setPlanReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const historyRef = useRef<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const apiKey = getGroqKey();
    if (!apiKey) {
      setError("AI is temporarily unavailable. Please try again later.");
      return;
    }

    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    historyRef.current = [...historyRef.current, { role: "user", content: text }];
    setLoading(true);

    try {
      const reply = await callGroq(historyRef.current, apiKey);
      const plan = parsePlanFromResponse(reply);

      setMessages((prev) => [...prev, { role: "assistant", content: plan?.message ?? reply, plan }]);
      historyRef.current = [...historyRef.current, { role: "assistant", content: reply }];

      if (plan) {
        setSaving(true);
        await onSaveBlocks(plan.blocks);
        setSaving(false);
        setPlanReady(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [input, loading, onSaveBlocks]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const nonGreeting = messages.filter((m) => m.role !== "greeting");
  const hasConversation = nonGreeting.length > 0;

  return (
    <div
      className="flex flex-col bg-background"
      style={{ height: "100dvh", maxHeight: "100dvh" }}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3
                      border-b border-border/40 bg-background/95 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shadow-brand">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-[14px] font-bold text-foreground leading-tight">Plan Your Day</div>
            <div className="text-[11px] text-muted-foreground leading-none mt-0.5">{dateLabel}</div>
          </div>
        </div>
        <button
          onClick={onViewPlanner}
          className={[
            "text-xs font-semibold px-3 py-1.5 rounded-xl transition-all",
            planReady
              ? "bg-primary text-primary-foreground shadow-brand"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
          ].join(" ")}
        >
          {planReady ? "Open Planner →" : "Skip"}
        </button>
      </div>

      {/* ── Messages ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className={[
          "px-4 py-5 space-y-4 min-h-full flex flex-col",
          !hasConversation ? "justify-center" : "justify-start",
        ].join(" ")}>

          {/* Greeting card — shown when no conversation yet */}
          {!hasConversation && (
            <div className="animate-fade-in">
              {/* AI avatar + greeting */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center
                                flex-shrink-0 shadow-brand mt-0.5">
                  <Sparkles className="w-4.5 h-4.5 text-white" />
                </div>
                <div className="bg-card border border-border/50 rounded-2xl rounded-tl-md
                                px-4 py-3.5 shadow-card flex-1">
                  <p className="text-[15px] font-semibold text-foreground mb-1">
                    Good {getTimeOfDay()}! 👋
                  </p>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    Tell me what's on your plate — tasks, projects, meetings, deadlines.
                    I'll build you an optimised time-blocked schedule.
                  </p>
                </div>
              </div>

              {/* Quick-start chips */}
              <div className="ml-12 space-y-1.5">
                <p className="text-[11px] text-muted-foreground font-medium mb-2 uppercase tracking-wider">
                  Try saying:
                </p>
                {[
                  "Client project, CIM lecture at 2 PM, record YouTube content",
                  "Deep work morning, team standup 10 AM, gym at 6 PM",
                  "Design sprint all day, 1:1 with manager at 3 PM",
                ].map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(chip); inputRef.current?.focus(); }}
                    className="w-full text-left text-[12px] text-muted-foreground border border-border/40
                               rounded-xl px-3 py-2 hover:bg-muted/40 hover:border-border/70
                               hover:text-foreground transition-all leading-snug"
                  >
                    "{chip}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation messages */}
          {nonGreeting.map((msg, i) => {
            if (msg.role === "user") {
              return (
                <div key={i} className="flex justify-end animate-slide-right">
                  <div className="gradient-brand text-white rounded-2xl rounded-tr-sm
                                  px-4 py-3 max-w-[82%] text-[13px] leading-relaxed
                                  shadow-brand whitespace-pre-wrap">
                    {msg.content}
                  </div>
                </div>
              );
            }

            return (
              <div key={i} className="space-y-2 animate-fade-in">
                {/* AI bubble */}
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center
                                  flex-shrink-0 mt-0.5 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-card border border-border/40 rounded-2xl rounded-tl-sm
                                  px-4 py-3 max-w-[82%] shadow-card">
                    <p className="text-[13px] leading-relaxed text-foreground">{msg.content}</p>
                  </div>
                </div>

                {/* Block preview */}
                {msg.plan && (
                  <div className="ml-9 space-y-1.5">
                    {/* Schedule cards */}
                    <div className="bg-card border border-border/30 rounded-2xl overflow-hidden shadow-card">
                      {msg.plan.blocks.slice(0, 7).map((b, j) => (
                        <div
                          key={j}
                          className={[
                            "flex items-center gap-2.5 px-3 py-2.5 text-xs",
                            j < Math.min(msg.plan!.blocks.length, 7) - 1
                              ? "border-b border-border/30"
                              : "",
                          ].join(" ")}
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: catColour(b.cat) }}
                          />
                          <span className="font-mono text-muted-foreground flex-shrink-0 text-[10px] w-24">
                            {b.time}
                          </span>
                          <span className="font-medium text-foreground truncate flex-1 text-[12px]">
                            {b.block}
                          </span>
                        </div>
                      ))}
                      {msg.plan.blocks.length > 7 && (
                        <div className="px-3 py-2 text-[11px] text-muted-foreground border-t border-border/30 text-center">
                          +{msg.plan.blocks.length - 7} more blocks
                        </div>
                      )}
                    </div>

                    {/* Save status */}
                    {saving ? (
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground px-1 pt-0.5">
                        <span className="w-3 h-3 border border-primary/40 border-t-primary rounded-full animate-spin" />
                        Saving to your planner…
                      </div>
                    ) : planReady ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 px-1 pt-0.5 font-semibold">
                        <span>✓</span>
                        {msg.plan.blocks.length} blocks saved to your planner
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing */}
          {loading && (
            <div className="flex items-start gap-2.5 animate-fade-in">
              <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center
                              flex-shrink-0 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-card border border-border/40 rounded-2xl rounded-tl-sm px-4 py-3 shadow-card">
                <TypingDots />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-destructive/8 border border-destructive/20 rounded-xl px-3 py-2.5
                            text-[12px] text-destructive flex items-start gap-2">
              <span className="flex-shrink-0 mt-px">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Plan ready banner */}
          {planReady && !saving && (
            <div className="bg-primary/5 border border-primary/20 rounded-2xl px-4 py-4
                            flex items-center justify-between gap-3 animate-scale-in">
              <div>
                <p className="text-[13px] font-bold text-primary">Your plan is ready! 🎉</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Refine it with another message, or open the planner.
                </p>
              </div>
              <button
                onClick={onViewPlanner}
                className="flex items-center gap-1 text-[12px] font-bold text-white
                           gradient-brand shadow-brand px-3 py-2 rounded-xl flex-shrink-0
                           transition active:scale-95"
              >
                Open <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Input area ──────────────────────────────────────── */}
      <div
        className="flex-shrink-0 border-t border-border/40 bg-background/95 backdrop-blur-xl px-4 pt-3"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        {planReady && (
          <p className="text-[11px] text-muted-foreground text-center mb-2">
            Refine your plan or{" "}
            <button onClick={onViewPlanner} className="text-primary font-semibold hover:underline">
              open the planner →
            </button>
          </p>
        )}

        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              planReady
                ? "Adjust the plan, e.g. \"Move client work to afternoon\""
                : "Tell me your tasks, projects and goals for today…"
            }
            rows={1}
            disabled={loading}
            className="flex-1 resize-none rounded-2xl border border-border/60 bg-muted/20
                       px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground/60
                       outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40
                       min-h-[46px] max-h-[120px] overflow-y-auto transition-all
                       disabled:opacity-50 leading-relaxed"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="w-11 h-11 rounded-2xl gradient-brand text-white flex items-center justify-center
                       shadow-brand hover:shadow-brand-lg active:scale-95 disabled:opacity-40
                       transition-all flex-shrink-0"
            aria-label="Send"
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Send className="w-4 h-4" />}
          </button>
        </div>

        {!planReady && (
          <button
            onClick={onUseClassic}
            className="w-full text-center text-[11px] text-muted-foreground/60
                       hover:text-muted-foreground transition mt-2.5 py-1"
          >
            Set up manually without AI →
          </button>
        )}
      </div>
    </div>
  );
}
