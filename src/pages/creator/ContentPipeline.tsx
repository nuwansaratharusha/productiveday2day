// =============================================================
// ProductiveDay — Content Pipeline Kanban
// Drag-free tap-to-move status board with add content sheet
// =============================================================

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getContentPipeline,
  createContentPiece,
  moveContentStatus,
  deleteContentPiece,
} from "@/lib/creator/contentActions";

interface ContentPiece {
  id: string;
  title: string;
  content_type: string;
  status: string;
  platforms?: string[];
  planned_date?: string;
  tags?: string[];
  notes?: string;
}

const STATUSES = [
  { key: "idea",       label: "💡 Idea",       color: "text-slate-500",   headerBg: "bg-slate-100 dark:bg-slate-800" },
  { key: "brief",      label: "📝 Brief",      color: "text-blue-500",    headerBg: "bg-blue-50 dark:bg-blue-950" },
  { key: "scripting",  label: "✍️ Scripting",  color: "text-purple-500",  headerBg: "bg-purple-50 dark:bg-purple-950" },
  { key: "shooting",   label: "🎬 Shooting",   color: "text-orange-500",  headerBg: "bg-orange-50 dark:bg-orange-950" },
  { key: "editing",    label: "✂️ Editing",    color: "text-yellow-500",  headerBg: "bg-yellow-50 dark:bg-yellow-950" },
  { key: "review",     label: "👀 Review",     color: "text-pink-500",    headerBg: "bg-pink-50 dark:bg-pink-950" },
  { key: "scheduled",  label: "📅 Scheduled",  color: "text-teal-500",    headerBg: "bg-teal-50 dark:bg-teal-950" },
  { key: "published",  label: "🚀 Published",  color: "text-green-500",   headerBg: "bg-green-50 dark:bg-green-950" },
];

const CONTENT_TYPES = ["video","short","reel","tiktok","blog","newsletter","podcast","tweet","carousel","thread","other"];
const PLATFORMS = ["YouTube","TikTok","Instagram","LinkedIn","Twitter","Blog","Newsletter","Podcast"];

const TYPE_ICONS: Record<string, string> = {
  video:"🎥",short:"📱",reel:"🎞️",tiktok:"🎵",blog:"📄",
  newsletter:"📧",podcast:"🎙️",tweet:"🐦",carousel:"🖼️",thread:"🧵",other:"📦",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric"});
}

