// =============================================================
// ProductiveDay — Calendar Page (Date-Specific v2)
// =============================================================
// Shows a monthly calendar with per-day completion data.
// Reads blocks where tags[1] is a specific date (YYYY-MM-DD).
// Each day is independent — history is permanently preserved.
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

function isDateString(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
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

  // ── Load all planner tasks (all time) ─────────────────────
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    async function load() {
      // Fetch ALL planner blocks — we need all dates to build snapshots
      const { data } = await supabase
        .from("tasks")
        .select("id, title, tags, status, completed_at, sort_order")
        .eq("user_id", user!.id)
        .contains("tags", [PLANNER_TAG])
        .order("sort_order", { ascending: true });

      if (!data) { setLoading(false); return; }

      // Group by date tag (tags[1] = "YYYY-MM-DD")
      const map: Record<string, DaySnapshot> = {};

      for (const task of data) {
        const tags: string[] = task.tags || [];
        const dateTag = tags[1];

        // Only process date-specific blocks (ignore legacy weekday/weekend)
        if (!isDateString(dateTag)) continue;

        if (!map[dateTag]) {
          map[dateTag] = { total: 0, done: 0, blocks: [] };
        }

        const isDone = task.status === "done";
        map[dateTag].total += 1;
        if (isDone) map[dateTag].done += 1;
        map[dateTag].blocks.push({
          id: task.id,
          title: task.title,
          time: tags[2] || "",
          cat: tags[3] || "Personal",
          done: isDone,
        });
      }

      setSnapshots(map);
      setLoading(false);
    }

    load();
  }, [user, supabase]);

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

  // Month stats — filter to current view month only
  const monthSnapshots = Object.entries(snapshots)
    .filter(([date]) => date.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`))
    .map(([, snap]) => snap);

  const monthTotal = monthSnapshots.reduce((s, d) => s + d.total, 0);
  const monthDone = monthSnapshots.reduce((s, d) => s + d.done, 0);
  const monthRate = monthTotal > 0 ? Math.round((monthDone / monthTotal) * 100) : 0;
  const activeDays = monthSnapshots.filter(d => d.done > 0).length;

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
            <button onClick={nextMonth}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 pb-24">

        {/* Month summary */}
        {loading ? (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : (
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
        )}

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
              const isSelected = selectedDate === dateStr;
              const rate = snap ? snap.done / Math.max(snap.total, 1) : 0;

              return (
                <button
                  key={day}
                  onClick={() => snap && setSelectedDate(isSelected ? null : dateStr)}
                  disabled={!snap}
                  className={cn(
                    "h-12 flex flex-col items-center justify-center gap-0.5 border-b border-r border-border/20 transition-all",
                    col === 6 && "border-r-0",
                    snap && "cursor-pointer hover:bg-muted/30",
                    isSelected && "bg-primary/10",
                    !snap && "opacity-30"
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
                completionColor(selectedSnap.done / Math.max(selectedSnap.total, 1))
              )}>
                {Math.round((selectedSnap.done / Math.max(selectedSnap.total, 1)) * 100)}%
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-muted/30">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                style={{ width: `${(selectedSnap.done / Math.max(selectedSnap.total, 1)) * 100}%` }}
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
                      block.done ? "text-foreground" : "text-muted-foreground"
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

        {/* Empty month state */}
        {!loading && Object.keys(snapshots).length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-border p-10 text-center">
            <div className="text-4xl mb-3">📅</div>
            <h3 className="text-sm font-bold text-foreground">No history yet</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Complete tasks on the Planner to see your daily progress here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
