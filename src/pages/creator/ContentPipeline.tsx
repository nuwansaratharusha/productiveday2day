// =============================================================
// ProductiveDay — Content Pipeline Kanban (Redesigned)
// =============================================================

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CreatorLayout } from "@/components/creator/CreatorLayout";
import { getContentPipeline, createContentPiece, moveContentStatus, deleteContentPiece } from "@/lib/creator/contentActions";

interface ContentPiece {
  id: string; title: string; content_type: string; status: string;
  platforms?: string[]; planned_date?: string; notes?: string;
}

const STAGES = [
  { key: "idea",      label: "Idea",      emoji: "💡", color: "#94a3b8", bg: "bg-slate-100 dark:bg-slate-800",    text: "text-slate-600 dark:text-slate-300" },
  { key: "brief",     label: "Brief",     emoji: "📝", color: "#60a5fa", bg: "bg-blue-100 dark:bg-blue-950",      text: "text-blue-600 dark:text-blue-300" },
  { key: "scripting", label: "Scripting", emoji: "✍️", color: "#a78bfa", bg: "bg-purple-100 dark:bg-purple-950",  text: "text-purple-600 dark:text-purple-300" },
  { key: "shooting",  label: "Shooting",  emoji: "🎬", color: "#fb923c", bg: "bg-orange-100 dark:bg-orange-950",  text: "text-orange-600 dark:text-orange-300" },
  { key: "editing",   label: "Editing",   emoji: "✂️", color: "#facc15", bg: "bg-yellow-100 dark:bg-yellow-950",  text: "text-yellow-600 dark:text-yellow-300" },
  { key: "review",    label: "Review",    emoji: "👀", color: "#f472b6", bg: "bg-pink-100 dark:bg-pink-950",      text: "text-pink-600 dark:text-pink-300" },
  { key: "scheduled", label: "Scheduled", emoji: "📅", color: "#34d399", bg: "bg-teal-100 dark:bg-teal-950",      text: "text-teal-600 dark:text-teal-300" },
  { key: "published", label: "Published", emoji: "🚀", color: "#4ade80", bg: "bg-green-100 dark:bg-green-950",    text: "text-green-600 dark:text-green-300" },
];

const CONTENT_TYPES = [
  { key: "video", icon: "🎥" }, { key: "short", icon: "📱" }, { key: "reel", icon: "🎞️" },
  { key: "tiktok", icon: "🎵" }, { key: "blog", icon: "📄" }, { key: "newsletter", icon: "📧" },
  { key: "podcast", icon: "🎙️" }, { key: "tweet", icon: "🐦" }, { key: "carousel", icon: "🖼️" },
  { key: "thread", icon: "🧵" }, { key: "other", icon: "📦" },
];
const PLATFORMS = ["YouTube","TikTok","Instagram","LinkedIn","Twitter","Blog","Newsletter","Podcast"];

function typeIcon(t: string) { return CONTENT_TYPES.find(c => c.key === t)?.icon || "📦"; }
function formatDate(d: string) { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }

function PieceCard({ piece, stage, onMove, onDelete, onScript }: {
  piece: ContentPiece;
  stage: typeof STAGES[0];
  onMove: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onScript: (id: string) => void;
}) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const others = STAGES.filter(s => s.key !== piece.status);

  return (
    <>
      <div className="bg-card border border-border/50 rounded-2xl p-3.5 space-y-2.5 hover:shadow-sm hover:border-border transition-all">
        {/* Top */}
        <div className="flex items-start gap-2.5">
          <span className="text-xl shrink-0 mt-0.5">{typeIcon(piece.content_type)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{piece.title}</p>
            {piece.planned_date && (
              <p className="text-[10px] text-muted-foreground mt-0.5">📅 {formatDate(piece.planned_date)}</p>
            )}
          </div>
        </div>

        {/* Platforms */}
        {piece.platforms && piece.platforms.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {piece.platforms.map(p => (
              <span key={p} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md font-medium">{p}</span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-1.5">
          <button onClick={() => onScript(piece.id)}
            className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold transition-all ${stage.bg} ${stage.text} hover:opacity-80`}>
            ✍️ Script
          </button>
          <button onClick={() => setShowMoveMenu(true)}
            className="flex-1 py-1.5 rounded-xl bg-muted text-muted-foreground text-[10px] font-bold hover:bg-muted/80 transition-all">
            ↕ Move
          </button>
          <button onClick={() => onDelete(piece.id)}
            className="px-2 py-1.5 rounded-xl bg-muted text-muted-foreground text-[10px] hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 transition-all">
            ✕
          </button>
        </div>
      </div>

      {/* Move menu */}
      {showMoveMenu && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowMoveMenu(false)}>
          <div className="bg-background rounded-t-3xl w-full max-w-lg p-5 pb-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center mb-4"><div className="w-10 h-1 rounded-full bg-muted-foreground/20" /></div>
            <p className="text-sm font-bold text-foreground mb-3">Move to stage</p>
            <div className="grid grid-cols-2 gap-2">
              {others.map(s => (
                <button key={s.key} onClick={() => { onMove(piece.id, s.key); setShowMoveMenu(false); }}
                  className={`py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${s.bg} ${s.text}`}>
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AddSheet({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("video");
  const [plats, setPlats] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setTitle(""); setType("video"); setPlats([]); setDate(""); }
  }, [open]);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    await createContentPiece({ title: title.trim(), content_type: type, status: "idea", platforms: plats.length ? plats : undefined, planned_date: date || undefined });
    setSaving(false);
    onSave(); onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-background rounded-t-3xl flex flex-col overflow-hidden" style={{ maxHeight: "85vh" }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-2 shrink-0"><div className="w-10 h-1 rounded-full bg-muted-foreground/20" /></div>

        <div className="px-5 pb-2 shrink-0">
          <h2 className="text-lg font-bold text-foreground">🎬 New Content</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Add a new piece to your pipeline</p>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 px-5 py-4 space-y-5">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What are you creating?" autoFocus
            className="w-full text-base font-semibold bg-transparent border-b-2 border-border focus:border-primary pb-2 text-foreground placeholder:text-muted-foreground/40 focus:outline-none transition-colors" />

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">Content Type</label>
            <div className="flex flex-wrap gap-2">
              {CONTENT_TYPES.map(t => (
                <button key={t.key} type="button" onClick={() => setType(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all capitalize ${type === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {t.icon} {t.key}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button key={p} type="button" onClick={() => setPlats(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${plats.includes(p) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">Planned Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <div className="px-5 py-4 pb-8 border-t border-border/30 shrink-0 bg-background">
          <button onClick={handleSave} disabled={!title.trim() || saving}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 shadow-sm">
            {saving ? "Adding..." : "Add to Pipeline →"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContentPipeline() {
  const navigate = useNavigate();
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState("idea");
  const [showAdd, setShowAdd] = useState(false);
  const [missingTable, setMissingTable] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await getContentPipeline();
    if (error) {
      if (typeof error === "string" && (error.includes("does not exist") || error.includes("42P01"))) {
        setMissingTable(true);
      } else {
        setLoadError(typeof error === "string" ? error : "Failed to load pipeline");
      }
    }
    if (data) setPieces(data as ContentPiece[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleMove(id: string, status: string) {
    setPieces(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    await moveContentStatus(id, status);
  }
  async function handleDelete(id: string) {
    setPieces(prev => prev.filter(p => p.id !== id));
    await deleteContentPiece(id);
  }

  const stage = STAGES.find(s => s.key === activeStage) || STAGES[0];
  const stagePieces = pieces.filter(p => p.status === activeStage);
  const total = pieces.length;

  return (
    <CreatorLayout>
      {/* Stage selector */}
      <div className="sticky top-[52px] z-10 bg-background/95 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-foreground">🎬 Pipeline</h1>
              <p className="text-xs text-muted-foreground">{total} piece{total !== 1 ? "s" : ""} in production</p>
            </div>
            <button onClick={() => setShowAdd(true)}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm">
              + New
            </button>
          </div>

          {/* Stage stepper */}
          <div className="overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            <div className="flex items-stretch gap-0 min-w-max">
              {STAGES.map((s, idx) => {
                const count = pieces.filter(p => p.status === s.key).length;
                const isActive = s.key === activeStage;
                const activeIdx = STAGES.findIndex(x => x.key === activeStage);
                const isPast = idx < activeIdx;
                return (
                  <div key={s.key} className="flex items-center">
                    <button
                      onClick={() => setActiveStage(s.key)}
                      className={`relative flex flex-col items-center gap-1 px-3.5 py-2 transition-all group min-w-[72px] rounded-xl ${
                        isActive
                          ? "bg-background shadow-sm border border-border/60"
                          : isPast
                          ? "hover:bg-muted/40"
                          : "hover:bg-muted/30"
                      }`}
                    >
                      {/* Stage icon */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all ${
                        isActive ? `${s.bg} ring-1 ring-offset-1 ring-offset-background` : isPast ? "bg-muted/60" : "bg-muted/40"
                      }`}
                        style={isActive ? { ringColor: s.color } : {}}
                      >
                        {isPast && !isActive
                          ? <span className="text-[10px] font-black text-muted-foreground">✓</span>
                          : <span className={isActive ? "" : "opacity-50"}>{s.emoji}</span>
                        }
                      </div>

                      {/* Label */}
                      <span className={`text-[10px] font-bold whitespace-nowrap transition-colors ${
                        isActive ? s.text : isPast ? "text-muted-foreground/60" : "text-muted-foreground/50"
                      }`}>
                        {s.label}
                      </span>

                      {/* Count badge */}
                      {count > 0 && (
                        <span className={`absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-black px-1 ${
                          isActive ? "text-white" : "bg-muted text-muted-foreground"
                        }`}
                          style={isActive ? { backgroundColor: s.color } : {}}
                        >
                          {count}
                        </span>
                      )}

                      {/* Active underline */}
                      {isActive && (
                        <div className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full" style={{ backgroundColor: s.color }} />
                      )}
                    </button>

                    {/* Connector arrow */}
                    {idx < STAGES.length - 1 && (
                      <div className={`w-4 h-px shrink-0 transition-colors ${
                        idx < STAGES.findIndex(x => x.key === activeStage)
                          ? "bg-border/60"
                          : "bg-border/30"
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4">

        {/* Missing table banner */}
        {missingTable && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 p-4 mb-4">
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-1">⚠️ Database setup required</p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mb-2">
              The <code className="bg-amber-100 dark:bg-amber-900/50 rounded px-1">content_pieces</code> table is missing.
              Run the creator SQL migrations in your Supabase dashboard to enable the pipeline.
            </p>
            <p className="text-[11px] text-amber-500/80">
              Go to Supabase → SQL Editor → paste and run the creator schema migration.
            </p>
          </div>
        )}

        {/* Load error */}
        {loadError && (
          <div className="rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200/60 p-4 mb-4">
            <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
          </div>
        )}

        {/* Stage header */}
        <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${stage.bg}`}>
            {stage.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">{stage.label}</p>
            <p className="text-xs text-muted-foreground">
              {stagePieces.length} piece{stagePieces.length !== 1 ? "s" : ""} · Step {STAGES.findIndex(s => s.key === activeStage) + 1} of {STAGES.length}
            </p>
          </div>
          {/* Pipeline mini-progress */}
          <div className="flex gap-0.5 shrink-0">
            {STAGES.map((s, i) => (
              <div key={s.key} className="w-2 h-2 rounded-full transition-all"
                style={{
                  backgroundColor: i <= STAGES.findIndex(x => x.key === activeStage) ? stage.color : undefined,
                  opacity: i <= STAGES.findIndex(x => x.key === activeStage) ? (i === STAGES.findIndex(x => x.key === activeStage) ? 1 : 0.35) : 0.12,
                  backgroundColor: i <= STAGES.findIndex(x => x.key === activeStage) ? stage.color : '#94a3b8',
                } as React.CSSProperties}
              />
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />)}</div>
        ) : stagePieces.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3 opacity-30">{stage.emoji}</div>
            <h3 className="text-base font-bold text-foreground">Nothing here yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-5">
              {activeStage === "idea" ? "Add your first content piece to get started." : "Move pieces here as they progress."}
            </p>
            {activeStage === "idea" && (
              <button onClick={() => setShowAdd(true)}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 active:scale-95 transition-all">
                Add First Piece
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {stagePieces.map(piece => (
              <PieceCard key={piece.id} piece={piece} stage={stage}
                onMove={handleMove} onDelete={handleDelete}
                onScript={(id) => navigate(`/creator/scripts?piece=${id}`)} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button onClick={() => setShowAdd(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground text-2xl shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center z-40">
        +
      </button>

      <AddSheet open={showAdd} onClose={() => setShowAdd(false)} onSave={load} />
    </CreatorLayout>
  );
}