function MoveMenu({
  currentStatus,
  onMove,
  onClose,
}: {
  currentStatus: string;
  onMove: (s: string) => void;
  onClose: () => void;
}) {
  const others = STATUSES.filter(s => s.key !== currentStatus);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-background rounded-t-3xl border-t border-border/50 w-full max-w-lg p-5 pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Move to stage</h3>
        <div className="grid grid-cols-2 gap-2">
          {others.map(s => (
            <button
              key={s.key}
              onClick={() => { onMove(s.key); onClose(); }}
              className={`py-2.5 rounded-xl text-sm font-semibold ${s.headerBg} ${s.color} hover:opacity-90 active:scale-95 transition-all`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PieceCard({
  piece,
  onMove,
  onDelete,
  onOpenScript,
}: {
  piece: ContentPiece;
  onMove: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenScript: (id: string) => void;
}) {
  return (
    <div className="bg-card border border-border/50 rounded-xl p-3 space-y-2 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-2">
        <span className="text-lg shrink-0">{TYPE_ICONS[piece.content_type] || "📦"}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{piece.title}</p>
          {piece.planned_date && (
            <p className="text-[10px] text-muted-foreground mt-0.5">📅 {formatDate(piece.planned_date)}</p>
          )}
        </div>
      </div>

      {piece.platforms && piece.platforms.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {piece.platforms.map(p => (
            <span key={p} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{p}</span>
          ))}
        </div>
      )}

      <div className="flex gap-1.5 pt-0.5">
        <button
          onClick={() => onOpenScript(piece.id)}
          className="flex-1 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-300 text-[10px] font-semibold hover:opacity-90 transition-all"
        >
          ✍️ Script
        </button>
        <button
          onClick={() => onMove(piece.id)}
          className="flex-1 py-1.5 rounded-lg bg-muted text-muted-foreground text-[10px] font-semibold hover:bg-muted/80 transition-all"
        >
          ↕ Move
        </button>
        <button
          onClick={() => onDelete(piece.id)}
          className="py-1.5 px-2 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-400 text-[10px] hover:opacity-90 transition-all"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

function AddContentSheet({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState("video");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [plannedDate, setPlannedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setTitle(""); setContentType("video"); setSelectedPlatforms([]); setPlannedDate(""); setNotes(""); }
  }, [open]);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    await createContentPiece({
      title: title.trim(),
      content_type: contentType,
      status: "idea",
      platforms: selectedPlatforms.length ? selectedPlatforms : undefined,
      planned_date: plannedDate || undefined,
      notes: notes.trim() || undefined,
    });
    setSaving(false);
    onSave();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-background rounded-t-3xl border-t border-border/50 flex flex-col"
        style={{ maxHeight: "90dvh" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-2 space-y-4">
          <h2 className="text-lg font-bold text-foreground pt-2">🎬 New Content</h2>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What are you creating?"
              className="w-full bg-muted/50 border border-border/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Content Type</label>
            <div className="flex flex-wrap gap-2">
              {CONTENT_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setContentType(t)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1 ${
                    contentType === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {TYPE_ICONS[t]} {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPlatforms(prev =>
                    prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
                  )}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    selectedPlatforms.includes(p) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Planned Date</label>
            <input
              type="date"
              value={plannedDate}
              onChange={e => setPlannedDate(e.target.value)}
              className="w-full bg-muted/50 border border-border/50 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Brief description, angle, references..."
              rows={3}
              className="w-full bg-muted/50 border border-border/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border/30 shrink-0">
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? "Adding..." : "🎬 Add to Pipeline"}
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
  const [activeColumn, setActiveColumn] = useState("idea");
  const [movingPiece, setMovingPiece] = useState<{ id: string; status: string } | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await getContentPipeline();
    if (data) setPieces(data as ContentPiece[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleMove(id: string, newStatus: string) {
    setPieces(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    await moveContentStatus(id, newStatus);
  }

  async function handleDelete(id: string) {
    setPieces(prev => prev.filter(p => p.id !== id));
    await deleteContentPiece(id);
  }

  const columnPieces = (status: string) => pieces.filter(p => p.status === status);

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">🎬 Content Pipeline</h1>
            <p className="text-xs text-muted-foreground">{pieces.length} pieces in production</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
          >
            + New
          </button>
        </div>

        {/* Stage tabs */}
        <div className="px-4 pb-3 max-w-2xl mx-auto">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {STATUSES.map(s => {
              const count = columnPieces(s.key).length;
              return (
                <button
                  key={s.key}
                  onClick={() => setActiveColumn(s.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    activeColumn === s.key
                      ? `${s.headerBg} ${s.color}`
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s.label}
                  {count > 0 && (
                    <span className="bg-current/20 rounded-full px-1.5 py-0.5 text-[10px]">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Current column */}
            {(() => {
              const current = STATUSES.find(s => s.key === activeColumn)!;
              const items = columnPieces(activeColumn);
              return (
                <div>
                  <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${current.headerBg} mb-3`}>
                    <span className={`text-sm font-semibold ${current.color}`}>{current.label}</span>
                    <span className={`text-xs font-bold ${current.color}`}>{items.length}</span>
                  </div>

                  {items.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-2 opacity-40">📭</div>
                      <p className="text-sm text-muted-foreground">No content in this stage</p>
                      {activeColumn === "idea" && (
                        <button
                          onClick={() => setShowAdd(true)}
                          className="mt-3 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
                        >
                          Add first piece
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {items.map(piece => (
                        <PieceCard
                          key={piece.id}
                          piece={piece}
                          onMove={(id) => setMovingPiece({ id, status: piece.status })}
                          onDelete={handleDelete}
                          onOpenScript={(id) => navigate(`/creator/scripts?piece=${id}`)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground text-2xl shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center z-40"
      >
        +
      </button>

      {/* Move menu */}
      {movingPiece && (
        <MoveMenu
          currentStatus={movingPiece.status}
          onMove={(newStatus) => handleMove(movingPiece.id, newStatus)}
          onClose={() => setMovingPiece(null)}
        />
      )}

      <AddContentSheet open={showAdd} onClose={() => setShowAdd(false)} onSave={load} />
    </div>
  );
}
