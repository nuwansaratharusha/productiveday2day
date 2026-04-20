// =============================================================
// ProductiveDay — Focus Mode Overlay
// =============================================================
// Activates for student users during Learning/Study blocks.
// Full-screen lock that keeps ProductiveDay focused.
// Other browser tabs are intentionally allowed (research needs).
// =============================================================

import { useState, useEffect, useCallback } from "react";
import { BookOpen, Brain, Timer, X, Coffee, ExternalLink } from "lucide-react";
import type { TimeBlockData } from "@/data/plannerData";
import { parseTimeRange } from "@/data/plannerData";

interface Props {
  block: TimeBlockData;
  onEndSession: () => void;
}

function getMinutesLeft(block: TimeBlockData): number {
  try {
    const [, end] = parseTimeRange(block.time);
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return Math.max(0, end - nowMins);
  } catch {
    return 0;
  }
}

function formatCountdown(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}h ${m}m left`;
  if (m === 0) return "Time's up!";
  return `${m}m left`;
}

// Motivational messages for study sessions
const STUDY_MESSAGES = [
  "Deep work creates deep knowledge. Stay here.",
  "Every minute of focus compounds into mastery.",
  "Your future self is watching. Make them proud.",
  "Distraction is the enemy of understanding.",
  "This block is your most valuable hour.",
  "Consistency beats motivation every time.",
  "You're building something that lasts.",
];

export function FocusMode({ block, onEndSession }: Props) {
  const [minsLeft, setMinsLeft] = useState(() => getMinutesLeft(block));
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [message] = useState(
    () => STUDY_MESSAGES[Math.floor(Math.random() * STUDY_MESSAGES.length)]
  );
  const [elapsed, setElapsed] = useState(0);

  // Tick every minute
  useEffect(() => {
    const iv = setInterval(() => {
      setMinsLeft(getMinutesLeft(block));
      setElapsed(e => e + 1);
    }, 60000);
    return () => clearInterval(iv);
  }, [block]);

  // Auto-end when block is over
  useEffect(() => {
    if (minsLeft === 0) onEndSession();
  }, [minsLeft, onEndSession]);

  const progress = (() => {
    try {
      const [start, end] = parseTimeRange(block.time);
      const total = end - start;
      if (total <= 0) return 0;
      return Math.min(100, ((total - minsLeft) / total) * 100);
    } catch {
      return 0;
    }
  })();

  const handleExit = useCallback(() => {
    setShowExitConfirm(true);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col select-none">

      {/* ── Header bar ──────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-safe pt-4 pb-3
                      border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 tracking-wide uppercase">
            Focus Mode
          </span>
        </div>
        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground
                     hover:text-foreground transition px-2.5 py-1 rounded-lg
                     border border-border/40 hover:border-border/70"
        >
          <X className="w-3 h-3" />
          End session
        </button>
      </div>

      {/* ── Main content ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6">

        {/* Icon */}
        <div className="w-20 h-20 rounded-[28px] bg-primary/10 border border-primary/20
                        flex items-center justify-center shadow-lg">
          <BookOpen className="w-9 h-9 text-primary" />
        </div>

        {/* Block title */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
            Now studying
          </p>
          <h1 className="text-[26px] font-bold text-foreground leading-tight">
            {block.block}
          </h1>
          {block.desc && (
            <p className="text-[14px] text-muted-foreground max-w-xs mx-auto leading-relaxed">
              {block.desc}
            </p>
          )}
        </div>

        {/* Timer */}
        <div className="flex items-center gap-2.5 bg-muted/40 border border-border/40
                        rounded-2xl px-5 py-3">
          <Timer className="w-4 h-4 text-primary" />
          <span className="text-[18px] font-bold tabular-nums text-foreground">
            {formatCountdown(minsLeft)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs space-y-1.5">
          <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground text-right">
            {Math.round(progress)}% complete
          </p>
        </div>

        {/* Motivational message */}
        <p className="text-[13px] text-muted-foreground italic max-w-[260px] leading-relaxed">
          "{message}"
        </p>
      </div>

      {/* ── Footer — research allowed ────────────────────────── */}
      <div className="pb-safe pb-6 px-6 flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60 bg-muted/30
                        rounded-xl px-4 py-2.5 border border-border/30">
          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Switch tabs freely for research — come back when done</span>
        </div>
      </div>

      {/* ── Exit Confirmation ────────────────────────────────── */}
      {showExitConfirm && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6 z-10">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20
                              flex items-center justify-center flex-shrink-0">
                <Coffee className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-[15px]">End focus session?</p>
                <p className="text-[12px] text-muted-foreground">
                  {minsLeft > 0 ? `${minsLeft} minutes still remain in this block.` : "Block time is up."}
                </p>
              </div>
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Leaving now will end your focused study time. You can always come back and re-enter focus mode.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-[13px] font-medium
                           hover:bg-muted/50 transition text-foreground"
              >
                Stay focused
              </button>
              <button
                onClick={onEndSession}
                className="flex-1 py-2.5 rounded-xl bg-destructive/90 hover:bg-destructive
                           text-destructive-foreground text-[13px] font-medium transition"
              >
                End session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper exported for Index.tsx ──────────────────────────

/** Categories that trigger focus mode for student users */
const LEARNING_CATEGORIES = new Set([
  "Learning", "Delivery", "Research", "Study",
]);

/** Block titles that also trigger focus (keyword match) */
const LEARNING_KEYWORDS = [
  "study", "learn", "lecture", "assignment", "class", "revision",
  "exam", "research", "reading", "practice", "problem",
];

export function isLearningBlock(block: TimeBlockData): boolean {
  if (LEARNING_CATEGORIES.has(block.cat)) return true;
  const lower = block.block.toLowerCase();
  return LEARNING_KEYWORDS.some(k => lower.includes(k));
}
