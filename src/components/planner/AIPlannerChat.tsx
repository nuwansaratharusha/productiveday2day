// =============================================================
// ProductiveDay — AI Planner Chat  (Gemini-style redesign)
// =============================================================

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles, Send, ArrowRight, ChevronRight,
  Briefcase, Target, Layers,
} from "lucide-react";
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

// ── Static data ────────────────────────────────────────────────

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const CHIPS = [
  {
    Icon: Briefcase,
    title: "Client work + lecture + recording",
    prompt: "Client project, CIM lecture at 2 PM, record YouTube content",
  },
  {
    Icon: Target,
    title: "Deep focus morning, standup & gym",
    prompt: "Deep work morning, team standup 10 AM, gym at 6 PM",
  },
  {
    Icon: Layers,
    title: "Design sprint + manager 1:1",
    prompt: "Design sprint all day, 1:1 with manager at 3 PM",
  },
] as const;

const CAT_COLOURS: Record<string, string> = {
  Health: "#52be8b", Learning: "#2761d8", Revenue: "#e35758",
  Creative: "#a855f7", Personal: "#f59e0b", Product: "#0ea5e9",
  Operations: "#8b5cf6", Delivery: "#10b981", Branding: "#ec4899",
  "Side Projects": "#f97316", CIM: "#eab308", Networking: "#14b8a6",
};
const catColour = (cat: string) => CAT_COLOURS[cat] ?? "#9ca3af";

// ── Sub-components ─────────────────────────────────────────────

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-[5px] py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-bounce"
          style={{ animationDelay: `${i * 140}ms` }}
        />
      ))}
    </span>
  );
}

interface UIMessage {
  role: "user" | "assistant";
  content: string;
  plan?: { message: string; blocks: TimeBlockData[] } | null;
}

// ── Component ──────────────────────────────────────────────────

