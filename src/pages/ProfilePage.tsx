// =============================================================
// ProductiveDay — Profile & Settings  (redesign based on screen-profile.jsx)
// =============================================================
import { useState, useEffect, useMemo } from "react";
import {
  Bell, Zap, Clock, Wallet, Link2, FileText, LogOut,
  ChevronRight, Check, Pencil, Target, Calendar, Sparkles,
  Sun, Moon, Monitor, Heart, X, Minus, Plus, Download,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────

function getInitials(name: string, email: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return (email || "U").slice(0, 2).toUpperCase();
}

function getDaysTracked(): number {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith("zip-planner-"));
    return keys.length;
  } catch { return 0; }
}

function getAvgFocus(): string {
  try {
    let totalMins = 0, count = 0;
    Object.keys(localStorage).filter(k => k.startsWith("zip-planner-")).forEach(k => {
      const data = JSON.parse(localStorage.getItem(k) || "[]");
      if (Array.isArray(data)) data.forEach((b: { dur?: number }) => {
        if (b.dur) { totalMins += b.dur; count++; }
      });
    });
    if (count === 0) return "—";
    const avg = totalMins / Math.max(1, Object.keys(localStorage).filter(k => k.startsWith("zip-planner-")).length);
    const h = Math.floor(avg / 60);
    const m = Math.round(avg % 60);
    return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
  } catch { return "—"; }
}

// ─── Toggle switch ─────────────────────────────────────────────
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: 52, height: 30, borderRadius: 999, flexShrink: 0,
        background: on ? "#22c55e" : "#d1d5db",
        position: "relative", border: "none", cursor: "pointer", outline: "none",
        boxShadow: on ? "0 2px 10px rgba(34,197,94,0.4)" : "0 1px 3px rgba(0,0,0,0.1)",
        transition: "background .22s, box-shadow .22s",
      }}
    >
      {/* Thumb */}
      <div style={{
        position: "absolute", top: 3,
        left: on ? 25 : 3,
        width: 24, height: 24,
        borderRadius: "50%",
        background: "white",
        boxShadow: "0 1px 4px rgba(0,0,0,0.22)",
        transition: "left .2s cubic-bezier(.4,0,.2,1)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {on ? (
          /* Checkmark */
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2 6.5l2.8 2.8L10 3.5" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          /* X */
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
            <path d="M2 2l6 6M8 2l-6 6" stroke="#9ca3af" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        )}
      </div>
    </button>
  );
}

// ─── Icon bucket ───────────────────────────────────────────────
function Bucket({ color, Icon }: { color: string; Icon: React.ElementType }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: 10, flexShrink: 0,
      background: `${color}1f`, color,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <Icon size={16} strokeWidth={2.1} />
    </div>
  );
}

// ─── Settings row ──────────────────────────────────────────────
interface RowItem {
  Icon: React.ElementType;
  color: string;
  label: string;
  meta?: string;
  toggle?: boolean;
  toggleOn?: boolean;
  onToggle?: () => void;
  danger?: boolean;
  onClick?: () => void;
  chevron?: boolean;
}

function SettingsRow({ item, isLast }: { item: RowItem; isLast: boolean }) {
  // For toggle-only rows the whole row taps the toggle; for chevron rows use onClick
  const rowClick = item.onClick ?? (item.toggle !== undefined ? item.onToggle : undefined);
  const isClickable = !!rowClick;
  return (
    <button
      onClick={rowClick}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 14px", width: "100%",
        background: "none", border: "none", cursor: isClickable ? "pointer" : "default",
        borderBottom: isLast ? "none" : "1px solid var(--row-sep,rgba(0,0,0,0.06))",
        transition: "background .15s",
      }}
      className={isClickable ? "hover:bg-muted/20 active:bg-muted/30" : ""}
    >
      <Bucket color={item.color} Icon={item.Icon} />
      <span style={{
        flex: 1, textAlign: "left", fontSize: 14, fontWeight: 500,
        color: item.danger ? "#ef4444" : "inherit",
      }}>
        {item.label}
      </span>
      {item.meta && (
        <span style={{ fontSize: 12, color: "var(--muted-fg,#9ca3af)", fontWeight: 500 }}>
          {item.meta}
        </span>
      )}
      {item.toggle !== undefined && (
        <Toggle on={!!item.toggleOn} onToggle={item.onToggle || (() => {})} />
      )}
      {item.chevron && (
        <ChevronRight size={15} strokeWidth={2.2} style={{ color: "var(--muted-fg,#9ca3af)", flexShrink: 0 }} />
      )}
    </button>
  );
}

