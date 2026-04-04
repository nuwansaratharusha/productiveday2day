// =============================================================
// ProductiveDay — Calendar Page
// =============================================================
// Monthly calendar showing daily completion snapshots.
// Clicking a date expands the full schedule for that day.
// Data is pulled from Supabase tasks where completed_at falls
// on that date. End-of-day auto-snapshot stores completion state.
// =============================================================

import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Clock, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";

const PLANNER_TAG = "planner-block";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

interface DaySnapshot {
  total: number;
  done: number;
  blocks: { id: string; title: string; time: string; cat: string; done: boolean }[];
}

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function completionColor(rate: number) {
  if (rate === 0) return "";
  if (rate < 0.4) return "bg-orange-500/20 text-orange-400 border-orange-500/30";
  if (rate < 0.75) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
}

function completionDot(rate: number) {
  if (rate === 0) return "bg-muted-foreground/20";
  if (rate < 0.4) return "bg-orange-400";
  if (rate < 0.75) return "bg-yellow-400";
  return "bg-emerald-400";
}

export default function CalendarPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<Record<string, DaySnapshot>>({});
  const [loading, setLoading] = useState(true);

  // ── Load all planner tasks for this month ──────────────────
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    async function load() {
      const startDate = isoDate(viewYear, viewMonth, 1);
      const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
      const endDate = isoDate(viewYear, viewMonth, lastDay);

      // Fetch all planner blocks (to show scheduled) — tasks have sort_order and tags
      // We use completed_at to know what was done on which day
      const { data } = await supabase
        .from("tasks")
        .select("id, title, tags, status, completed_at, sort_order")
        .eq("user_id", user.id)
        .contains("tags", [PLANNER_TAG])
        .order("sort_order", { ascending: true });

      if (!data) { setLoading(false); return; }

      // Build per-day snapshots
      // Each planner block: tags = [planner-block, dayType, time, cat]
      // "done today" = status=done AND completed_at date = that date
      const map: Record<string, DaySnapshot> = {};

      // Build a date range for this month
      for (let d = 1; d <= lastDay; d++) {
        const dateStr = isoDate(viewYear, viewMonth, d);
        const date = new Date(viewYear, viewMonth, d);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const dayType = isWeekend ? "weekend" : "weekday";

        // Get blocks for this day type
        const dayBlocks = data.filter((t) => {
          const tags: string[] = t.tags || [];
          return tags[1] === dayType;
        });

        if (dayBlocks.length === 0) continue;

        // Count completions: a block is "done" for this date if completed_at matches
        const isPast = dateStr <= isoDate(today.getFullYear(), today.getMonth(), today.getDate());
        const isToday2 = dateStr === isoDate(today.getFullYear(), today.getMonth(), today.getDate());

        const blocks = dayBlocks.map((t) => {
          const tags: string[] = t.tags || [];
          const completedOn = t.completed_at
            ? t.completed_at.slice(0, 10)
            : null;
          return {
            id: t.id,
            title: t.title,
            time: tags[2] || "",
            cat: tags[3] || "Personal",
            done: completedOn === dateStr || (isToday2 && t.status === "done"),
          };
        });

        if (isPast || isToday2) {
          map[dateStr] = {
            total: blocks.length,
            done: blocks.filter((b) => b.done).length,
            blocks,
          };
        }
      }

      setSnapshots(map);
      setLoading(false);
    }

    load();
  }, [user, supabase, viewYear, viewMonth, today]);

  // ── Calendar grid ──────────────────────────────────────────
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayStr = isoDate(today.getFullYear(), today.getMonth(), today.getDate());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null);
  };

  const selectedSnap = selectedDate ? snapshots[selectedDate] : null;

  // Month stats
  const monthTotal = Object.values(snapshots).reduce((s, d) => s + d.total, 0);
  const monthDone = Object.values(snapshots).reduce((s, d) => s + d.done, 0);
  const monthRate = monthTotal > 0 ? Math.round((monthDone / monthTotal) * 100) : 0;
  const activeDays = Object.values(snapshots).filter((d) => d.done > 0).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-base font-bold text-foreground">Calendar</h1>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-foreground min-w-[120px] text-center">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              disabled={viewYear === today.getFullYear() && viewMonth === today.getMonth()}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 pb-4">

        {/* Month summary bento */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Completion", value: `${monthRate}%`, icon: Zap, color: "text-primary" },
            { label: "Blocks done", value: monthDone, icon: CheckCircle2, color: "text-emerald-400" },
            { label: "Active days", value: activeDays, icon: Clock, color: "text-blue-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border border-border/40 bg-card/60 p-3 backdrop-blur-sm">
              <Icon className={cn("w-4 h-4 mb-1.5", color)} />
              <div className="text-lg font-bold text-foreground">{value}</div>
              <div className="text-[10px] text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden mb-4">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-border/30">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="h-12 border-b border-r border-border/20 last:border-r-0" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const col = (firstDayOfMonth + i) % 7;
              const dateStr = isoDate(viewYear, viewMonth, day);
              const snap = snapshots[dateStr];
              const isToday2 = dateStr === todayStr;
              const isFuture = dateStr > todayStr;
              const isSelected = selectedDate === dateStr;
              const rate = snap ? snap.done / snap.total : 0;

              return (
                <button
                  key={day}
                  onClick={() => !isFuture && snap && setSelectedDate(isSelected ? null : dateStr)}
                  disabled={isFuture || !snap}
                  className={cn(
                    "h-12 flex flex-col items-center justify-center gap-0.5 border-b border-r border-border/20 transition-all",
                    col === 6 && "border-r-0",
                    !isFuture && snap && "cursor-pointer hover:bg-muted/30",
                    isSelected && "bg-primary/10",
                    isFuture && "opacity-30"
                  )}
                >
                  <span className={cn(
                    "text-xs font-medium leading-none",
                    isToday2 && "w-6 h-6 rounded-full gradient-brand text-white flex items-center justify-center text-[11px] font-bold",
                    !isToday2 && snap && "text-foreground",
                    !isToday2 && !snap && "text-muted-foreground"
                  )}>
                    {day}
                  </span>
                  {snap && (
                    <div className={cn("w-1.5 h-1.5 rounded-full", completionDot(rate))} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected day detail */}
        {selectedDate && selectedSnap && (
          <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
              <div>
                <div className="text-sm font-bold text-foreground">
                  {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {selectedSnap.done} of {selectedSnap.total} blocks completed
                </div>
              </div>
              <div className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold border",
                completionColor(selectedSnap.done / selectedSnap.total)
              )}>
                {Math.round((selectedSnap.done / selectedSnap.total) * 100)}%
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-muted/30">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                style={{ width: `${(selectedSnap.done / selectedSnap.total) * 100}%` }}
              />
            </div>

            <div className="divide-y divide-border/20">
              {selectedSnap.blocks.map((block) => (
                <div key={block.id} className="flex items-center gap-3 px-4 py-2.5">
                  {block.done
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    : <Circle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "text-xs font-medium truncate",
                      block.done ? "text-foreground" : "text-muted-foreground line-through"
                    )}>
                      {block.title}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{block.time}</div>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{block.cat}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedDate && !selectedSnap && (
          <div className="rounded-xl border border-border/30 bg-card/30 p-8 text-center text-muted-foreground text-sm">
            No data for this day
          </div>
        )}
      </div>
    </div>
  );
}
