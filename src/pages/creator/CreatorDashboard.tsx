// =============================================================
// ProductiveDay — Creator Dashboard
// Pipeline stats, streak tracker, ideas count, upcoming shoots
// =============================================================

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getCreatorDashboard, getContentPipeline } from "@/lib/creator/contentActions";

interface PipelineStat {
  status: string;
  count: number;
}

interface Shoot {
  id: string;
  title: string;
  shoot_date: string;
  location?: string;
  status: string;
}

interface ContentPiece {
  id: string;
  title: string;
  status: string;
  content_type: string;
  platforms?: string[];
  planned_date?: string;
  tags?: string[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  idea:       { label: "Ideas",      color: "text-slate-500",   bg: "bg-slate-100 dark:bg-slate-800",    icon: "💡" },
  brief:      { label: "Brief",      color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-950",       icon: "📝" },
  scripting:  { label: "Scripting",  color: "text-purple-500",  bg: "bg-purple-50 dark:bg-purple-950",   icon: "✍️" },
  shooting:   { label: "Shooting",   color: "text-orange-500",  bg: "bg-orange-50 dark:bg-orange-950",   icon: "🎬" },
  editing:    { label: "Editing",    color: "text-yellow-500",  bg: "bg-yellow-50 dark:bg-yellow-950",   icon: "✂️" },
  review:     { label: "Review",     color: "text-pink-500",    bg: "bg-pink-50 dark:bg-pink-950",       icon: "👀" },
  scheduled:  { label: "Scheduled",  color: "text-teal-500",    bg: "bg-teal-50 dark:bg-teal-950",       icon: "📅" },
  published:  { label: "Published",  color: "text-green-500",   bg: "bg-green-50 dark:bg-green-950",     icon: "🚀" },
};

const TYPE_ICONS: Record<string, string> = {
  video: "🎥", short: "📱", reel: "🎞️", tiktok: "🎵",
  blog: "📄", newsletter: "📧", podcast: "🎙️",
  tweet: "🐦", carousel: "🖼️", thread: "🧵", other: "📦",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StreakFlame({ count }: { count: number }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-1">
      <div className="text-4xl">🔥</div>
      <div className="text-3xl font-bold text-foreground">{count}</div>
      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Day Streak</div>
    </div>
  );
}

export default function CreatorDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<{
    pipeline: PipelineStat[];
    creator_streak: number;
    ideas_count: number;
    upcoming_shoots: Shoot[];
  } | null>(null);
  const [recentContent, setRecentContent] = useState<ContentPiece[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [dashRes, pipelineRes] = await Promise.all([
      getCreatorDashboard(),
      getContentPipeline(),
    ]);
    if (dashRes.data) setStats(dashRes.data);
    if (pipelineRes.data) setRecentContent((pipelineRes.data as ContentPiece[]).slice(0, 5));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalPieces = stats?.pipeline.reduce((s, p) => s + Number(p.count), 0) || 0;
  const publishedCount = stats?.pipeline.find(p => p.status === "published")?.count || 0;
  const inProgressCount = stats?.pipeline
    .filter(p => !["idea", "published", "archived"].includes(p.status))
    .reduce((s, p) => s + Number(p.count), 0) || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 pt-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/50 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Creator Studio</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Your content production engine</p>
          </div>
          <button
            onClick={() => navigate("/creator/pipeline")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
          >
            <span>+</span>
            <span>New Content</span>
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">

        {/* Bento Row 1: Streak + Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          {/* Streak card */}
          <div className="col-span-1 rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-200/50 dark:border-orange-900/50 p-4 flex flex-col items-center justify-center min-h-[120px]">
            <StreakFlame count={stats?.creator_streak || 0} />
          </div>

          {/* Stats stack */}
          <div className="col-span-2 grid grid-rows-2 gap-3">
            <div className="rounded-2xl bg-card border border-border/50 p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-xl">📦</div>
              <div>
                <div className="text-2xl font-bold text-foreground leading-none">{totalPieces}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Total pieces</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-sm font-semibold text-green-500">{String(publishedCount)}</div>
                <div className="text-xs text-muted-foreground">published</div>
              </div>
            </div>
            <div className="rounded-2xl bg-card border border-border/50 p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-xl">💡</div>
              <div>
                <div className="text-2xl font-bold text-foreground leading-none">{stats?.ideas_count || 0}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Ideas waiting</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-sm font-semibold text-orange-500">{inProgressCount}</div>
                <div className="text-xs text-muted-foreground">in progress</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Funnel */}
        <div className="rounded-2xl bg-card border border-border/50 p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Content Pipeline</h2>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const count = stats?.pipeline.find(p => p.status === key)?.count || 0;
              return (
                <button
                  key={key}
                  onClick={() => navigate("/creator/pipeline")}
                  className={`${cfg.bg} rounded-xl p-2.5 text-center hover:ring-2 ring-primary/40 transition-all active:scale-95`}
                >
                  <div className="text-lg mb-0.5">{cfg.icon}</div>
                  <div className={`text-lg font-bold ${cfg.color}`}>{count}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">{cfg.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => navigate("/creator/ideas")}
            className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border border-blue-200/50 dark:border-blue-800/50 p-4 text-center hover:shadow-md active:scale-95 transition-all"
          >
            <div className="text-2xl mb-1">💡</div>
            <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">Ideas Vault</div>
            <div className="text-xs text-blue-500/70 mt-0.5">Capture & manage</div>
          </button>
          <button
            onClick={() => navigate("/creator/pipeline")}
            className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border border-purple-200/50 dark:border-purple-800/50 p-4 text-center hover:shadow-md active:scale-95 transition-all"
          >
            <div className="text-2xl mb-1">🎬</div>
            <div className="text-sm font-semibold text-purple-700 dark:text-purple-300">Pipeline</div>
            <div className="text-xs text-purple-500/70 mt-0.5">Kanban board</div>
          </button>
          <button
            onClick={() => navigate("/creator/scripts")}
            className="rounded-2xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border border-green-200/50 dark:border-green-800/50 p-4 text-center hover:shadow-md active:scale-95 transition-all"
          >
            <div className="text-2xl mb-1">✍️</div>
            <div className="text-sm font-semibold text-green-700 dark:text-green-300">Scripts</div>
            <div className="text-xs text-green-500/70 mt-0.5">AI-powered</div>
          </button>
        </div>

        {/* Upcoming Shoots */}
        {stats?.upcoming_shoots && stats.upcoming_shoots.length > 0 && (
          <div className="rounded-2xl bg-card border border-border/50 p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">🎬 Upcoming Shoots</h2>
            <div className="space-y-2">
              {stats.upcoming_shoots.map((shoot) => (
                <div key={shoot.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-lg shrink-0">📸</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{shoot.title}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(shoot.shoot_date)}{shoot.location ? ` · ${shoot.location}` : ""}</div>
                  </div>
                  <span className="text-xs bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full shrink-0">
                    {formatDate(shoot.shoot_date)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Content */}
        {recentContent.length > 0 && (
          <div className="rounded-2xl bg-card border border-border/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Recent Content</h2>
              <button
                onClick={() => navigate("/creator/pipeline")}
                className="text-xs text-primary font-medium hover:underline"
              >
                View all →
              </button>
            </div>
            <div className="space-y-2">
              {recentContent.map((piece) => {
                const cfg = STATUS_CONFIG[piece.status] || STATUS_CONFIG.idea;
                return (
                  <div key={piece.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                    <span className="text-xl shrink-0">
                      {TYPE_ICONS[piece.content_type] || "📦"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{piece.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {piece.platforms?.join(", ") || "No platform"}
                        {piece.planned_date ? ` · ${formatDate(piece.planned_date)}` : ""}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {totalPieces === 0 && (
          <div className="rounded-2xl bg-card border border-border/50 p-8 text-center">
            <div className="text-5xl mb-3">🎬</div>
            <h3 className="text-base font-semibold text-foreground">Ready to create?</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Capture your first idea or jump straight into the pipeline.</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => navigate("/creator/ideas")}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
              >
                Capture Idea
              </button>
              <button
                onClick={() => navigate("/creator/pipeline")}
                className="px-4 py-2 rounded-xl bg-muted text-foreground text-sm font-semibold hover:bg-muted/80 active:scale-95 transition-all"
              >
                New Content
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