// ─── Settings group ────────────────────────────────────────────
function SettingsGroup({ title, items }: { title: string; items: RowItem[] }) {
  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
        color: "var(--muted-fg,#9ca3af)", padding: "0 4px 8px",
      }}>{title}</div>
      <div className="bg-card border border-border/50 rounded-[18px] overflow-hidden shadow-sm">
        {items.map((it, i) => (
          <SettingsRow key={i} item={it} isLast={i === items.length - 1} />
        ))}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState({
    full_name: "",
    timezone: "UTC",
    theme: "system" as "light" | "dark" | "system",
    notification_enabled: true,
    daily_goal_hours: 6,
    accent_gradient: true,
    clock_24h: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalInput, setGoalInput] = useState(6);

  // Derived stats
  const daysTracked = useMemo(() => getDaysTracked(), []);
  const avgFocus    = useMemo(() => getAvgFocus(), []);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      if (data) {
        const dailyGoal = data.daily_goal_hours || data.daily_goal_count || 6;
        setProfile(p => ({
          ...p,
          full_name: data.full_name || "",
          timezone: data.timezone || "UTC",
          theme: data.theme || "system",
          notification_enabled: data.notification_enabled ?? true,
          daily_goal_hours: dailyGoal,
          accent_gradient: data.accent_gradient ?? true,
          clock_24h: data.clock_24h ?? false,
        }));
        setNameInput(data.full_name || "");
        setGoalInput(dailyGoal);
      }
      setLoading(false);
    });
  }, [user, supabase]);

  const save = async (patch?: Partial<typeof profile>) => {
    if (!user) return;
    const next = patch ? { ...profile, ...patch } : profile;
    if (patch) setProfile(next);
    setSaving(true);
    await supabase.from("profiles").upsert({
      id: user.id, ...next, updated_at: new Date().toISOString(),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSignOut = async () => { await signOut(); navigate("/login"); };

  const handleExport = () => {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith("zip-planner-"));
      const data: Record<string, unknown> = { profile, plannerDays: {} };
      keys.forEach(k => {
        try { data.plannerDays[k] = JSON.parse(localStorage.getItem(k) || "[]"); } catch { /* skip */ }
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "productiveday-export.json"; a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported!");
    } catch {
      toast.error("Export failed. Please try again.");
    }
  };

  const initials    = getInitials(profile.full_name, user?.email || "");
  const emailLine   = user?.email || "";
  const plan        = "Free";

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );

  // ── Theme picker inside appearance group ─────────────────────
  const themeOptions: { value: typeof profile.theme; label: string; Icon: React.ElementType }[] = [
    { value: "light",  label: "Light",  Icon: Sun },
    { value: "dark",   label: "Dark",   Icon: Moon },
    { value: "system", label: "System", Icon: Monitor },
  ];

  return (
    <div className="min-h-screen bg-background">

      {/* ── App bar ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
          <h1 className="text-[17px] font-bold tracking-tight">Profile</h1>
          <button
            onClick={() => save()}
            disabled={saving}
            className="h-8 px-3.5 rounded-lg text-xs font-semibold border border-border/60 hover:bg-muted/30 transition flex items-center gap-1.5"
            style={saved ? { background: "rgba(16,185,129,.12)", color: "#10b981", borderColor: "rgba(16,185,129,.3)" } : {}}
          >
            {saved ? <><Check size={13} strokeWidth={2.5} />Saved</> : saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-10">

        {/* ── Hero: avatar + name + stats ───────────────────── */}
        <div className="pt-6 pb-2 flex flex-col items-center">

          {/* Avatar */}
          <div style={{ position: "relative" }}>
            <div style={{
              width: 84, height: 84, borderRadius: 26,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 800, fontSize: 32, letterSpacing: "-1px",
              boxShadow: "0 16px 32px rgba(99,102,241,.35), inset 0 1px 0 rgba(255,255,255,.25)",
              userSelect: "none",
            }}>
              {initials}
            </div>
            {/* Edit badge */}
            <button
              onClick={() => { setEditingName(true); setNameInput(profile.full_name); }}
              className="absolute -bottom-1 -right-1 w-[26px] h-[26px] rounded-full bg-card border-2 border-background flex items-center justify-center shadow-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil size={11} strokeWidth={2.3} />
            </button>
          </div>

          {/* Name */}
          {editingName ? (
            <div className="mt-3 flex items-center gap-2">
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onBlur={() => {
                  setEditingName(false);
                  save({ full_name: nameInput });
                }}
                onKeyDown={e => {
                  if (e.key === "Enter") { setEditingName(false); save({ full_name: nameInput }); }
                  if (e.key === "Escape") { setEditingName(false); setNameInput(profile.full_name); }
                }}
                className="text-[20px] font-bold text-center bg-transparent border-b-2 border-primary outline-none w-44"
                style={{ fontFamily: "inherit" }}
              />
            </div>
          ) : (
            <div
              className="mt-3 text-[20px] font-bold tracking-tight cursor-pointer"
              onClick={() => { setEditingName(true); setNameInput(profile.full_name); }}
            >
              {profile.full_name || "Set your name"}
            </div>
          )}

          <div className="mt-1 text-[12px] text-muted-foreground">{emailLine}</div>

          {/* Stats 3-col */}
          <div className="grid grid-cols-3 gap-2.5 w-full mt-5">
            {[
              { v: daysTracked > 0 ? String(daysTracked) : "—", l: "Days tracked", brand: false },
              { v: avgFocus, l: "Avg focus", brand: false },
              { v: plan, l: "Plan", brand: true },
            ].map((s, i) => (
              <div key={i} style={{
                borderRadius: 16, padding: "12px 8px", textAlign: "center",
                background: s.brand ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : undefined,
                boxShadow: s.brand ? "0 6px 18px rgba(99,102,241,.32)" : undefined,
              }} className={s.brand ? "" : "bg-card border border-border/50 shadow-sm"}>
                <div
                  className="tabular-nums"
                  style={{ fontWeight: 800, fontSize: 18, color: s.brand ? "white" : undefined }}
                >
                  {s.v}
                </div>
                <div style={{
                  fontSize: 10, fontWeight: 500, marginTop: 2,
                  color: s.brand ? "rgba(255,255,255,.75)" : undefined,
                }} className={s.brand ? "" : "text-muted-foreground"}>
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Settings sections ──────────────────────────────── */}
        <div className="mt-6 space-y-5">

          {/* Preferences */}
          <SettingsGroup title="Preferences" items={[
            {
              Icon: Bell, color: "#3b82f6", label: "Notifications",
              meta: profile.notification_enabled ? "On" : "Off",
              toggle: true,
              toggleOn: profile.notification_enabled,
              onToggle: () => save({ notification_enabled: !profile.notification_enabled }),
            },
            {
              Icon: Sparkles, color: "#8b5cf6", label: "AI assistant · Atlas",
              meta: "Llama 3", chevron: true,
              onClick: () => toast("AI assistant settings coming soon"),
            },
            {
              Icon: Target, color: "#10b981", label: "Daily focus goal",
              meta: `${profile.daily_goal_hours}h/day`, chevron: true,
              onClick: () => { setGoalInput(profile.daily_goal_hours); setGoalDialogOpen(true); },
            },
            {
              Icon: Calendar, color: "#f59e0b", label: "Connected calendars",
              meta: "Google", chevron: true,
              onClick: () => toast("Calendar integrations coming soon"),
            },
          ]} />

          {/* Appearance */}
          <SettingsGroup title="Appearance" items={[
            {
              Icon: Heart, color: "#ef4444", label: "Theme",
              meta: profile.theme === "light" ? "Light" : profile.theme === "dark" ? "Dark" : "System",
              chevron: true,
              onClick: () => {
                const next = profile.theme === "light" ? "dark" : profile.theme === "dark" ? "system" : "light";
                save({ theme: next });
              },
            },
            {
              Icon: Zap, color: "#f59e0b", label: "Accent gradient",
              toggle: true, toggleOn: profile.accent_gradient,
              onToggle: () => save({ accent_gradient: !profile.accent_gradient }),
            },
            {
              Icon: Clock, color: "#8a8a8a", label: "24-hour clock",
              toggle: true, toggleOn: profile.clock_24h,
              onToggle: () => save({ clock_24h: !profile.clock_24h }),
            },
          ]} />

          {/* Account */}
          <SettingsGroup title="Account" items={[
            {
              Icon: Wallet, color: "#10b981", label: "Billing",
              meta: "Free plan", chevron: true,
              onClick: () => toast("You're on the Free plan. Upgrade options coming soon!"),
            },
            {
              Icon: Link2, color: "#3b82f6", label: "Integrations",
              meta: "1 active", chevron: true,
              onClick: () => toast("Manage integrations coming soon"),
            },
            {
              Icon: FileText, color: "#8b5cf6", label: "Export data",
              chevron: true,
              onClick: handleExport,
            },
            {
              Icon: LogOut, color: "#ef4444", label: "Sign out",
              danger: true, chevron: true, onClick: handleSignOut,
            },
          ]} />
        </div>

        {/* Version footer */}
        <div className="mt-6 text-center text-[11px] text-muted-foreground/40" style={{ fontFamily: "JetBrains Mono, monospace" }}>
          ProductiveDay · v2.0.0
        </div>
      </div>

      {/* ── Daily Goal Dialog ──────────────────────────────── */}
      {goalDialogOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}
          onClick={() => setGoalDialogOpen(false)}
        >
          <div
            style={{
              width: "100%", maxWidth: 480,
              background: "var(--background)", borderRadius: "20px 20px 0 0",
              padding: "20px 20px 36px",
              boxShadow: "0 -8px 32px rgba(0,0,0,0.18)",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 18px" }} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>Daily focus goal</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                  Set your target focus hours per day
                </div>
              </div>
              <button
                onClick={() => setGoalDialogOpen(false)}
                style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={14} strokeWidth={2.2} />
              </button>
            </div>

            {/* Stepper */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, marginBottom: 24 }}>
              <button
                onClick={() => setGoalInput(g => Math.max(1, g - 1))}
                style={{
                  width: 44, height: 44, borderRadius: 12, border: "1.5px solid var(--border)",
                  background: "var(--card)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Minus size={18} strokeWidth={2.2} />
              </button>
              <div style={{ textAlign: "center" }}>
                <span style={{ fontWeight: 800, fontSize: 48, lineHeight: 1, color: "var(--foreground)" }}>
                  {goalInput}
                </span>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>hours / day</div>
              </div>
              <button
                onClick={() => setGoalInput(g => Math.min(16, g + 1))}
                style={{
                  width: 44, height: 44, borderRadius: 12, border: "1.5px solid var(--border)",
                  background: "var(--card)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Plus size={18} strokeWidth={2.2} />
              </button>
            </div>

            {/* Quick picks */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}>
              {[4, 6, 8, 10].map(h => (
                <button
                  key={h}
                  onClick={() => setGoalInput(h)}
                  style={{
                    padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                    border: "1.5px solid",
                    borderColor: goalInput === h ? "#6366f1" : "var(--border)",
                    background: goalInput === h ? "rgba(99,102,241,0.1)" : "var(--card)",
                    color: goalInput === h ? "#6366f1" : "var(--muted-foreground)",
                    cursor: "pointer",
                  }}
                >
                  {h}h
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                save({ daily_goal_hours: goalInput });
                setGoalDialogOpen(false);
                toast.success(`Goal set to ${goalInput}h/day`);
              }}
              style={{
                width: "100%", height: 44, borderRadius: 12, border: "none",
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer",
                boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
              }}
            >
              Save goal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