export function AIPlannerChat({ onSaveBlocks, onViewPlanner, onUseClassic, dateLabel }: Props) {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planReady, setPlanReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const historyRef    = useRef<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef      = useRef<HTMLTextAreaElement>(null);

  const hasConversation = messages.length > 0;

  // Scroll to latest message
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
      const plan  = parsePlanFromResponse(reply);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: plan?.message ?? reply, plan },
      ]);
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

  // ── Render ────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col bg-background"
      style={{ height: "100dvh", maxHeight: "100dvh", overflow: "hidden" }}
    >

      {/* ════════════════════════════════════════════════════════
          HEADER — always visible, minimal
      ════════════════════════════════════════════════════════ */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4"
        style={{
          paddingTop: "max(14px, env(safe-area-inset-top, 14px))",
          paddingBottom: "12px",
          background: "hsl(var(--background))",
          borderBottom: hasConversation
            ? "1px solid hsl(var(--border) / 0.7)"
            : "1px solid transparent",
        }}
      >
        {/* Left: brand */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center shadow-sm flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[13px] font-semibold text-foreground">AI Planner</span>
          {!hasConversation && (
            <span className="text-[11px] text-muted-foreground ml-0.5">· {dateLabel}</span>
          )}
        </div>

        {/* Right: action */}
        <button
          onClick={planReady ? onViewPlanner : onUseClassic}
          className={[
            "text-[12px] font-semibold px-3 py-1.5 rounded-xl transition-all",
            planReady
              ? "gradient-brand text-white shadow-brand"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          {planReady ? "Open Planner →" : "Skip"}
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════
          CONTENT AREA
      ════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto overscroll-contain">

        {/* ── Empty state: Gemini-style centered welcome ────── */}
        {!hasConversation && (
          <div
            className="h-full flex flex-col items-center justify-center px-5"
            style={{ paddingBottom: "8px" }}
          >
            {/* Large gradient icon */}
            <div className="w-[68px] h-[68px] rounded-[22px] gradient-brand
                            flex items-center justify-center shadow-brand-lg mb-5 animate-float">
              <Sparkles className="w-8 h-8 text-white" />
            </div>

            {/* Greeting */}
            <h1 className="text-[24px] font-bold text-foreground text-center leading-tight mb-2">
              Good {getTimeOfDay()}! 👋
            </h1>
            <p className="text-[14px] text-muted-foreground text-center leading-relaxed mb-7 max-w-[280px]">
              Tell me what's on your plate and I'll build an optimised time-blocked schedule for today.
            </p>

            {/* Suggestion cards */}
            <div className="w-full max-w-[380px] space-y-2.5">
              <p className="text-[11px] text-muted-foreground/70 font-medium uppercase tracking-wider text-center mb-1">
                Try a quick start
              </p>
              {CHIPS.map(({ Icon, title, prompt }, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                  className="w-full flex items-center gap-3 bg-card border border-border/60
                             rounded-2xl px-4 py-3.5 text-left shadow-card
                             hover:bg-muted/40 hover:border-border/80 active:scale-[0.98]
                             transition-all duration-150"
                >
                  <div className="w-9 h-9 rounded-xl bg-muted/70 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4.5 h-4.5 text-muted-foreground" />
                  </div>
                  <span className="text-[13px] text-foreground leading-snug flex-1 font-medium">
                    {title}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Active conversation ──────────────────────────── */}
        {hasConversation && (
          <div className="px-4 pt-5 pb-3 space-y-5">
            {messages.map((msg, i) => {

              /* User message */
              if (msg.role === "user") {
                return (
                  <div key={i} className="flex justify-end animate-slide-right">
                    <div
                      className="gradient-brand text-white rounded-2xl rounded-br-sm
                                 px-4 py-3 max-w-[78%] text-[14px] leading-relaxed
                                 shadow-brand whitespace-pre-wrap"
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              }

              /* AI message */
              return (
                <div key={i} className="space-y-3 animate-fade-in">
                  {/* Bubble */}
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center
                                    flex-shrink-0 mt-0.5 shadow-sm">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                    {/* Text — no heavy card, just clean text */}
                    <p className="text-[14px] leading-relaxed text-foreground flex-1 pt-0.5">
                      {msg.content}
                    </p>
                  </div>

                  {/* Block preview card */}
                  {msg.plan && (
                    <div className="ml-10 space-y-2">
                      <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-card">
                        {msg.plan.blocks.slice(0, 8).map((b, j) => (
                          <div
                            key={j}
                            className={[
                              "flex items-center gap-3 px-3.5 py-2.5",
                              j < Math.min(msg.plan!.blocks.length, 8) - 1
                                ? "border-b border-border/25"
                                : "",
                            ].join(" ")}
                          >
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: catColour(b.cat) }}
                            />
                            <span className="font-mono text-[10px] text-muted-foreground flex-shrink-0 w-[88px]">
                              {b.time}
                            </span>
                            <span className="text-[12px] font-medium text-foreground truncate flex-1">
                              {b.block}
                            </span>
                          </div>
                        ))}
                        {msg.plan.blocks.length > 8 && (
                          <div className="px-3.5 py-2 text-[11px] text-muted-foreground border-t border-border/25 text-center">
                            +{msg.plan.blocks.length - 8} more blocks
                          </div>
                        )}
                      </div>

                      {/* Save status */}
                      {saving ? (
                        <div className="flex items-center gap-2 text-[12px] text-muted-foreground px-1">
                          <span className="w-3.5 h-3.5 border border-primary/40 border-t-primary rounded-full animate-spin flex-shrink-0" />
                          Saving to your planner…
                        </div>
                      ) : planReady ? (
                        <div className="flex items-center gap-1.5 text-[12px] text-emerald-600 dark:text-emerald-400 px-1 font-semibold">
                          ✓ {msg.plan.blocks.length} blocks saved to your planner
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing indicator */}
            {loading && (
              <div className="flex items-start gap-3 animate-fade-in">
                <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="pt-0.5">
                  <TypingDots />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-destructive/8 border border-destructive/20 rounded-2xl px-4 py-3
                              text-[13px] text-destructive flex items-start gap-2.5">
                <span className="flex-shrink-0 mt-px">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Plan ready banner */}
            {planReady && !saving && (
              <div className="bg-primary/6 border border-primary/20 rounded-2xl px-4 py-4
                              flex items-center justify-between gap-3 animate-scale-in">
                <div>
                  <p className="text-[14px] font-bold text-primary">Your plan is ready! 🎉</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    Refine it or open the planner.
                  </p>
                </div>
                <button
                  onClick={onViewPlanner}
                  className="flex items-center gap-1.5 text-[13px] font-bold text-white
                             gradient-brand shadow-brand px-3.5 py-2 rounded-xl flex-shrink-0
                             active:scale-95 transition"
                >
                  Open <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════
          INPUT BAR — Gemini-style floating pill
      ════════════════════════════════════════════════════════ */}
      <div
        className="flex-shrink-0 px-4 pt-2"
        style={{ paddingBottom: "max(18px, env(safe-area-inset-bottom, 18px))" }}
      >
        {/* Pill-shaped input card */}
        <div
          className={[
            "flex items-end gap-3 rounded-[28px] border bg-card transition-all duration-200",
            "shadow-[0_4px_24px_0_rgb(0_0_0/0.09)]",
            input.trim()
              ? "border-primary/50 shadow-[0_4px_24px_0_hsl(14_90%_48%/0.15)]"
              : "border-border/70",
          ].join(" ")}
          style={{ paddingLeft: "18px", paddingRight: "10px", paddingTop: "10px", paddingBottom: "10px" }}
        >
          {/* Textarea — 16px prevents iOS Safari zoom-on-focus */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              planReady
                ? "Adjust your plan — e.g. move client work to afternoon…"
                : "Describe your tasks, meetings and goals…"
            }
            rows={1}
            disabled={loading}
            style={{ fontSize: "16px" }}
            className="flex-1 resize-none bg-transparent
                       text-foreground placeholder:text-muted-foreground/50
                       outline-none min-h-[28px] max-h-[120px] overflow-y-auto
                       disabled:opacity-50 leading-relaxed self-center"
          />

          {/* Send button — round, gradient when active */}
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{ width: "38px", height: "38px", borderRadius: "50%" }}
            className={[
              "flex-shrink-0 flex items-center justify-center transition-all duration-200",
              input.trim() && !loading
                ? "gradient-brand text-white shadow-brand active:scale-90"
                : "bg-muted/70 text-muted-foreground/40",
            ].join(" ")}
            aria-label="Send"
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              : <Send className="w-4 h-4" style={{ marginLeft: "1px" }} />}
          </button>
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-center mt-2 h-5">
          {planReady ? (
            <button
              onClick={onViewPlanner}
              className="text-[11px] text-muted-foreground hover:text-foreground transition"
            >
              Refine your plan or{" "}
              <span className="text-primary font-semibold">open the planner →</span>
            </button>
          ) : (
            <button
              onClick={onUseClassic}
              className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition"
            >
              Set up manually without AI →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
