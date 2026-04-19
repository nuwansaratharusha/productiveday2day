// =============================================================
// ProductiveDay — Habits Tracker Page  +  Don't-Do List
// =============================================================
import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Flame, CheckCircle2, Circle, Trophy, Target, X, Check, ShieldOff, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";

// ─── Habit types ─────────────────────────────────────────────
interface Habit {
  id: string;
  title: string;
  description: string | null;
  color: string;
  icon: string;
  target_count: number;
  frequency: string;
  is_active: boolean;
  sort_order: number;
  today_completed?: boolean;
  today_count?: number;
  current_streak?: number;
  week_history?: boolean[];
}

// ─── Don't-Do types ──────────────────────────────────────────
type DontDoCategory = "health" | "productivity" | "mindset" | "social";

interface DontDoItem {
  id: string;
  title: string;
  category: DontDoCategory;
  streak: number;           // days clean (computed from lastSlipDate)
  lastSlipDate: string | null;
  createdAt: string;
}

const DONTDO_KEY = "pd-dontdo";

const DONT_CATEGORIES: { value: DontDoCategory; label: string; color: string; bg: string; emoji: string }[] = [
  { value: "health",       label: "Health",       color: "#f43f5e", bg: "bg-rose-500/10",   emoji: "🚫" },
  { value: "productivity", label: "Focus",        color: "#3b82f6", bg: "bg-blue-500/10",   emoji: "🧠" },
  { value: "mindset",      label: "Mindset",      color: "#a855f7", bg: "bg-purple-500/10", emoji: "💭" },
  { value: "social",       label: "Social",       color: "#f59e0b", bg: "bg-amber-500/10",  emoji: "🤝" },
];

function getCatMeta(cat: DontDoCategory) {
  return DONT_CATEGORIES.find((c) => c.value === cat) ?? DONT_CATEGORIES[0];
}

function daysClean(item: DontDoItem): number {
  const ref = item.lastSlipDate ?? item.createdAt;
  const refDate = new Date(ref);
  const today = new Date();
  refDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - refDate.getTime()) / 86400000));
}

function loadDontDo(): DontDoItem[] {
  try {
    const raw = localStorage.getItem(DONTDO_KEY);
    return raw ? (JSON.parse(raw) as DontDoItem[]) : [];
  } catch { return []; }
}

function saveDontDo(items: DontDoItem[]) {
  localStorage.setItem(DONTDO_KEY, JSON.stringify(items));
}

// ─── Colours / icons ─────────────────────────────────────────
const COLORS = [
  { label: "Orange", value: "#f97316" },
  { label: "Blue",   value: "#3b82f6" },
  { label: "Emerald",value: "#10b981" },
  { label: "Purple", value: "#a855f7" },
  { label: "Pink",   value: "#ec4899" },
  { label: "Yellow", value: "#eab308" },
];

const ICONS = ["💪","🏃","📚","💧","🧘","🛌","🥗","✍️","🎯","🎸","🌿","🧠"];

// ─── StreakRing ───────────────────────────────────────────────
function StreakRing({ pct, color, size = 64 }: { pct: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(pct, 1);
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  );
}

