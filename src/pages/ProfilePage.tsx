// =============================================================
// ProductiveDay — Profile & Settings  (redesign based on screen-profile.jsx)
// =============================================================
import { useState, useEffect, useMemo } from "react";
import {
  Bell, Zap, Clock, Wallet, Link2, FileText, LogOut,
  ChevronRight, Check, Pencil, Target, Calendar, Sparkles,
  Sun, Moon, Monitor, Heart,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useNavigate } from "react-router-dom";

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
        width: 40, height: 24, borderRadius: 999, flexShrink: 0,
        background: on ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "var(--toggle-off,#d1d5db)",
        position: "relative", border: "none", cursor: "pointer", outline: "none",
        boxShadow: on ? "0 2px 8px rgba(99,102,241,0.35)" : "none",
        transition: "background .2s, box-shadow .2s",
      }}
    >
      <div style={{
        position: "absolute", top: 3, left: on ? 19 : 3, width: 18, height: 18,
        borderRadius: "50%", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
        transition: "left .18s cubic-bezier(.4,0,.2,1)",
      }} />
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
  return (
    <button
      onClick={item.onClick}
      disabled={!item.onClick && !item.onToggle}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 14px", width: "100%",
        background: "none", border: "none", cursor: item.onClick ? "pointer" : "default",
        borderBottom: isLast ? "none" : "1px solid var(--row-sep,rgba(0,0,0,0.06))",
        transition: "background .15s",
      }}
      className="hover:bg-muted/20 active:bg-muted/30"
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

  // Derived stats
  const daysTracked = useMemo(() => getDaysTracked(), []);
  const avgFocus    = useMemo(() => getAvgFocus(), []);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      if (data) {
        setProfile(p => ({
          ...p,
          full_name: data.full_name || "",
          timezone: data.timezone || "UTC",
          theme: data.theme || "system",
          notification_enabled: data.notification_enabled ?? true,
          daily_goal_hours: data.daily_goal_hours || data.daily_goal_count || 6,
          accent_gradient: data.accent_gradient ?? true,
          clock_24h: data.clock_24h ?? false,
        }));
        setNameInput(data.full_name || "");
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
            },
            {
              Icon: Target, color: "#10b981", label: "Daily focus goal",
              meta: `${profile.daily_goal_hours}h/day`, chevron: true,
            },
            {
              Icon: Calendar, color: "#f59e0b", label: "Connected calendars",
              meta: "Google", chevron: true,
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
            },
            {
              Icon: Link2, color: "#3b82f6", label: "Integrations",
              meta: "1 active", chevron: true,
            },
            {
              Icon: FileText, color: "#8b5cf6", label: "Export data",
              chevron: true,
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
    </div>
  );
}
