// =============================================================
// ProductiveDay — Content Pipeline (No-Scroll Stage Grid)
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
  { key: "idea",      label: "Idea",       emoji: "💡", color: "#94a3b8", bg: "bg-slate-100 dark:bg-slate-800",    ring: "ring-slate-300 dark:ring-slate-600",    text: "text-slate-700 dark:text-slate-200" },
  { key: "brief",     label: "Brief",      emoji: "📝", color: "#60a5fa", bg: "bg-blue-100 dark:bg-blue-950",      ring: "ring-blue-300 dark:ring-blue-700",      text: "text-blue-700 dark:text-blue-300" },
  { key: "scripting", label: "Scripting",  emoji: "✍️", color: "#a78bfa", bg: "bg-purple-100 dark:bg-purple-950",  ring: "ring-purple-300 dark:ring-purple-700",  text: "text-purple-700 dark:text-purple-300" },
  { key: "shooting",  label: "Shooting",   emoji: "🎬", color: "#fb923c", bg: "bg-orange-100 dark:bg-orange-950",  ring: "ring-orange-300 dark:ring-orange-700",  text: "text-orange-700 dark:text-orange-300" },
  { key: "editing",   label: "Editing",    emoji: "✂️", color: "#facc15", bg: "bg-yellow-100 dark:bg-yellow-950",  ring: "ring-yellow-300 dark:ring-yellow-700",  text: "text-yellow-700 dark:text-yellow-300" },
  { key: "review",    label: "Review",     emoji: "👀", color: "#f472b6", bg: "bg-pink-100 dark:bg-pink-950",      ring: "ring-pink-300 dark:ring-pink-700",      text: "text-pink-700 dark:text-pink-300" },
  { key: "scheduled", label: "Scheduled",  emoji: "📅", color: "#2dd4bf", bg: "bg-teal-100 dark:bg-teal-950",      ring: "ring-teal-300 dark:ring-teal-700",      text: "text-teal-700 dark:text-teal-300" },
  { key: "published", label: "Published",  emoji: "🚀", color: "#4ade80", bg: "bg-green-100 dark:bg-green-950",    ring: "ring-green-300 dark:ring-green-700",    text: "text-green-700 dark:text-green-300" },
];

const CONTENT_TYPES = [
  { key: "video", icon: "🎥" }, { key: "short", icon: "📱" }, { key: "reel", icon: "🎞️" },
  { key: "tiktok", icon: "🎵" }, { key: "blog", icon: "📄" }, { key: "newsletter", icon: "📧" },
  { key: "podcast", icon: "🎙️" }, { key: "tweet", icon: "🐦" }, { key: "carousel", icon: "🖼️" },
  { key: "thread", icon: "🧵" }, { key: "other", icon: "📦" },
];
const PLATFORMS = ["YouTube","TikTok","Instagram","LinkedIn","Twitter","Blog","Newsletter","Podcast"];

