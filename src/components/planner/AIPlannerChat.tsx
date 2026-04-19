// =============================================================
// ProductiveDay — AI Planner Chat
// Step shown before the planner when the day has no blocks.
// User describes their day → Groq AI generates time blocks → auto-fills planner.
// =============================================================

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles, Send, ArrowRight, Key, ChevronRight, RotateCcw,
} from "lucide-react";
import type { TimeBlockData } from "@/data/plannerData";
import {
  callGroq, parsePlanFromResponse,
  getGroqKey, saveGroqKey,
  type ChatMessage,
} from "@/lib/groq";

// ── Props ──────────────────────────────────────────────────────

interface Props {
  /** Called with the AI-generated blocks — save them and keep chat open */
  onSaveBlocks: (blocks: TimeBlockData[]) => Promise<void>;
  /** Called when user taps "Open Planner" — transition to the planner view */
  onViewPlanner: () => void;
  /** Fallback: skip AI, use classic onboarding wizard */
  onUseClassic: () => void;
  /** Human-readable date label shown in the header, e.g. "Monday, Apr 21" */
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
    <span className="inline-flex items-center gap-[3px] py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
    </span>
  );
}

// Category colour dots for the block preview cards
const CAT_COLOURS: Record<string, string> = {
  Health:        "#52be8b",
  Learning:      "#2761d8",
  Revenue:       "#e35758",
  Creative:      "#a855f7",
  Personal:      "#f59e0b",
  Product:       "#0ea5e9",
  Operations:    "#8b5cf6",
  Delivery:      "#10b981",
  Branding:      "#ec4899",
  "Side Projects": "#f97316",
  CIM:           "#eab308",
  Networking:    "#14b8a6",
};

function catColour(cat: string) {
  return CAT_COLOURS[cat] ?? "#9ca3af";
}

// ── Internal message type (extends ChatMessage with parsed plan) ─

interface UIMessage {
  role: "user" | "assistant" | "system-greeting";
  content: string;
  plan?: { message: string; blocks: TimeBlockData[] } | null;
}

// ── Component ──────────────────────────────────────────────────

