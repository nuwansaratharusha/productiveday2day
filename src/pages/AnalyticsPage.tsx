// =============================================================
// ProductiveDay — Analytics Dashboard (Bento Grid)
// =============================================================
import { useState, useEffect, useMemo } from "react";
import { TrendingUp, CheckCircle2, Flame, Clock, Award, BarChart2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";

const PLANNER_TAG = "planner-block";

interface DayStat { date: string; total: number; done: number; rate: number; }

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

function BarMini({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-end h-12 gap-0.5">
      <div className="flex-1 rounded-sm transition-all duration-500" style={{ height: `${Math.max(pct, 4)}%`, backgroundColor: color + "99" }} />
    </div>
  );
}

function WeekChart({ stats }: { stats: DayStat[] }) {
  const maxTotal = Math.max(...stats.map((s) => s.total), 1);
  const days = ["S","M","T","W","T","F","S"];

  return (
    <div className="flex items-end gap-1.5 h-20 pt-2">
      {stats.map((s, i) => {
        const totalH = (s.total / maxTotal) * 100;
        const doneH = (s.done / maxTotal) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="relative w-full flex items-end" style={{ height: "60px" }}>
              {/* background bar (total) */}
              <div
                className="absolute bottom-0 w-full rounded-sm bg-muted/40"
                style={{ height: `${Math.max(totalH, 4)}%` }}
              />
              {/* foreground bar (done) */}
              <div
                className="absolute bottom-0 w-full rounded-sm bg-primary/70 transition-all duration-700"
                style={{ height: `${Math.max(doneH, 0)}%` }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground">{days[(i + new Date().getDay() - 6 + 7) % 7]}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [stats, setStats] = useState<DayStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      // Last 30 days of planner data
      const { data } = await supabase
        .from("tasks")
        .select("completed_at, status, tags, sort_order")
        .eq("user_id", user!.id)
        .contains("tags", [PLANNER_TAG]);

      if (!data) { setLoading(false); return; }

      // Build last-7-day stats
      const last7: DayStat[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = isoDate(d);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const dayType = isWeekend ? "weekend" : "weekday";

        const dayBlocks = data.filter((t) => {
          const tags: string[] = t.tags || [];
          return tags[1] === dayType;
        });
        const doneBlocks = dayBlocks.filter((t) => t.completed_at?.slice(0, 10) === dateStr).length;

        last7.push({
          date: dateStr,
          total: dayBlocks.length,
          done: doneBlocks,
          rate: dayBlocks.length > 0 ? doneBlocks / dayBlocks.length : 0,
        });
      }

      setStats(last7);
      setLoading(false);
    }

    load();
  }, [user, supabase]);

  // Computed insights
  const todayStat = stats[stats.length - 1];
  const weekTotal = stats.reduce((s, d) => s + d.total, 0);
  const weekDone = stats.reduce((s, d) => s + d.done, 0);
  const weekRate = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0;
  const bestDay = stats.reduce((best, d) => d.rate > best.rate ? d : best, stats[0] || { date: "", rate: 0, done: 0, total: 0 });
  const avgCompletion = stats.length > 0
    ? Math.round(stats.reduce((s, d) => s + d.rate, 0) / stats.filter((d) => d.total > 0).length * 100) || 0
    : 0;

  // Streak
  let streak = 0;
  for (let i = stats.length - 1; i >= 0; i--) {
    if (stats[i].done > 0) streak++;
    else break;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 py-3">
        <div className="max-w-lg mx-auto">
          <h1 className="text-base font-bold text-foreground">Analytics</h1>
          <p className="text-[11px] text-muted-foreground">Last 7 days</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 pb-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-2">
            {[1,2,3,4].map((i) => <div key={i} className="h-28 rounded-xl bg-card/30 animate-pulse border border-border/40" />)}
          </div>
        ) : (
          <>
            {/* Bento grid */}
            <div className="grid grid-cols-2 gap-2 mb-2">

              {/* Large card — week chart */}
              <div className="col-span-2 rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4">
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
                  {streak === 0 ? "Start today!" : streak === 1 ? "Keep it up!" : "On fire 🔥"}
                </div>
              </div>

              {/* Avg completion */}
              <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4">
                <TrendingUp className="w-4 h-4 text-blue-400 mb-2" />
                <div className="text-2xl font-bold text-foreground">{avgCompletion}%</div>
                <div className="text-[10px] text-muted-foreground">Avg completion</div>
              </div>

              {/* Best day */}
              <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4">
                <Award className="w-4 h-4 text-yellow-400 mb-2" />
                <div className="text-sm font-bold text-foreground">
                  {bestDay?.date
                    ? new Date(bestDay.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
                    : "—"}
                </div>
                <div className="text-[10px] text-muted-foreground">Best day</div>
                {bestDay?.rate > 0 && (
                  <div className="text-[10px] text-yellow-400 font-semibold">{Math.round(bestDay.rate * 100)}% done</div>
                )}
              </div>
            </div>

            {/* Day-by-day breakdown */}
            <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30">
                <div className="text-xs font-semibold text-foreground">Day Breakdown</div>
              </div>
              <div className="divide-y divide-border/20">
                {[...stats].reverse().map((s) => {
                  const rate = s.total > 0 ? s.done / s.total : 0;
                  const dayLabel = new Date(s.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                  return (
                    <div key={s.date} className="flex items-center gap-2 px-4 py-2.5">
                      <div className="text-xs text-muted-foreground w-20 flex-shrink-0 truncate">{dayLabel}</div>
                      <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/70 transition-all"
                          style={{ width: `${rate * 100}%` }}
                        />
                      </div>
                      <div className="text-xs font-semibold text-foreground w-12 text-right flex-shrink-0">
                        {s.total > 0 ? `${s.done}/${s.total}` : "—"}
                      </div>
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