function typeIcon(t: string) { return CONTENT_TYPES.find(c => c.key === t)?.icon || "📦"; }
function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Stage Grid Overview ────────────────────────────────────
function StageGrid({ pieces, activeStage, onSelect }: {
  pieces: ContentPiece[];
  activeStage: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {STAGES.map(s => {
        const count = pieces.filter(p => p.status === s.key).length;
        const isActive = s.key === activeStage;

        return (
          <button
            key={s.key}
            onClick={() => onSelect(s.key)}
            className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border-2 transition-all active:scale-95 ${
              isActive
                ? `${s.bg} border-transparent ring-2 ${s.ring} shadow-sm`
                : "bg-card border-border/40 hover:border-border"
            }`}
          >
            {/* Count badge */}
            {count > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full text-white text-[9px] font-black flex items-center justify-center px-1 shadow-sm"
                style={{ backgroundColor: s.color }}
              >
                {count}
              </span>
            )}

            {/* Emoji icon */}
            <span className={`text-xl leading-none transition-all ${isActive ? "" : "opacity-60"}`}>
              {s.emoji}
            </span>

            {/* Label */}
            <span className={`text-[9px] font-bold leading-none text-center transition-colors ${
              isActive ? s.text : "text-muted-foreground"
            }`}>
              {s.label}
            </span>

            {/* Active indicator dot */}
            {isActive && (
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                style={{ backgroundColor: s.color }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Piece Card ─────────────────────────────────────────────
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
      <div className="bg-card border border-border/50 rounded-2xl p-4 hover:shadow-sm hover:border-border transition-all">
        {/* Top row */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-9 h-9 rounded-xl ${stage.bg} flex items-center justify-center text-base shrink-0`}>
            {typeIcon(piece.content_type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground leading-snug line-clamp-2">{piece.title}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md capitalize ${stage.bg} ${stage.text}`}>
                {piece.content_type}
              </span>
              {piece.planned_date && (
                <span className="text-[10px] text-muted-foreground">📅 {formatDate(piece.planned_date)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Platforms */}
        {piece.platforms && piece.platforms.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {piece.platforms.map(p => (
              <span key={p} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">{p}</span>
            ))}
          </div>
        )}

        {/* Action row */}
        <div className="flex gap-2">
          <button onClick={() => onScript(piece.id)}
            className={`flex-1 h-9 rounded-xl text-[11px] font-bold transition-all active:scale-95 ${stage.bg} ${stage.text} hover:opacity-80`}>
            ✍️ Script
          </button>
          <button onClick={() => setShowMoveMenu(true)}
            className="flex-1 h-9 rounded-xl bg-muted text-muted-foreground text-[11px] font-bold hover:bg-muted/80 active:scale-95 transition-all">
            ↕ Move
          </button>
          <button onClick={() => { if (confirm("Delete this piece?")) onDelete(piece.id); }}
            className="w-9 h-9 rounded-xl bg-muted text-muted-foreground text-sm hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 active:scale-95 transition-all flex items-center justify-center">
            ✕
          </button>
        </div>
      </div>

      {/* Move bottom sheet */}
      {showMoveMenu && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowMoveMenu(false)}>
          <div className="bg-background rounded-t-3xl w-full max-w-lg pb-safe" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
            </div>
            <div className="px-5 pt-2 pb-4">
              <p className="text-sm font-bold text-foreground mb-3">Move "{piece.title.slice(0, 30)}{piece.title.length > 30 ? '…' : ''}" to…</p>
              <div className="grid grid-cols-2 gap-2">
                {others.map(s => (
                  <button key={s.key}
                    onClick={() => { onMove(piece.id, s.key); setShowMoveMenu(false); }}
                    className={`h-12 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${s.bg} ${s.text}`}>
                    <span>{s.emoji}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ height: "env(safe-area-inset-bottom, 8px)" }} />
          </div>
        </div>
      )}
    </>
  );
}

// ── Add Sheet ──────────────────────────────────────────────
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
    await createContentPiece({
      title: title.trim(), content_type: type, status: "idea",
      platforms: plats.length ? plats : undefined,
      planned_date: date || undefined,
    });
    setSaving(false);
    onSave(); onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-background rounded-t-3xl flex flex-col overflow-hidden"
        style={{ maxHeight: "88vh" }} onClick={e => e.stopPropagation()}>

        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        <div className="px-5 pb-3 shrink-0">
          <h2 className="text-lg font-bold text-foreground">🎬 New Content</h2>
          <p className="text-xs text-muted-foreground">Add a new piece to your pipeline</p>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 px-5 space-y-5 pb-2">
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="What are you creating?"
            className="w-full text-base font-semibold bg-transparent border-b-2 border-border focus:border-primary pb-2 text-foreground placeholder:text-muted-foreground/40 focus:outline-none transition-colors" />

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2.5">Content Type</label>
            <div className="grid grid-cols-4 gap-2">
              {CONTENT_TYPES.map(t => (
                <button key={t.key} type="button" onClick={() => setType(t.key)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 capitalize ${type === t.key ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"}`}>
                  <span className="text-base">{t.icon}</span>
                  <span className="text-[9px]">{t.key}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2.5">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button key={p} type="button"
                  onClick={() => setPlats(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${plats.includes(p) ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2.5">Planned Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full bg-muted/50 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 border border-transparent focus:border-primary/20" />
          </div>
        </div>

        <div className="px-5 pt-3 pb-4 border-t border-border/30 shrink-0 bg-background"
          style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
          <button onClick={handleSave} disabled={!title.trim() || saving}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 shadow-sm">
            {saving ? "Adding…" : "Add to Pipeline →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
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
  const published = pieces.filter(p => p.status === "published").length;

  return (
    <CreatorLayout>
      {/* Header */}
      <div className="sticky top-[52px] z-10 bg-background/95 backdrop-blur-xl border-b border-border/40 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-foreground flex items-center gap-1.5">
              🎬 Pipeline
            </h1>
            <p className="text-xs text-muted-foreground">
              {total} in production · {published} published
            </p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm">
            + New
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 pb-4">

        {/* Error banners */}
        {missingTable && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 p-4 mb-4">
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-1">⚠️ Database setup required</p>
            <p className="text-xs text-amber-600 dark:text-amber-500">
              The <code className="bg-amber-100 dark:bg-amber-900/50 rounded px-1">content_pieces</code> table is missing.
              Run the creator SQL migrations in Supabase → SQL Editor.
            </p>
          </div>
        )}
        {loadError && (
          <div className="rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200/60 p-4 mb-4">
            <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
          </div>
        )}

        {/* ── Stage Grid — all 8 stages visible, no scrolling ── */}
        <div className="mb-4">
          <StageGrid pieces={pieces} activeStage={activeStage} onSelect={setActiveStage} />
        </div>

        {/* Active stage header */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl mb-4 border border-transparent ${stage.bg}`}>
          <span className="text-2xl">{stage.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${stage.text}`}>{stage.label}</p>
            <p className="text-xs text-muted-foreground">
              {stagePieces.length} piece{stagePieces.length !== 1 ? "s" : ""} here
            </p>
          </div>
          <div className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ backgroundColor: stage.color }} />
        </div>

        {/* Content list */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : stagePieces.length === 0 ? (
          <div className="text-center py-14 px-6">
            <div className="text-5xl mb-3 opacity-25">{stage.emoji}</div>
            <h3 className="text-base font-bold text-foreground mb-1">Nothing in {stage.label}</h3>
            <p className="text-sm text-muted-foreground mb-5">
              {activeStage === "idea"
                ? "Add your first content piece to get started."
                : "Move pieces into this stage as they progress."}
            </p>
            {activeStage === "idea" && (
              <button onClick={() => setShowAdd(true)}
                className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm">
                Add First Piece
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {stagePieces.map(piece => (
              <PieceCard key={piece.id} piece={piece} stage={stage}
                onMove={handleMove} onDelete={handleDelete}
                onScript={id => navigate(`/creator/scripts?piece=${id}`)} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button onClick={() => setShowAdd(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-2xl bg-primary text-primary-foreground text-2xl shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center z-40 font-bold">
        +
      </button>

      <AddSheet open={showAdd} onClose={() => setShowAdd(false)} onSave={load} />
    </CreatorLayout>
  );
}
