// =============================================================
// ProductiveDay — Creator Dashboard (RPC-free v2)
// All stats computed client-side from getContentPipeline + getIdeas
// No dependency on get_pipeline_stats or get_creator_streak RPCs
// =============================================================

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CreatorLayout } from "@/components/creator/CreatorLayout";
import { getContentPipeline, getIdeas } from "@/lib/creator/contentActions";

// ─── Types ────────────────────────────────────────────────────

interface ContentPiece {
  id: string;
  title: string;
  status: string;
  content_type: string;
  platforms?: string[];
  planned_date?: string;
  updated_at?: string;
  created_at?: string;
  priority?: "high" | "medium" | "low";
}

// ─── Config ───────────────────────────────────────────────────

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
  video: "🎥", short: "📱", reel: "🎞️", tiktok: "🎵", blog: "📄",
  newsletter: "📧", podcast: "🎙️", tweet: "🐦", carousel: "🖼️", thread: "🧵", other: "📦",
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

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-red-500", medium: "bg-amber-400", low: "bg-slate-400",
};

// ─── Helpers ──────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysSince(dateStr?: string): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function startOfWeek(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ─── Sub-components ───────────────────────────────────────────

function StatCard({ value, label, icon, accent }: { value: string | number; label: string; icon: string; accent?: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border/50 p-3.5 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${accent || "bg-muted"}`}>
        {icon}
      </div>
      <div>
        <div className="text-xl font-bold text-foreground leading-none">{value}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">{label}</div>
      </div>
    </div>
  );
}

function AlertBanner({ pieces }: { pieces: ContentPiece[] }) {
  if (pieces.length === 0) return null;
  return (
    <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">⚠️</span>
        <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400">Needs Attention</h3>
        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-bold">
          {pieces.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {pieces.slice(0, 3).map(p => (
          <div key={p.id} className="flex items-center gap-2">
            <span className="text-sm">{TYPE_ICON[p.content_type] || "📦"}</span>
            <span className="text-xs text-amber-700 dark:text-amber-300 flex-1 truncate font-medium">{p.title}</span>
            <span className="text-[10px] text-amber-500 dark:text-amber-500 shrink-0">
              {daysSince(p.updated_at)}d stale
            </span>
          </div>
        ))}
        {pieces.length > 3 && (
          <p className="text-[10px] text-amber-500 dark:text-amber-500 mt-1">+{pieces.length - 3} more</p>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────

export default function CreatorDashboard() {
  const navigate = useNavigate();
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [ideasCount, setIdeasCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [pipeRes, ideasRes] = await Promise.all([
      getContentPipeline(),
      getIdeas(),
    ]);
    if (pipeRes.data) setPieces(pipeRes.data as ContentPiece[]);
    if (ideasRes.data) setIdeasCount(ideasRes.data.length);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived stats ──────────────────────────────────────────
  const totalPieces = pieces.length;
  const publishedCount = pieces.filter(p => p.status === "published").length;
  const inProgress = pieces.filter(p => !["idea", "published", "archived"].includes(p.status)).length;

  // Content velocity
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();
  const publishedThisWeek = pieces.filter(p =>
    p.status === "published" && p.updated_at && p.updated_at >= weekStart
  ).length;
  const publishedThisMonth = pieces.filter(p =>
    p.status === "published" && p.updated_at && p.updated_at >= monthStart
  ).length;

  // Stuck pieces (not published/archived, not updated in 7+ days)
  const stuckPieces = pieces.filter(p =>
    !["published", "archived"].includes(p.status) &&
    daysSince(p.updated_at) >= 7
  );

  // Overdue pieces (planned date in the past, not published)
  const today = new Date().toISOString().split("T")[0];
  const overduePieces = pieces.filter(p =>
    p.planned_date && p.planned_date < today && p.status !== "published"
  );

  // High priority pieces in active stages
  const highPriority = pieces.filter(p =>
    p.priority === "high" && !["published", "archived"].includes(p.status)
  );

  // Attention-needed = stuck + overdue (deduplicated)
  const needsAttention = [...new Map(
    [...stuckPieces, ...overduePieces].map(p => [p.id, p])
  ).values()];

  // Pipeline stage counts
  const stageCounts: Record<string, number> = {};
  pieces.forEach(p => { stageCounts[p.status] = (stageCounts[p.status] || 0) + 1; });

  // Recent content (last 4 non-published or most recently updated)
  const recentContent = [...pieces]
    .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""))
    .slice(0, 4);

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
            {/* Velocity badge */}
            {publishedThisMonth > 0 && (
              <div className="flex flex-col items-center bg-green-50 dark:bg-green-950/40 border border-green-200/50 dark:border-green-900/50 rounded-2xl px-3 py-2">
                <span className="text-2xl">📈</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400 leading-none">{publishedThisMonth}</span>
                <span className="text-[10px] text-green-600/70 dark:text-green-500/70 font-medium">this month</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-4 -mt-2 pb-6">

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2.5">
              <StatCard value={totalPieces} label="Total pieces" icon="📦" accent="bg-purple-100 dark:bg-purple-950/50" />
              <StatCard value={publishedCount} label="Published" icon="🚀" accent="bg-green-100 dark:bg-green-950/50" />
              <StatCard value={ideasCount} label="Ideas" icon="💡" accent="bg-blue-100 dark:bg-blue-950/50" />
            </div>

            {/* Velocity row */}
            {(publishedThisWeek > 0 || publishedThisMonth > 0) && (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl bg-card border border-border/50 p-3.5 flex items-center gap-2">
                  <span className="text-xl">⚡</span>
                  <div>
                    <div className="text-lg font-bold text-foreground leading-none">{publishedThisWeek}</div>
                    <div className="text-[10px] text-muted-foreground font-medium">this week</div>
                  </div>
                </div>
                <div className="rounded-2xl bg-card border border-border/50 p-3.5 flex items-center gap-2">
                  <span className="text-xl">🗓️</span>
                  <div>
                    <div className="text-lg font-bold text-foreground leading-none">{publishedThisMonth}</div>
                    <div className="text-[10px] text-muted-foreground font-medium">this month</div>
                  </div>
                </div>
              </div>
            )}

            {/* Needs attention */}
            <AlertBanner pieces={needsAttention} />

            {/* High priority alert */}
            {highPriority.length > 0 && (
              <div className="rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/40 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🔴</span>
                    <h3 className="text-sm font-bold text-red-700 dark:text-red-400">High Priority</h3>
                    <span className="text-[10px] bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full font-bold">
                      {highPriority.length}
                    </span>
                  </div>
                  <button onClick={() => navigate("/creator/pipeline")}
                    className="text-[10px] text-red-600 dark:text-red-400 font-bold hover:underline">View →</button>
                </div>
                <div className="space-y-1.5">
                  {highPriority.slice(0, 3).map(p => (
                    <div key={p.id} className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT.high}`} />
                      <span className="text-xs text-red-700 dark:text-red-300 flex-1 truncate font-medium">{p.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_LABEL[p.status]?.cls || ""}`}>
                        {STATUS_LABEL[p.status]?.label || p.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pipeline flow */}
            <div className="rounded-2xl bg-card border border-border/50 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-foreground">Production Pipeline</h2>
                <button onClick={() => navigate("/creator/pipeline")}
                  className="text-xs text-primary font-semibold hover:underline">
                  Open board →
                </button>
              </div>

              {totalPieces === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No content yet. Start by adding to the pipeline.
                </p>
              ) : (
                <div className="space-y-2">
                  {PIPELINE_STAGES.map(stage => {
                    const count = stageCounts[stage.key] || 0;
                    if (count === 0) return null;
                    const pct = Math.round((count / totalPieces) * 100);
                    return (
                      <button key={stage.key} onClick={() => navigate("/creator/pipeline")}
                        className="w-full flex items-center gap-3 group hover:opacity-90 transition-opacity">
                        <span className="text-sm w-4">{stage.emoji}</span>
                        <span className="text-xs text-muted-foreground w-16 text-left shrink-0">{stage.label}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, 8)}%`, backgroundColor: stage.color }} />
                        </div>
                        <span className="text-xs font-bold text-foreground w-4 text-right">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { to: "/creator/ideas",    emoji: "💡", label: "Ideas Vault", sub: "Capture & manage",  from: "from-blue-500/10",   border: "border-blue-200/40 dark:border-blue-800/40" },
                { to: "/creator/pipeline", emoji: "🎬", label: "Pipeline",    sub: "Kanban board",      from: "from-purple-500/10", border: "border-purple-200/40 dark:border-purple-800/40" },
                { to: "/creator/scripts",  emoji: "✍️", label: "Scripts",     sub: "AI-powered",        from: "from-orange-500/10", border: "border-orange-200/40 dark:border-orange-800/40" },
              ].map(item => (
                <button key={item.to} onClick={() => navigate(item.to)}
                  className={`rounded-2xl bg-gradient-to-b ${item.from} to-transparent border ${item.border} p-3.5 text-center hover:shadow-md active:scale-95 transition-all`}>
                  <div className="text-2xl mb-1">{item.emoji}</div>
                  <div className="text-xs font-bold text-foreground">{item.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</div>
                </button>
              ))}
            </div>

            {/* Recent content */}
            {recentContent.length > 0 && (
              <div className="rounded-2xl bg-card border border-border/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-foreground">Recent Content</h2>
                  <button onClick={() => navigate("/creator/pipeline")}
                    className="text-xs text-primary font-semibold hover:underline">View all →</button>
                </div>
                <div className="divide-y divide-border/40">
                  {recentContent.map(piece => {
                    const s = STATUS_LABEL[piece.status] || STATUS_LABEL.idea;
                    return (
                      <div key={piece.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                        <div className="relative shrink-0">
                          <span className="text-xl">{TYPE_ICON[piece.content_type] || "📦"}</span>
                          {piece.priority && (
                            <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-background ${PRIORITY_DOT[piece.priority]}`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{piece.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {piece.platforms?.join(", ") || "No platform"}
                            {piece.planned_date ? ` · 📅 ${formatDate(piece.planned_date)}` : ""}
                          </p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${s.cls}`}>
                          {s.label}
                        </span>
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
                <p className="text-sm text-muted-foreground mt-1 mb-5">
                  Capture an idea, or jump straight into production.
                </p>
                <div className="flex gap-2 justify-center">
                  <button onClick={() => navigate("/creator/ideas")}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all">
                    💡 Capture Idea
                  </button>
                  <button onClick={() => navigate("/creator/pipeline")}
                    className="px-4 py-2 rounded-xl bg-muted text-foreground text-sm font-semibold hover:bg-muted/80 active:scale-95 transition-all">
                    🎬 New Content
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </CreatorLayout>
  );
}
