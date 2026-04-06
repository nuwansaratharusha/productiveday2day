// =============================================================
// ProductiveDay — Creator Dashboard (Redesigned)
// =============================================================

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CreatorLayout } from "@/components/creator/CreatorLayout";
import { getCreatorDashboard, getContentPipeline } from "@/lib/creator/contentActions";

interface PipelineStat { status: string; count: number }
interface Shoot { id: string; title: string; shoot_date: string; location?: string }
interface ContentPiece {
  id: string; title: string; status: string; content_type: string;
  platforms?: string[]; planned_date?: string;
}

const PIPELINE_STAGES = [
  { key: "idea",      label: "Idea",      color: "#94a3b8", emoji: "💡" },
  { key: "brief",     label: "Brief",     color: "#60a5fa", emoji: "📝" },
  { key: "scripting", label: "Script",    color: "#a78bfa", emoji: "✍️" },
  { key: "shooting",  label: "Shoot",     color: "#fb923c", emoji: "🎬" },
  { key: "editing",   label: "Edit",      color: "#facc15", emoji: "✂️" },
  { key: "review",    label: "Review",    color: "#f472b6", emoji: "👀" },
  { key: "scheduled", label: "Scheduled", color: "#34d399", emoji: "📅" },
  { key: "published", label: "Published", color: "#4ade80", emoji: "🚀" },
];