// ─── HabitCard ───────────────────────────────────────────────
function HabitCard({ habit, onToggle, onDelete }: {
  habit: Habit;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const streak = habit.current_streak ?? 0;
  const done = !!habit.today_completed;
  const weekHistory = habit.week_history ?? Array(7).fill(false);

  return (
    <div className={cn(
      "rounded-xl border bg-card/60 backdrop-blur-sm p-4 transition-all duration-300",
      done ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/40"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{habit.icon}</span>
          <div>
            <div className="text-sm font-semibold text-foreground leading-tight">{habit.title}</div>
            {habit.description && (
              <div className="text-[11px] text-muted-foreground mt-0.5">{habit.description}</div>
            )}
          </div>
        </div>
        <button
          onClick={() => onDelete(habit.id)}
          className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Week history dots */}
      <div className="flex items-center gap-1 mb-3">
        {weekHistory.map((d, i) => (
          <div
            key={i}
            className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center",
              d ? "opacity-100" : "opacity-20 bg-muted"
            )}
            style={d ? { backgroundColor: habit.color + "33", border: `1.5px solid ${habit.color}` } : {}}
          >
            {d && <Check className="w-2.5 h-2.5" style={{ color: habit.color }} />}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Flame className={cn("w-3.5 h-3.5", streak > 0 ? "text-orange-400" : "text-muted-foreground/30")} />
          <span className={cn("text-xs font-bold", streak > 0 ? "text-orange-400" : "text-muted-foreground/50")}>
            {streak}d streak
          </span>
        </div>
        <button
          onClick={() => onToggle(habit.id)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
            done
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/30"
          )}
        >
          {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
          {done ? "Done" : "Mark done"}
        </button>
      </div>
    </div>
  );
}

// ─── AddHabitSheet ────────────────────────────────────────────
function AddHabitSheet({ onAdd, onClose }: { onAdd: (h: Partial<Habit>) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [color, setColor] = useState(COLORS[0].value);
  const [icon, setIcon] = useState(ICONS[0]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-background rounded-t-3xl flex flex-col overflow-hidden"
        style={{ maxHeight: "85vh" }}>

        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-foreground">New Habit</h3>
            <p className="text-xs text-muted-foreground">Build a streak, one day at a time</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 px-5 pb-2">
        <div className="space-y-4">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Habit name…"
            className="w-full bg-muted/30 border border-border/40 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-muted/30 border border-border/40 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />

          <div>
            <div className="text-[11px] text-muted-foreground mb-1.5 font-medium">Icon</div>
            <div className="flex flex-wrap gap-1.5">
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={cn(
                    "w-9 h-9 rounded-lg text-lg flex items-center justify-center border transition-all",
                    icon === ic ? "border-primary/60 bg-primary/10" : "border-border/30 hover:border-border/60"
                  )}
                >{ic}</button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-muted-foreground mb-1.5 font-medium">Color</div>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-all",
                    color === c.value ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>
        </div>
        </div>

        <div className="flex-shrink-0 px-5 pt-3 pb-8 border-t border-border/30 bg-background">
          <button
            disabled={!title.trim()}
            onClick={() => {
              if (!title.trim()) return;
              onAdd({ title: title.trim(), description: desc || null, color, icon, target_count: 1, frequency: "daily" });
              onClose();
            }}
            className="w-full py-3.5 rounded-2xl text-sm font-bold bg-primary text-primary-foreground disabled:opacity-40 transition-all active:scale-[0.98] shadow-sm"
          >
            Add Habit ✓
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AddDontDoSheet ──────────────────────────────────────────
function AddDontDoSheet({ onAdd, onClose }: {
  onAdd: (item: Omit<DontDoItem, "id" | "streak" | "lastSlipDate" | "createdAt">) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState<DontDoCategory>("productivity");

  return (
    <div className="fixed inset-0 z-[70] flex items-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-background rounded-t-3xl flex flex-col overflow-hidden"
        style={{ maxHeight: "75vh" }}>

        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-foreground">Add Restriction</h3>
            <p className="text-xs text-muted-foreground">Track what you're choosing not to do</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 px-5 pb-2 space-y-4">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. No social media before noon"
            className="w-full bg-muted/30 border border-border/40 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />

          <div>
            <div className="text-[11px] text-muted-foreground mb-2 font-medium">Category</div>
            <div className="grid grid-cols-2 gap-2">
              {DONT_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCat(c.value)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all",
                    cat === c.value
                      ? "border-current text-white"
                      : "border-border/40 text-muted-foreground hover:border-border"
                  )}
                  style={cat === c.value ? { backgroundColor: c.color, borderColor: c.color } : {}}
                >
                  <span>{c.emoji}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 px-5 pt-3 pb-8 border-t border-border/30 bg-background">
          <button
            disabled={!title.trim()}
            onClick={() => {
              if (!title.trim()) return;
              onAdd({ title: title.trim(), category: cat });
              onClose();
            }}
            className="w-full py-3.5 rounded-2xl text-sm font-bold bg-primary text-primary-foreground disabled:opacity-40 transition-all active:scale-[0.98] shadow-sm"
          >
            Add Restriction ✓
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DontDoCard ──────────────────────────────────────────────
function DontDoCard({ item, onSlip, onDelete }: {
  item: DontDoItem;
  onSlip: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmSlip, setConfirmSlip] = useState(false);
  const meta = getCatMeta(item.category);
  const clean = daysClean(item);

  // Milestone colours
  const streakColor = clean >= 30 ? "#10b981" : clean >= 7 ? "#f97316" : clean >= 3 ? "#3b82f6" : meta.color;

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4 transition-all duration-300">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          {/* Category pill */}
          <span
            className="mt-0.5 flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: meta.color + "20", color: meta.color }}
          >
            {meta.emoji} {meta.label}
          </span>
        </div>
        <button
          onClick={() => onDelete(item.id)}
          className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <p className="text-sm font-semibold text-foreground mb-3 leading-snug">{item.title}</p>

      <div className="flex items-center justify-between">
        {/* Clean streak */}
        <div className="flex items-center gap-1.5">
          <ShieldOff className="w-3.5 h-3.5" style={{ color: streakColor }} />
          <span className="text-xs font-bold" style={{ color: streakColor }}>
            {clean === 0 ? "Start today" : `${clean}d clean`}
          </span>
          {clean >= 7 && <span className="text-[10px]">🔥</span>}
          {clean >= 30 && <span className="text-[10px]">⭐</span>}
        </div>

        {/* Slip button */}
        {confirmSlip ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">Reset streak?</span>
            <button
              onClick={() => { onSlip(item.id); setConfirmSlip(false); }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 transition-colors"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmSlip(false)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-border/50 text-muted-foreground hover:bg-muted/30 transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmSlip(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-rose-500/25 text-rose-400/70 hover:border-rose-500/50 hover:text-rose-400 hover:bg-rose-500/8 transition-all"
          >
            <AlertTriangle className="w-3 h-3" />
            I slipped
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
export default function HabitsPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  // Don't-Do state
  const [dontDo, setDontDo] = useState<DontDoItem[]>([]);
  const [dontDoOpen, setDontDoOpen] = useState(false);
  const [addDontDoOpen, setAddDontDoOpen] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Load don't-do from localStorage
  useEffect(() => {
    setDontDo(loadDontDo());
  }, []);

  const fetchHabits = useCallback(async () => {
    if (!user) return;

    const { data: habitsData } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (!habitsData) { setLoading(false); return; }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const since = sevenDaysAgo.toISOString().slice(0, 10);

    const { data: completions } = await supabase
      .from("habit_completions")
      .select("habit_id, completed_date")
      .eq("user_id", user.id)
      .gte("completed_date", since);

    const compMap: Record<string, Set<string>> = {};
    for (const c of completions || []) {
      if (!compMap[c.habit_id]) compMap[c.habit_id] = new Set();
      compMap[c.habit_id].add(c.completed_date);
    }

    const last7: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7.push(d.toISOString().slice(0, 10));
    }

    function calcStreak(dates: Set<string>): number {
      let streak = 0;
      const d = new Date();
      while (true) {
        const ds = d.toISOString().slice(0, 10);
        if (dates.has(ds)) { streak++; d.setDate(d.getDate() - 1); }
        else break;
      }
      return streak;
    }

    const enriched: Habit[] = habitsData.map((h) => {
      const dates = compMap[h.id] || new Set();
      return {
        ...h,
        today_completed: dates.has(todayStr),
        current_streak: calcStreak(dates),
        week_history: last7.map((d) => dates.has(d)),
      };
    });

    setHabits(enriched);
    setLoading(false);
  }, [user, supabase, todayStr]);

  useEffect(() => { fetchHabits(); }, [fetchHabits]);

  const toggleHabit = async (id: string) => {
    if (!user) return;
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;
    const done = !!habit.today_completed;
    setHabits((prev) => prev.map((h) => h.id === id ? {
      ...h,
      today_completed: !done,
      current_streak: !done ? (h.current_streak ?? 0) + 1 : Math.max(0, (h.current_streak ?? 0) - 1)
    } : h));
    if (done) {
      await supabase.from("habit_completions").delete()
        .eq("habit_id", id).eq("user_id", user.id).eq("completed_date", todayStr);
    } else {
      await supabase.from("habit_completions").upsert({
        habit_id: id, user_id: user.id, completed_date: todayStr, count: 1
      });
    }
  };

  const addHabit = async (data: Partial<Habit>) => {
    if (!user) return;
    const { data: inserted } = await supabase.from("habits").insert({
      ...data, user_id: user.id, sort_order: habits.length, is_active: true
    }).select().single();
    if (inserted) {
      setHabits((prev) => [...prev, { ...inserted, today_completed: false, current_streak: 0, week_history: Array(7).fill(false) }]);
    }
  };

  const deleteHabit = async (id: string) => {
    if (!user) return;
    setHabits((prev) => prev.filter((h) => h.id !== id));
    await supabase.from("habits").update({ is_active: false }).eq("id", id).eq("user_id", user.id);
  };

  // Don't-Do handlers
  const addDontDoItem = (data: Omit<DontDoItem, "id" | "streak" | "lastSlipDate" | "createdAt">) => {
    const item: DontDoItem = {
      id: crypto.randomUUID(),
      ...data,
      streak: 0,
      lastSlipDate: null,
      createdAt: todayStr,
    };
    const updated = [...dontDo, item];
    setDontDo(updated);
    saveDontDo(updated);
  };

  const slipDontDoItem = (id: string) => {
    const updated = dontDo.map((item) =>
      item.id === id ? { ...item, lastSlipDate: todayStr, streak: 0 } : item
    );
    setDontDo(updated);
    saveDontDo(updated);
  };

  const deleteDontDoItem = (id: string) => {
    const updated = dontDo.filter((item) => item.id !== id);
    setDontDo(updated);
    saveDontDo(updated);
  };

  const totalToday = habits.length;
  const doneToday = habits.filter((h) => h.today_completed).length;
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.current_streak ?? 0), 0);

  // Best clean streak across don't-do items
  const bestClean = dontDo.reduce((max, item) => Math.max(max, daysClean(item)), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-base font-bold text-foreground">Habits</h1>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold border border-border/60 text-foreground hover:bg-muted/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 pb-8">

        {/* Bento stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-xl border border-border/40 bg-card/60 p-3 backdrop-blur-sm col-span-1">
            <div className="relative w-14 h-14 mx-auto mb-1">
              <StreakRing pct={totalToday > 0 ? doneToday / totalToday : 0} color="#f97316" size={56} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-foreground">{totalToday > 0 ? Math.round((doneToday/totalToday)*100) : 0}%</span>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground text-center">Today</div>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/60 p-3 backdrop-blur-sm">
            <Trophy className="w-4 h-4 text-yellow-400 mb-1.5" />
            <div className="text-xl font-bold text-foreground">{bestStreak}</div>
            <div className="text-[10px] text-muted-foreground">Best streak</div>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/60 p-3 backdrop-blur-sm">
            <Target className="w-4 h-4 text-blue-400 mb-1.5" />
            <div className="text-xl font-bold text-foreground">{doneToday}/{totalToday}</div>
            <div className="text-[10px] text-muted-foreground">Done today</div>
          </div>
        </div>

        {/* ── Habit cards ─────────────────────────────── */}
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map((i) => (
              <div key={i} className="rounded-xl border border-border/40 bg-card/30 h-28 animate-pulse" />
            ))}
          </div>
        ) : habits.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/40 p-10 text-center mb-6">
            <div className="text-3xl mb-2">🌱</div>
            <div className="text-sm font-medium text-foreground mb-1">No habits yet</div>
            <div className="text-xs text-muted-foreground mb-4">Start building your first daily habit</div>
            <button
              onClick={() => setAddOpen(true)}
              className="px-4 py-2 rounded-lg text-xs font-semibold gradient-brand text-white"
            >
              Add your first habit
            </button>
          </div>
        ) : (
          <div className="space-y-2 mb-6">
            {habits.map((habit) => (
              <HabitCard key={habit.id} habit={habit} onToggle={toggleHabit} onDelete={deleteHabit} />
            ))}
          </div>
        )}

        {/* ── Don't-Do List ──────────────────────────── */}
        <div className="mt-2">
          {/* Section header — collapsible */}
          <button
            onClick={() => setDontDoOpen((v) => !v)}
            className="w-full flex items-center justify-between mb-3 group"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <ShieldOff className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-foreground leading-tight">Don't-Do List</div>
                <div className="text-[10px] text-muted-foreground">
                  {dontDo.length === 0
                    ? "Track restrictions you want to keep"
                    : `${dontDo.length} restriction${dontDo.length !== 1 ? "s" : ""}${bestClean > 0 ? ` · best ${bestClean}d clean` : ""}`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setAddDontDoOpen(true); setDontDoOpen(true); }}
                className="w-7 h-7 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              {dontDo.length > 0 && (
                dontDoOpen
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </button>

          {/* Don't-do items */}
          {(dontDoOpen || dontDo.length === 0) && (
            dontDo.length === 0 ? (
              <div
                onClick={() => setAddDontDoOpen(true)}
                className="rounded-xl border border-dashed border-rose-500/20 bg-rose-500/3 p-6 text-center cursor-pointer hover:border-rose-500/40 transition-colors"
              >
                <div className="text-2xl mb-2">🚫</div>
                <div className="text-sm font-medium text-foreground mb-1">Nothing on your don't-do list</div>
                <div className="text-xs text-muted-foreground mb-3">
                  Add habits or behaviours you're consciously avoiding — like social media in the morning or late-night snacking
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Plus className="w-3 h-3" /> Add first restriction
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {dontDo.map((item) => (
                  <DontDoCard
                    key={item.id}
                    item={item}
                    onSlip={slipDontDoItem}
                    onDelete={deleteDontDoItem}
                  />
                ))}
                <button
                  onClick={() => setAddDontDoOpen(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl border border-dashed border-rose-500/20 text-xs font-semibold text-rose-400/60 hover:border-rose-500/40 hover:text-rose-400 hover:bg-rose-500/5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Add restriction
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {addOpen && <AddHabitSheet onAdd={addHabit} onClose={() => setAddOpen(false)} />}
      {addDontDoOpen && <AddDontDoSheet onAdd={addDontDoItem} onClose={() => setAddDontDoOpen(false)} />}
    </div>
  );
}
