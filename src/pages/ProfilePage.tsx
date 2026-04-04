// =============================================================
// ProductiveDay — Profile & Settings Page
// =============================================================
import { useState, useEffect, useMemo } from "react";
import { User, Moon, Sun, Monitor, LogOut, Check, ChevronRight, Bell, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

const THEMES: { value: Theme; label: string; icon: typeof Moon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Colombo",
  "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney",
];

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState({
    full_name: "",
    timezone: "UTC",
    theme: "system" as Theme,
    notification_enabled: true,
    daily_goal_count: 6,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      if (data) {
        setProfile({
          full_name: data.full_name || "",
          timezone: data.timezone || "UTC",
          theme: data.theme || "system",
          notification_enabled: data.notification_enabled ?? true,
          daily_goal_count: data.daily_goal_count || 6,
        });
      }
      setLoading(false);
    });
  }, [user, supabase]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").upsert({ id: user.id, ...profile, updated_at: new Date().toISOString() });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const avatarInitials = (profile.full_name || user?.email || "U").slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-base font-bold text-foreground">Profile</h1>
          <button
            onClick={save}
            disabled={saving}
            className={cn(
              "flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-all duration-200",
              saved
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "border border-border/60 text-foreground hover:bg-muted/30"
            )}
          >
            {saved ? <><Check className="w-3.5 h-3.5" /> Saved</> : saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 pb-4 space-y-4">

        {/* Avatar + email */}
        <div className="flex items-center gap-4 p-4 rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm">
          <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {avatarInitials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">{profile.full_name || "No name set"}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          </div>
        </div>

        {/* Name */}
        <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Identity</div>
          </div>
          <div className="px-4 py-3">
            <label className="text-[11px] text-muted-foreground font-medium">Display name</label>
            <input
              value={profile.full_name}
              onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
              placeholder="Your name"
              className="mt-1 w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Theme */}
        <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Appearance</div>
          </div>
          <div className="px-4 py-3">
            <label className="text-[11px] text-muted-foreground font-medium">Theme</label>
            <div className="flex gap-2 mt-2">
              {THEMES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setProfile((p) => ({ ...p, theme: value }))}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-lg border text-xs font-medium transition-all",
                    profile.theme === value
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border/40 text-muted-foreground hover:border-border/60"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Timezone */}
        <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Regional</div>
          </div>
          <div className="px-4 py-3">
            <label className="text-[11px] text-muted-foreground font-medium">Timezone</label>
            <select
              value={profile.timezone}
              onChange={(e) => setProfile((p) => ({ ...p, timezone: e.target.value }))}
              className="mt-1 w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
        </div>

        {/* Daily goal */}
        <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Goals</div>
          </div>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">Daily block goal</div>
                <div className="text-[11px] text-muted-foreground">Blocks you aim to complete each day</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setProfile((p) => ({ ...p, daily_goal_count: Math.max(1, p.daily_goal_count - 1) }))}
                  className="w-7 h-7 rounded-lg border border-border/40 text-muted-foreground hover:text-foreground flex items-center justify-center text-sm"
                >−</button>
                <span className="text-sm font-bold text-foreground w-4 text-center">{profile.daily_goal_count}</span>
                <button
                  onClick={() => setProfile((p) => ({ ...p, daily_goal_count: Math.min(20, p.daily_goal_count + 1) }))}
                  className="w-7 h-7 rounded-lg border border-border/40 text-muted-foreground hover:text-foreground flex items-center justify-center text-sm"
                >+</button>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Notifications</div>
          </div>
          <button
            onClick={() => setProfile((p) => ({ ...p, notification_enabled: !p.notification_enabled }))}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <div className="text-sm text-foreground">Daily reminders</div>
            </div>
            <div className={cn(
              "w-10 h-6 rounded-full transition-all duration-200 relative",
              profile.notification_enabled ? "bg-primary" : "bg-muted/50"
            )}>
              <div className={cn(
                "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200",
                profile.notification_enabled ? "left-5" : "left-1"
              )} />
            </div>
          </button>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Sign out</span>
          </div>
          <ChevronRight className="w-4 h-4 opacity-50" />
        </button>

        <div className="text-center text-[10px] text-muted-foreground/40 py-2">
          ProductiveDay v1.0 · Built for enterprise productivity
        </div>
      </div>
    </div>
  );
}