export function AIPlannerChat({
  onSaveBlocks, onViewPlanner, onUseClassic, dateLabel,
}: Props) {
  // ── Step: "setup" if no key, "chat" otherwise ──────────────
  const [step, setStep] = useState<"setup" | "chat">(
    () => (getGroqKey() ? "chat" : "setup"),
  );

  // ── Setup screen state ─────────────────────────────────────
  const [keyInput, setKeyInput] = useState("");
  const [keyError, setKeyError] = useState("");

  // ── Chat state ─────────────────────────────────────────────
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planReady, setPlanReady] = useState(false);
  const [saving, setSaving] = useState(false);

  // API chat history (no greeting markers)
  const historyRef = useRef<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Greeting on mount
  useEffect(() => {
    if (step === "chat" && messages.length === 0) {
      setMessages([{ role: "system-greeting", content: "" }]);
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }, [input]);

  // ── Save API key ───────────────────────────────────────────
  const handleSaveKey = () => {
    const trimmed = keyInput.trim();
    if (!trimmed) { setKeyError("Please enter your Groq API key."); return; }
    if (!trimmed.startsWith("gsk_")) {
      setKeyError("Key should start with gsk_. Get yours free at console.groq.com");
      return;
    }
    saveGroqKey(trimmed);
    setStep("chat");
  };

  // ── Send message ───────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const apiKey = getGroqKey();
    if (!apiKey) { setStep("setup"); return; }

    setInput("");
    setError(null);

    // Add user message to UI
    const userUIMsgIndex = messages.length + (messages[0]?.role === "system-greeting" ? 0 : 0);
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    // Build API history
    historyRef.current = [...historyRef.current, { role: "user", content: text }];
    setLoading(true);

    try {
      const reply = await callGroq(historyRef.current, apiKey);
      const plan = parsePlanFromResponse(reply);

      // Add assistant message to UI
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: plan?.message ?? reply, plan },
      ]);

      // Add to API history (raw reply for context continuity)
      historyRef.current = [
        ...historyRef.current,
        { role: "assistant", content: reply },
      ];

      // Auto-save blocks
      if (plan) {
        setSaving(true);
        await onSaveBlocks(plan.blocks);
        setSaving(false);
        setPlanReady(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
      if (msg.includes("401") || msg.toLowerCase().includes("invalid_api_key")) {
        setStep("setup");
      }
    } finally {
      setLoading(false);
    }
    void userUIMsgIndex; // suppress unused warning
  }, [input, loading, messages, onSaveBlocks]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ══════════════════════════════════════════════════════════════
  // SETUP SCREEN
  // ══════════════════════════════════════════════════════════════
  if (step === "setup") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 mx-auto">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>

          <h1 className="text-xl font-bold text-center mb-1.5">AI Daily Planner</h1>
          <p className="text-sm text-muted-foreground text-center mb-8 leading-relaxed">
            Describe your day and AI builds your<br />optimised time-blocked schedule.
          </p>

          {/* Key input card */}
          <div className="bg-card border border-border/60 rounded-2xl p-5 mb-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Groq API Key</span>
              <span className="text-[10px] text-muted-foreground ml-auto bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                Free
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Get your free key at{" "}
              <a
                href="https://console.groq.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                console.groq.com
              </a>{" "}
              — no credit card required. It&apos;s instant.
            </p>

            <input
              type="password"
              placeholder="gsk_••••••••••••••••••••"
              value={keyInput}
              onChange={(e) => { setKeyInput(e.target.value); setKeyError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSaveKey()}
              className="w-full h-11 rounded-xl border border-border bg-background px-3.5 text-sm
                         outline-none focus:ring-2 focus:ring-primary/30 transition"
              style={{ fontSize: 16 }}
            />

            {keyError && (
              <p className="text-xs text-destructive mt-2">{keyError}</p>
            )}

            <button
              onClick={handleSaveKey}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold
                         mt-3 flex items-center justify-center gap-2
                         hover:opacity-90 active:scale-[0.98] transition"
            >
              Start Planning
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onUseClassic}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground
                       transition py-2 underline-offset-2 hover:underline"
          >
            Set up manually without AI →
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // CHAT SCREEN
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Header ──────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-border/50 sticky top-0 z-10"
        style={{ background: "var(--background)/90", backdropFilter: "blur(8px)" }}
      >
        <div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-semibold text-sm">Plan Your Day</span>
          </div>
          <p className="text-[11px] text-muted-foreground ml-8 mt-0.5">{dateLabel}</p>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Re-enter key */}
          <button
            onClick={() => setStep("setup")}
            title="Change API key"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/60 transition text-muted-foreground"
          >
            <Key className="w-3.5 h-3.5" />
          </button>
          {/* Skip */}
          <button
            onClick={onViewPlanner}
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted/50 transition"
          >
            {planReady ? "Open Planner →" : "Skip"}
          </button>
        </div>
      </div>

      {/* ── Messages ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">

        {/* Greeting bubble */}
        {messages.some((m) => m.role === "system-greeting") && (
          <AiBubble>
            <p className="text-sm leading-relaxed">
              Good {getTimeOfDay()}! 👋 What&apos;s on your plate today?
            </p>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Tell me your tasks, projects, meetings, and goals —
              I&apos;ll build you an optimised schedule with time blocks.
            </p>
            <p className="text-xs text-muted-foreground/70 mt-2 italic">
              Example: &ldquo;I have a client project, CIM lecture at 2 PM, need to record content and work on my Skool course&rdquo;
            </p>
          </AiBubble>
        )}

        {/* Conversation messages */}
        {messages
          .filter((m) => m.role !== "system-greeting")
          .map((msg, i) => {
            if (msg.role === "user") {
              return (
                <div key={i} className="flex justify-end">
                  <div
                    className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm
                               px-4 py-3 max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap"
                  >
                    {msg.content}
                  </div>
                </div>
              );
            }

            // Assistant message
            return (
              <div key={i} className="space-y-2.5">
                <AiBubble>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </AiBubble>

                {/* Block preview cards */}
                {msg.plan && (
                  <div className="ml-9 space-y-1.5">
                    {msg.plan.blocks.slice(0, 6).map((b, j) => (
                      <div
                        key={j}
                        className="flex items-center gap-2.5 bg-card border border-border/40
                                   rounded-xl px-3 py-2 text-xs"
                      >
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: catColour(b.cat) }}
                        />
                        <span
                          className="font-mono text-muted-foreground flex-shrink-0"
                          style={{ fontSize: 10, minWidth: 96 }}
                        >
                          {b.time}
                        </span>
                        <span className="font-medium text-foreground truncate flex-1">
                          {b.block}
                        </span>
                        <span className="text-muted-foreground flex-shrink-0" style={{ fontSize: 10 }}>
                          {b.dur}m
                        </span>
                      </div>
                    ))}
                    {msg.plan.blocks.length > 6 && (
                      <p className="text-[11px] text-muted-foreground pl-2">
                        +{msg.plan.blocks.length - 6} more blocks
                      </p>
                    )}

                    {/* Status */}
                    {saving ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1 pt-0.5">
                        <span className="w-3 h-3 border border-primary/40 border-t-primary rounded-full animate-spin" />
                        Applying to your planner…
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 pl-1 pt-0.5 font-medium">
                        <span>✓</span>
                        {msg.plan.blocks.length} blocks added to your planner
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

        {/* Typing indicator */}
        {loading && (
          <AiBubble>
            <TypingDots />
          </AiBubble>
        )}

        {/* Error */}
        {error && (
          <div className="bg-destructive/8 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive flex items-start gap-2.5">
            <span className="flex-shrink-0 mt-0.5">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Plan ready banner */}
        {planReady && !saving && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl px-4 py-4
                          flex items-center justify-between gap-3 mt-2">
            <div>
              <p className="text-sm font-semibold text-primary">Your plan is ready! 🎉</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                You can also keep chatting to refine it.
              </p>
            </div>
            <button
              onClick={onViewPlanner}
              className="flex items-center gap-1.5 text-sm font-semibold text-primary
                         bg-primary/10 hover:bg-primary/15 px-3 py-2 rounded-xl transition flex-shrink-0"
            >
              Open <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ──────────────────────────────────────── */}
      <div
        className="border-t border-border/50 bg-background/90 backdrop-blur-sm px-4 pt-3"
        style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}
      >
        {planReady && (
          <p className="text-[11px] text-muted-foreground text-center mb-2">
            Refine your plan, or{" "}
            <button onClick={onViewPlanner} className="text-primary hover:underline underline-offset-2">
              open the planner →
            </button>
          </p>
        )}
        <div className="flex gap-2 items-end max-w-2xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              planReady
                ? "Ask to adjust the plan, e.g. \"Move client work to afternoon\""
                : "Today I have: client project, CIM lecture at 2 PM, need to record content…"
            }
            rows={1}
            disabled={loading}
            className="flex-1 resize-none rounded-2xl border border-border bg-muted/30 px-4 py-3
                       text-sm outline-none focus:ring-2 focus:ring-primary/30 leading-relaxed
                       min-h-[44px] overflow-y-hidden transition disabled:opacity-50"
            style={{ fontSize: 16 }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center
                       hover:opacity-90 active:scale-95 disabled:opacity-40 transition flex-shrink-0"
            aria-label="Send"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        {!planReady && (
          <button
            onClick={onUseClassic}
            className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground
                       transition mt-2 py-1 hover:underline underline-offset-2"
          >
            Set up manually without AI →
          </button>
        )}
      </div>
    </div>
  );
}

// ── AiBubble helper ────────────────────────────────────────────

function AiBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 items-start">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
      </div>
      <div
        className="bg-muted/40 border border-border/30 rounded-2xl rounded-tl-sm
                   px-4 py-3 max-w-[85%]"
      >
        {children}
      </div>
    </div>
  );
}