const TYPE_ICON: Record<string, string> = {
  video:"🎥", short:"📱", reel:"🎞️", tiktok:"🎵", blog:"📄",
  newsletter:"📧", podcast:"🎙️", tweet:"🐦", carousel:"🖼️", thread:"🧵", other:"📦",
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  idea:      { label: "Idea",      cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  brief:     { label: "Brief",     cls: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300" },
  scripting: { label: "Scripting", cls: "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-300" },
  shooting:  { label: "Shooting",  cls: "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-300" },
  editing:   { label: "Editing",   cls: "bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-300" },
  review:    { label: "Review",    cls: "bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-300" },
  scheduled: { label: "Scheduled", cls: "bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-300" },
  published: { label: "Published", cls: "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-300" },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatCard({ value, label, icon, accent }: { value: string | number; label: string; icon: string; accent?: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border/50 p-4 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${accent || "bg-muted"}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground leading-none">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      </div>
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
    if (pipelineRes.data) setRecentContent((pipelineRes.data as ContentPiece[]).slice(0, 4));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalPieces = stats?.pipeline.reduce((s, p) => s + Number(p.count), 0) || 0;
  const publishedCount = Number(stats?.pipeline.find(p => p.status === "published")?.count || 0);
  const inProgress = stats?.pipeline.filter(p => !["idea","published","archived"].includes(p.status)).reduce((s,p) => s + Number(p.count), 0) || 0;

  return (
    <CreatorLayout>
      {/* Hero header */}
      <div className="relative overflow-hidden px-4 pt-6 pb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/8 via-primary/5 to-orange-500/8" />
        <div className="relative max-w-2xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">Creator Studio</p>
              <h1 className="text-2xl font-bold text-foreground">Your content engine 🎬</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {totalPieces === 0
                  ? "Ready to start creating?"
                  : `${inProgress} in production · ${publishedCount} published`}
              </p>
            </div>
            {(stats?.creator_streak || 0) > 0 && (
              <div className="flex flex-col items-center bg-orange-50 dark:bg-orange-950/40 border border-orange-200/50 dark:border-orange-900/50 rounded-2xl px-3 py-2">
                <span className="text-2xl">🔥</span>
                <span className="text-lg font-bold text-orange-500 leading-none">{stats?.creator_streak}</span>
                <span className="text-[10px] text-orange-500/70 font-medium">streak</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-5 -mt-2">

        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard value={totalPieces} label="Total pieces" icon="📦" accent="bg-purple-100 dark:bg-purple-950/50" />
              <StatCard value={publishedCount} label="Published" icon="🚀" accent="bg-green-100 dark:bg-green-950/50" />
              <StatCard value={stats?.ideas_count || 0} label="Ideas saved" icon="💡" accent="bg-blue-100 dark:bg-blue-950/50" />
            </div>

            {/* Pipeline flow */}
            <div className="rounded-2xl bg-card border border-border/50 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-foreground">Production Pipeline</h2>
                <button
                  onClick={() => navigate("/creator/pipeline")}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  Open board →
                </button>
              </div>

              {totalPieces === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No content yet. Start by adding to the pipeline.</p>
              ) : (
                <div className="space-y-2">
                  {PIPELINE_STAGES.map(stage => {
                    const count = Number(stats?.pipeline.find(p => p.status === stage.key)?.count || 0);
                    if (count === 0) return null;
                    const pct = Math.round((count / totalPieces) * 100);
                    return (
                      <button
                        key={stage.key}
                        onClick={() => navigate("/creator/pipeline")}
                        className="w-full flex items-center gap-3 group hover:opacity-90 transition-opacity"
                      >
                        <span className="text-sm w-4">{stage.emoji}</span>
                        <span className="text-xs text-muted-foreground w-16 text-left shrink-0">{stage.label}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, 8)}%`, backgroundColor: stage.color }}
                          />
                        </div>
                        <span className="text-xs font-bold text-foreground w-4 text-right">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { to: "/creator/ideas", emoji: "💡", label: "Ideas Vault", sub: "Capture & manage", from: "from-blue-500/10", border: "border-blue-200/40 dark:border-blue-800/40" },
                { to: "/creator/pipeline", emoji: "🎬", label: "Pipeline", sub: "Kanban board", from: "from-purple-500/10", border: "border-purple-200/40 dark:border-purple-800/40" },
                { to: "/creator/scripts", emoji: "✍️", label: "Scripts", sub: "AI-powered", from: "from-orange-500/10", border: "border-orange-200/40 dark:border-orange-800/40" },
              ].map(item => (
                <button
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className={`rounded-2xl bg-gradient-to-b ${item.from} to-transparent border ${item.border} p-4 text-center hover:shadow-md active:scale-95 transition-all`}
                >
                  <div className="text-2xl mb-1.5">{item.emoji}</div>
                  <div className="text-xs font-bold text-foreground">{item.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</div>
                </button>
              ))}
            </div>

            {/* Upcoming shoots */}
            {stats?.upcoming_shoots && stats.upcoming_shoots.length > 0 && (
              <div className="rounded-2xl bg-card border border-border/50 p-4">
                <h2 className="text-sm font-bold text-foreground mb-3">🎥 Upcoming Shoots</h2>
                <div className="space-y-2">
                  {stats.upcoming_shoots.map(shoot => (
                    <div key={shoot.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40">
                      <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center text-base shrink-0">📸</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{shoot.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(shoot.shoot_date)}{shoot.location ? ` · ${shoot.location}` : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent content */}
            {recentContent.length > 0 && (
              <div className="rounded-2xl bg-card border border-border/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-foreground">Recent Content</h2>
                  <button onClick={() => navigate("/creator/pipeline")} className="text-xs text-primary font-semibold hover:underline">View all →</button>
                </div>
                <div className="divide-y divide-border/40">
                  {recentContent.map(piece => {
                    const s = STATUS_LABEL[piece.status] || STATUS_LABEL.idea;
                    return (
                      <div key={piece.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                        <span className="text-xl shrink-0">{TYPE_ICON[piece.content_type] || "📦"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{piece.title}</p>
                          <p className="text-xs text-muted-foreground">{piece.platforms?.join(", ") || "No platform"}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${s.cls}`}>{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty state */}
            {totalPieces === 0 && (
              <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center">
                <div className="text-5xl mb-3">🎬</div>
                <h3 className="text-base font-bold text-foreground">Start your first piece</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-5">Capture an idea, or jump straight into production.</p>
                <div className="flex gap-2 justify-center">
                  <button onClick={() => navigate("/creator/ideas")} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all">💡 Capture Idea</button>
                  <button onClick={() => navigate("/creator/pipeline")} className="px-4 py-2 rounded-xl bg-muted text-foreground text-sm font-semibold hover:bg-muted/80 active:scale-95 transition-all">🎬 New Content</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </CreatorLayout>
  );
}
