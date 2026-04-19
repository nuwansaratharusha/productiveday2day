// =============================================================
// ProductiveDay — Analytics Dashboard
// =============================================================
import { useState, useEffect, useMemo } from "react";
import { TrendingUp, CheckCircle2, Flame, Clock, Award, BarChart2, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";

const PLANNER_TAG = "planner-block";

interface DayStat {
  date: string;
  total: number;
  done: number;
  rate: number;
  doneMins: number; // focused minutes completed
  cats: Record<string, number>; // category → done count
}

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

function fmtMins(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ── Week chart ─────────────────────────────────────────────────
function WeekChart({ stats }: { stats: DayStat[] }) {
  const maxTotal = Math.max(...stats.map((s) => s.total), 1);
  // Labels: show day of week for each stat entry (Mon–Sun order)
  const dayLetters = stats.map((s) => {
    const d = new Date(s.date + "T12:00:00");
    return ["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()];
  });

  return (
    <div className="flex items-end gap-1.5 h-20 pt-2">
      {stats.map((s, i) => {
        const totalH = (s.total / maxTotal) * 100;
        const doneH = (s.done / maxTotal) * 100;
        const isToday = s.date === isoDate(new Date());
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="relative w-full flex items-end" style={{ height: "60px" }}>
              <div
                className="absolute bottom-0 w-full rounded-sm bg-muted/40"
                style={{ height: `${Math.max(totalH, 4)}%` }}
              />
              <div
                className="absolute bottom-0 w-full rounded-sm transition-all duration-700"
                style={{
                  height: `${Math.max(doneH, 0)}%`,
                  background: isToday ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.55)",
                }}
              />
            </div>
            <span className={cn(
              "text-[9px]",
              isToday ? "text-primary font-bold" : "text-muted-foreground"
            )}>
              {dayLetters[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Category breakdown bar ─────────────────────────────────────
const CAT_COLOURS: Record<string, string> = {
  Health: "#52be8b", Learning: "#2761d8", Revenue: "#e35758",
  Creative: "#a855f7", Personal: "#f59e0b", Product: "#0ea5e9",
  Operations: "#8b5cf6", Delivery: "#10b981", Branding: "#ec4899",
  "Side Projects": "#f97316", CIM: "#eab308", Networking: "#14b8a6",
};
function catColor(c: string) { return CAT_COLOURS[c] ?? "#9ca3af"; }

// ── Component ──────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [stats, setStats] = useState<DayStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const { data } = await supabase
        .from("tasks")
        .select("id, status, tags, estimated_minutes, completed_at")
        .eq("user_id", user!.id)
        .contains("tags", [PLANNER_TAG]);

      if (!data) { setLoading(false); return; }

      // Build last-7-day stats — match by tags[1] === date string ("YYYY-MM-DD")
      const last7: DayStat[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = isoDate(d);

        const dayBlocks = data.filter((t) => {
          const tags: string[] = t.tags || [];
          return tags[1] === dateStr;
        });

        const doneBlocks = dayBlocks.filter((t) => t.status === "done");
        const doneMins = doneBlocks.reduce((s, t) => s + (t.estimated_minutes || 0), 0);

        // Category counts for completed blocks
        const cats: Record<string, number> = {};
        doneBlocks.forEach((t) => {
          const cat = (t.tags as string[])[3] || "Personal";
          cats[cat] = (cats[cat] || 0) + 1;
        });

        last7.push({
          date: dateStr,
          total: dayBlocks.length,
          done: doneBlocks.length,
          rate: dayBlocks.length > 0 ? doneBlocks.length / dayBlocks.length : 0,
          doneMins,
          cats,
        });
      }

      setStats(last7);
      setLoading(false);
    }

    load();
  }, [user, supabase]);

  // ── Derived metrics ───────────────────────────────────────────
  const todayStat = stats[stats.length - 1];
  const weekTotal = stats.reduce((s, d) => s + d.total, 0);
  const weekDone  = stats.reduce((s, d) => s + d.done, 0);
  const weekRate  = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0;
  const weekMins  = stats.reduce((s, d) => s + d.doneMins, 0);

  const activeDays = stats.filter((d) => d.total > 0);
  const avgCompletion = activeDays.length > 0
    ? Math.round(activeDays.reduce((s, d) => s + d.rate, 0) / activeDays.length * 100)
    : 0;

  // Streak: consecutive days with at least 1 done block (from today back)
  let streak = 0;
  for (let i = stats.length - 1; i >= 0; i--) {
    if (stats[i].done > 0) streak++;
    else break;
  }

  // Best day
  const bestDay = stats.reduce(
    (best, d) => d.rate > best.rate ? d : best,
    stats[0] || { date: "", rate: 0, done: 0, total: 0, doneMins: 0, cats: {} }
  );

  // Weekly category breakdown: merge all days
  const weekCats: Record<string, number> = {};
  stats.forEach((d) => {
    Object.entries(d.cats).forEach(([cat, count]) => {
      weekCats[cat] = (weekCats[cat] || 0) + count;
    });
  });
  const topCats = Object.entries(weekCats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxCatCount = Math.max(...topCats.map(([, c]) => c), 1);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 py-3">
        <div className="max-w-lg mx-auto">
          <h1 className="text-base font-bold text-foreground">Analytics</h1>
          <p className="text-[11px] text-muted-foreground">Last 7 days</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 pb-4 space-y-2">
        {loading ? (
          <div className="grid grid-cols-2 gap-2">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-card/30 animate-pulse border border-border/40" />
            ))}
          </div>
        ) : (
          <>
            {/* ── Week chart ──────────────────────────────── */}
            <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <div className="text-xs font-semibold text-foreground">Weekly Progress</div>
                  <div className="text-[10px] text-muted-foreground">Blocks completed vs scheduled</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-foreground">{weekRate}%</div>
                  <div className="text-[10px] text-muted-foreground">{weekDone}/{weekTotal} done</div>
                </div>
              </div>
              <WeekChart stats={stats} />
            </div>

            {/* ── Stat cards ──────────────────────────────── */}
            <div className="grid grid-cols-2 gap-2">

              {/* Today */}
              <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-2" />
                <div className="text-2xl font-bold text-foreground">
                  {todayStat ? `${todayStat.done}/${todayStat.total}` : "—"}
                </div>
                <div className="text-[10px] text-muted-foreground">Today's blocks</div>
                {todayStat && todayStat.total > 0 && (
                  <div className="mt-2 h-1 rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all duration-700"
                      style={{ width: `${(todayStat.done / todayStat.total) * 100}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Streak */}
              <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4">
                <Flame className={cn("w-4 h-4 mb-2", streak > 0 ? "text-orange-400" : "text-muted-foreground/30")} />
                <div className="text-2xl font-bold text-foreground">{streak}</div>
                <div className="text-[10px] text-muted-foreground">Day streak</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 opacity-60">
                  {streak === 0 ? "Start today!" : streak === 1 ? "Keep going!" : "On fire 🔥"}
                </div>
              </div>

              {/* Focused hours */}
              <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4">
                <Clock className="w-4 h-4 text-blue-400 mb-2" />
                <div className="text-2xl font-bold text-foreground">{fmtMins(weekMins)}</div>
                <div className="text-[10px] text-muted-foreground">Focused this week</div>
                {todayStat && (
                  <div className="text-[10px] text-blue-400 mt-0.5 font-medium">
                    {fmtMins(todayStat.doneMins)} today
                  </div>
                )}
              </div>

              {/* Avg completion */}
              <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4">
                <TrendingUp className="w-4 h-4 text-violet-400 mb-2" />
                <div className="text-2xl font-bold text-foreground">{avgCompletion}%</div>
                <div className="text-[10px] text-muted-foreground">Avg completion</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 opacity-60">
                  active days only
                </div>
              </div>

              {/* Best day — full width */}
              <div className="col-span-2 rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4 flex items-center gap-4">
                <Award className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-foreground">Best Day This Week</div>
                  <div className="text-sm font-bold text-foreground truncate">
                    {bestDay?.date
                      ? new Date(bestDay.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
                      : "No data yet"}
                  </div>
                </div>
                {bestDay?.rate > 0 && (
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold text-yellow-400">{Math.round(bestDay.rate * 100)}%</div>
                    <div className="text-[10px] text-muted-foreground">{bestDay.done}/{bestDay.total} blocks</div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Category breakdown ───────────────────────── */}
            {topCats.length > 0 && (
              <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-muted-foreground" />
                  <div className="text-xs font-semibold text-foreground">Top Categories This Week</div>
                </div>
                <div className="px-4 py-3 space-y-2.5">
                  {topCats.map(([cat, count]) => (
                    <div key={cat} className="flex items-center gap-2.5">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: catColor(cat) }}
                      />
                      <span className="text-xs text-foreground flex-shrink-0 w-24 truncate">{cat}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${(count / maxCatCount) * 100}%`,
                            background: catColor(cat),
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground w-6 text-right flex-shrink-0">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Day-by-day breakdown ─────────────────────── */}
            <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
                <BarChart2 className="w-3.5 h-3.5 text-muted-foreground" />
                <div className="text-xs font-semibold text-foreground">Daily Breakdown</div>
              </div>
              <div className="divide-y divide-border/20">
                {[...stats].reverse().map((s) => {
                  const rate = s.total > 0 ? s.done / s.total : 0;
                  const d = new Date(s.date + "T12:00:00");
                  const isToday = s.date === isoDate(new Date());
                  const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                  return (
                    <div key={s.date} className="flex items-center gap-2 px-4 py-2.5">
                      <div className={cn(
                        "text-xs w-20 flex-shrink-0 truncate",
                        isToday ? "text-primary font-semibold" : "text-muted-foreground"
                      )}>
                        {isToday ? "Today" : label}
                      </div>
                      <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${rate * 100}%`,
                            background: isToday ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.55)",
                          }}
                        />
                      </div>
                      <div className="text-xs font-semibold text-foreground w-14 text-right flex-shrink-0">
                        {s.total > 0 ? `${s.done}/${s.total}` : "—"}
                      </div>
                      {s.doneMins > 0 && (
                        <div className="text-[10px] text-muted-foreground w-10 text-right flex-shrink-0">
                          {fmtMins(s.doneMins)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
