// =============================================================
// ProductiveDay — Content Pipeline (Advanced v3)
// =============================================================
// 4×2 stage grid overview → tap stage → see pieces
// Tap piece card → Detail Sheet (edit, checklist, AI brief, move)
// AI brief auto-generation per piece
// Stage-specific checklists with progress tracking
// Priority flags, notes, script linking
// =============================================================

import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CreatorLayout } from "@/components/creator/CreatorLayout";
import {
  getContentPipeline, createContentPiece, updateContentPiece,
  moveContentStatus, deleteContentPiece,
} from "@/lib/creator/contentActions";
import { generateBrief } from "@/lib/creator/generateBrief";

// ─── Types ────────────────────────────────────────────────────

interface CheckItem { label: string; done: boolean }

interface ContentPiece {
  id: string;
  title: string;
  content_type: string;
  status: string;
  platforms?: string[];
  planned_date?: string;
  notes?: string;
  description?: string;
  checklist?: CheckItem[];
  tags?: string[];
  priority?: "high" | "medium" | "low";
}

// ─── Config ───────────────────────────────────────────────────

const STAGES = [
  { key: "idea",      label: "Idea",       emoji: "💡", color: "#94a3b8", bg: "bg-slate-100 dark:bg-slate-800",   ring: "ring-slate-300 dark:ring-slate-600",   text: "text-slate-700 dark:text-slate-200" },
  { key: "brief",     label: "Brief",      emoji: "📝", color: "#60a5fa", bg: "bg-blue-100 dark:bg-blue-950",     ring: "ring-blue-300 dark:ring-blue-700",     text: "text-blue-700 dark:text-blue-300" },
  { key: "scripting", label: "Scripting",  emoji: "✍️", color: "#a78bfa", bg: "bg-purple-100 dark:bg-purple-950", ring: "ring-purple-300 dark:ring-purple-700", text: "text-purple-700 dark:text-purple-300" },
  { key: "shooting",  label: "Shooting",   emoji: "🎬", color: "#fb923c", bg: "bg-orange-100 dark:bg-orange-950", ring: "ring-orange-300 dark:ring-orange-700", text: "text-orange-700 dark:text-orange-300" },
  { key: "editing",   label: "Editing",    emoji: "✂️", color: "#facc15", bg: "bg-yellow-100 dark:bg-yellow-950", ring: "ring-yellow-300 dark:ring-yellow-700", text: "text-yellow-700 dark:text-yellow-300" },
  { key: "review",    label: "Review",     emoji: "👀", color: "#f472b6", bg: "bg-pink-100 dark:bg-pink-950",     ring: "ring-pink-300 dark:ring-pink-700",     text: "text-pink-700 dark:text-pink-300" },
  { key: "scheduled", label: "Scheduled",  emoji: "📅", color: "#2dd4bf", bg: "bg-teal-100 dark:bg-teal-950",     ring: "ring-teal-300 dark:ring-teal-700",     text: "text-teal-700 dark:text-teal-300" },
  { key: "published", label: "Published",  emoji: "🚀", color: "#4ade80", bg: "bg-green-100 dark:bg-green-950",   ring: "ring-green-300 dark:ring-green-700",   text: "text-green-700 dark:text-green-300" },
];

const STAGE_CHECKLISTS: Record<string, string[]> = {
  idea:      ["Define target audience", "Research competitors", "Validate concept angle", "Check trending topics"],
  brief:     ["Write hook ideas (3 options)", "Outline key talking points", "Define clear CTA", "Set planned publish date"],
  scripting: ["Write complete script", "Review for clarity & flow", "Add timing notes", "Peer review script"],
  shooting:  ["Prepare & check equipment", "Set up location/backdrop", "Prepare B-roll shot list", "Check lighting & audio"],
  editing:   ["Complete rough cut", "Add graphics & captions", "Color grading done", "Sound mix & music"],
  review:    ["Self-review against brief", "Check audio/video quality", "Final proofread", "Get external feedback"],
  scheduled: ["Upload to platform", "Write SEO description/tags", "Create thumbnail", "Schedule promo posts"],
  published: ["Share across all platforms", "Engage with first comments", "Track 48h analytics", "Document key learnings"],
};

const PRIORITY_CONFIG = {
  high:   { label: "High",   dot: "bg-red-500",    text: "text-red-600 dark:text-red-400",    badge: "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-300" },
  medium: { label: "Medium", dot: "bg-amber-400",  text: "text-amber-600 dark:text-amber-400", badge: "bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-300" },
  low:    { label: "Low",    dot: "bg-slate-400",  text: "text-slate-500 dark:text-slate-400", badge: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" },
};

const CONTENT_TYPES = [
  { key: "video", icon: "🎥" }, { key: "short", icon: "📱" }, { key: "reel", icon: "🎞️" },
  { key: "tiktok", icon: "🎵" }, { key: "blog", icon: "📄" }, { key: "newsletter", icon: "📧" },
  { key: "podcast", icon: "🎙️" }, { key: "tweet", icon: "🐦" }, { key: "carousel", icon: "🖼️" },
  { key: "thread", icon: "🧵" }, { key: "other", icon: "📦" },
];
const PLATFORMS = ["YouTube", "TikTok", "Instagram", "LinkedIn", "Twitter", "Blog", "Newsletter", "Podcast"];

function typeIcon(t: string) { return CONTENT_TYPES.find(c => c.key === t)?.icon || "📦"; }
function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function stageByKey(key: string) { return STAGES.find(s => s.key === key) || STAGES[0]; }

// Merge existing checklist with stage default items (preserve done state)
function mergeChecklist(existing: CheckItem[] | undefined, stageKey: string): CheckItem[] {
  const defaults = STAGE_CHECKLISTS[stageKey] || [];
  if (!existing || existing.length === 0) {
    return defaults.map(label => ({ label, done: false }));
  }
  // Keep existing items (preserve done state), add any new defaults not already present
  const existingLabels = existing.map(i => i.label);
  const merged = [...existing];
  defaults.forEach(label => {
    if (!existingLabels.includes(label)) merged.push({ label, done: false });
  });
  return merged;
}

// ─── Stage Grid ────────────────────────────────────────────────

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
          <button key={s.key} onClick={() => onSelect(s.key)}
            className={`relative flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl border-2 transition-all active:scale-95 ${
              isActive ? `${s.bg} border-transparent ring-2 ${s.ring} shadow-sm` : "bg-card border-border/40 hover:border-border"
            }`}>
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full text-white text-[9px] font-black flex items-center justify-center px-1 shadow-sm"
                style={{ backgroundColor: s.color }}>{count}</span>
            )}
            <span className={`text-xl leading-none ${isActive ? "" : "opacity-55"}`}>{s.emoji}</span>
            <span className={`text-[9px] font-bold leading-none text-center ${isActive ? s.text : "text-muted-foreground"}`}>{s.label}</span>
            {isActive && <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ backgroundColor: s.color }} />}
          </button>
        );
      })}
    </div>
  );
}

// ─── Piece Card ────────────────────────────────────────────────

function PieceCard({ piece, stage, onOpen, onScript }: {
  piece: ContentPiece;
  stage: typeof STAGES[0];
  onOpen: (p: ContentPiece) => void;
  onScript: (id: string) => void;
}) {
  const checklist = piece.checklist || [];
  const doneCount = checklist.filter(i => i.done).length;
  const totalCount = checklist.length;
  const progress = totalCount > 0 ? doneCount / totalCount : 0;
  const priority = piece.priority && PRIORITY_CONFIG[piece.priority];

  return (
    <div onClick={() => onOpen(piece)}
      className="bg-card border border-border/50 rounded-2xl p-4 hover:shadow-md hover:border-border active:scale-[0.99] transition-all cursor-pointer group">

      {/* Priority left bar */}
      {piece.priority && (
        <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-full ${PRIORITY_CONFIG[piece.priority].dot}`} />
      )}

      <div className="flex items-start gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl ${stage.bg} flex items-center justify-center text-lg shrink-0`}>
          {typeIcon(piece.content_type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground leading-snug line-clamp-2 pr-1">{piece.title}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {priority && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${priority.badge}`}>
                {priority.label}
              </span>
            )}
            {piece.platforms && piece.platforms.slice(0, 2).map(p => (
              <span key={p} className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">{p}</span>
            ))}
            {(piece.platforms?.length || 0) > 2 && (
              <span className="text-[9px] text-muted-foreground">+{(piece.platforms?.length || 0) - 2}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {piece.planned_date && (
            <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">📅 {formatDate(piece.planned_date)}</span>
          )}
          <span className="text-muted-foreground group-hover:text-foreground text-xs transition-colors">›</span>
        </div>
      </div>

      {/* Checklist progress */}
      {totalCount > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress * 100}%`, backgroundColor: stage.color }} />
          </div>
          <span className="text-[9px] text-muted-foreground font-medium shrink-0">
            {doneCount}/{totalCount}
          </span>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-2 mt-3">
        <button onClick={e => { e.stopPropagation(); onScript(piece.id); }}
          className={`flex-1 h-8 rounded-xl text-[10px] font-bold transition-all active:scale-95 ${stage.bg} ${stage.text} hover:opacity-80`}>
          ✍️ Script
        </button>
        <button onClick={e => { e.stopPropagation(); onOpen(piece); }}
          className="flex-1 h-8 rounded-xl bg-muted text-muted-foreground text-[10px] font-bold hover:bg-muted/80 active:scale-95 transition-all">
          ⋯ Details
        </button>
      </div>
    </div>
  );
}

// ─── Piece Detail Sheet ────────────────────────────────────────

function PieceDetailSheet({ piece, onClose, onSave, onDelete, onMove, onScript }: {
  piece: ContentPiece;
  onClose: () => void;
  onSave: (updated: ContentPiece) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, status: string) => void;
  onScript: (id: string) => void;
}) {
  const [draft, setDraft] = useState<ContentPiece>({
    ...piece,
    checklist: mergeChecklist(piece.checklist, piece.status),
  });
  const [tab, setTab] = useState<"details" | "checklist" | "move">("details");
  const [generating, setGenerating] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stage = stageByKey(draft.status);

  function update(changes: Partial<ContentPiece>) {
    setDraft(prev => {
      const next = { ...prev, ...changes };
      // Debounced auto-save
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        onSave(next);
      }, 800);
      return next;
    });
  }

  function toggleCheck(i: number) {
    const checklist = draft.checklist ? [...draft.checklist] : [];
    checklist[i] = { ...checklist[i], done: !checklist[i].done };
    update({ checklist });
  }

  async function handleGenerateBrief() {
    setGenerating(true); setBriefError(null);
    const { data, error } = await generateBrief({
      title: draft.title,
      content_type: draft.content_type,
      platforms: draft.platforms || [],
      existing_notes: draft.notes,
    });
    if (error) { setBriefError(error); setGenerating(false); return; }
    if (data) {
      update({ notes: data.notes, description: data.angle });
      setTab("details");
    }
    setGenerating(false);
  }

  async function handleManualSave() {
    setSaving(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    await onSave(draft);
    setSaving(false);
  }

  const checkDone = (draft.checklist || []).filter(i => i.done).length;
  const checkTotal = (draft.checklist || []).length;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-background rounded-t-3xl flex flex-col overflow-hidden"
        style={{ maxHeight: "92vh" }} onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div className="flex justify-center pt-3 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Header */}
        <div className={`flex items-start gap-3 px-5 pt-3 pb-3 shrink-0 border-b border-border/30`}>
          <div className={`w-10 h-10 rounded-xl ${stage.bg} flex items-center justify-center text-lg shrink-0`}>
            {typeIcon(draft.content_type)}
          </div>
          <div className="flex-1 min-w-0">
            <input
              value={draft.title}
              onChange={e => update({ title: e.target.value })}
              className="w-full text-base font-bold text-foreground bg-transparent focus:outline-none leading-tight"
              placeholder="Content title"
            />
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${stage.bg} ${stage.text}`}>
                {stage.emoji} {stage.label}
              </span>
              {checkTotal > 0 && (
                <span className="text-[10px] text-muted-foreground">{checkDone}/{checkTotal} tasks</span>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={handleManualSave} disabled={saving}
              className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50">
              {saving ? "…" : "Save"}
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0 border-b border-border/30 shrink-0 px-5">
          {[
            { key: "details",   label: "Details" },
            { key: "checklist", label: `Checklist ${checkTotal > 0 ? `(${checkDone}/${checkTotal})` : ""}` },
            { key: "move",      label: "Stage" },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className={`flex-1 py-2.5 text-xs font-bold transition-colors border-b-2 ${
                tab === t.key ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="overflow-y-auto flex-1 min-h-0">

          {/* ── Details tab ── */}
          {tab === "details" && (
            <div className="px-5 py-4 space-y-5">

              {/* Priority */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Priority</label>
                <div className="flex gap-2">
                  {(["high", "medium", "low"] as const).map(p => (
                    <button key={p} onClick={() => update({ priority: p })}
                      className={`flex-1 h-9 rounded-xl text-xs font-bold capitalize transition-all active:scale-95 ${
                        draft.priority === p
                          ? PRIORITY_CONFIG[p].badge
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}>
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${draft.priority === p ? PRIORITY_CONFIG[p].dot : "bg-muted-foreground/40"}`} />
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content type */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Content Type</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {CONTENT_TYPES.map(t => (
                    <button key={t.key} onClick={() => update({ content_type: t.key })}
                      className={`flex flex-col items-center gap-1 py-2 rounded-xl text-[9px] font-bold capitalize transition-all active:scale-95 ${
                        draft.content_type === t.key ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"
                      }`}>
                      <span className="text-base">{t.icon}</span>
                      <span>{t.key}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Platforms */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <button key={p} onClick={() => update({
                      platforms: (draft.platforms || []).includes(p)
                        ? (draft.platforms || []).filter(x => x !== p)
                        : [...(draft.platforms || []), p]
                    })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                        (draft.platforms || []).includes(p) ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"
                      }`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Planned date */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Planned Date</label>
                <input type="date" value={draft.planned_date || ""}
                  onChange={e => update({ planned_date: e.target.value || undefined })}
                  className="w-full bg-muted/50 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 border border-transparent focus:border-primary/20" />
              </div>

              {/* Notes / Brief */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Notes & Brief</label>
                  <button onClick={handleGenerateBrief} disabled={generating}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-primary text-white text-[10px] font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50">
                    {generating
                      ? <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> Generating…</>
                      : "✨ AI Brief"
                    }
                  </button>
                </div>
                {briefError && (
                  <p className="text-xs text-red-500 dark:text-red-400 mb-2 bg-red-50 dark:bg-red-950/30 rounded-lg p-2">{briefError}</p>
                )}
                <textarea value={draft.notes || ""} onChange={e => update({ notes: e.target.value })}
                  rows={8} placeholder="Add notes, brief, research links… or tap ✨ AI Brief to generate one automatically"
                  className="w-full bg-muted/40 rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none border border-transparent focus:border-primary/20 leading-relaxed" />
              </div>

              {/* Danger */}
              <div className="pt-2 pb-4 border-t border-border/30">
                <button onClick={() => { onClose(); onDelete(piece.id); }}
                  className="w-full h-10 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 active:scale-95 transition-all">
                  Delete this piece
                </button>
              </div>
            </div>
          )}

          {/* ── Checklist tab ── */}
          {tab === "checklist" && (
            <div className="px-5 py-4 space-y-3">
              <p className="text-xs text-muted-foreground">Stage checklist for <span className="font-bold text-foreground">{stage.label}</span>. Items auto-populate for each stage.</p>

              {(draft.checklist || []).map((item, i) => (
                <button key={i} onClick={() => toggleCheck(i)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all active:scale-[0.99] border ${
                    item.done
                      ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/30"
                      : "bg-card border-border/40 hover:border-border"
                  }`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    item.done ? "bg-emerald-500 border-emerald-500" : "border-border"
                  }`}>
                    {item.done && <span className="text-white text-[10px] font-black">✓</span>}
                  </div>
                  <span className={`text-sm font-medium flex-1 ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {item.label}
                  </span>
                </button>
              ))}

              {/* Progress summary */}
              {checkTotal > 0 && (
                <div className="pt-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-muted-foreground">{checkDone} of {checkTotal} complete</span>
                    <span className="text-xs font-bold text-foreground">{Math.round((checkDone / checkTotal) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${(checkDone / checkTotal) * 100}%` }} />
                  </div>
                  {checkDone === checkTotal && checkTotal > 0 && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-2 text-center">
                      ✓ All tasks complete — ready to move to next stage!
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Move stage tab ── */}
          {tab === "move" && (
            <div className="px-5 py-4 space-y-2.5">
              <p className="text-xs text-muted-foreground mb-3">Move this piece to a different stage:</p>
              {STAGES.map(s => {
                const isCurrent = s.key === piece.status;
                return (
                  <button key={s.key}
                    onClick={() => { if (!isCurrent) { onMove(piece.id, s.key); onClose(); } }}
                    disabled={isCurrent}
                    className={`w-full flex items-center gap-3 h-12 px-4 rounded-xl transition-all active:scale-[0.99] ${
                      isCurrent
                        ? `${s.bg} border-2 border-transparent ring-2 ${s.ring} cursor-default`
                        : `bg-card border border-border/40 hover:border-border`
                    }`}>
                    <span className="text-base">{s.emoji}</span>
                    <span className={`text-sm font-bold flex-1 text-left ${isCurrent ? s.text : "text-foreground"}`}>{s.label}</span>
                    {isCurrent && <span className="text-[10px] font-bold text-muted-foreground">Current</span>}
                  </button>
                );
              })}

              {/* Script quick-link */}
              <div className="pt-3 border-t border-border/30">
                <button onClick={() => { onScript(piece.id); onClose(); }}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-600/10 to-primary/10 border border-purple-200/50 dark:border-purple-800/50 text-primary text-sm font-bold hover:opacity-80 active:scale-95 transition-all">
                  ✍️ Open / Create Script
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ height: "env(safe-area-inset-bottom, 8px)" }} />
      </div>
    </div>
  );
}

// ─── Add Sheet ─────────────────────────────────────────────────

function AddSheet({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("video");
  const [plats, setPlats] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setTitle(""); setType("video"); setPlats([]); setDate(""); setPriority("medium"); }
  }, [open]);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    await createContentPiece({
      title: title.trim(), content_type: type, status: "idea",
      platforms: plats.length ? plats : undefined,
      planned_date: date || undefined,
      checklist: STAGE_CHECKLISTS["idea"].map(label => ({ label, done: false })),
      priority,
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
          <h2 className="text-lg font-bold text-foreground">🎬 New Content Piece</h2>
          <p className="text-xs text-muted-foreground">It'll start in the Idea stage with a pre-filled checklist</p>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 px-5 space-y-5 pb-2">
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="What are you creating?"
            className="w-full text-base font-bold bg-transparent border-b-2 border-border focus:border-primary pb-2 text-foreground placeholder:text-muted-foreground/40 focus:outline-none transition-colors" />

          {/* Priority */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Priority</label>
            <div className="flex gap-2">
              {(["high", "medium", "low"] as const).map(p => (
                <button key={p} onClick={() => setPriority(p)}
                  className={`flex-1 h-9 rounded-xl text-xs font-bold capitalize transition-all active:scale-95 ${
                    priority === p ? PRIORITY_CONFIG[p].badge : "bg-muted text-muted-foreground"
                  }`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Content type */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Content Type</label>
            <div className="grid grid-cols-4 gap-2">
              {CONTENT_TYPES.map(t => (
                <button key={t.key} onClick={() => setType(t.key)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-[9px] font-bold capitalize transition-all active:scale-95 ${
                    type === t.key ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"
                  }`}>
                  <span className="text-lg">{t.icon}</span>
                  <span>{t.key}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Platforms */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => setPlats(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                    plats.includes(p) ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"
                  }`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Planned Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full bg-muted/50 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 border border-transparent focus:border-primary/20" />
          </div>
        </div>

        <div className="px-5 pt-3 pb-4 border-t border-border/30 shrink-0 bg-background"
          style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
          <button onClick={handleSave} disabled={!title.trim() || saving}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 shadow-sm">
            {saving ? "Creating…" : "Add to Pipeline →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────

export default function ContentPipeline() {
  const navigate = useNavigate();
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState("idea");
  const [showAdd, setShowAdd] = useState(false);
  const [detailPiece, setDetailPiece] = useState<ContentPiece | null>(null);
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
    // Merge new stage default checklist into existing
    setPieces(prev => prev.map(p => {
      if (p.id !== id) return p;
      return {
        ...p, status,
        checklist: mergeChecklist(p.checklist, status),
      };
    }));
    await moveContentStatus(id, status);
    await updateContentPiece(id, {
      checklist: mergeChecklist(
        pieces.find(p => p.id === id)?.checklist,
        status
      ),
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this content piece?")) return;
    setPieces(prev => prev.filter(p => p.id !== id));
    await deleteContentPiece(id);
  }

  async function handleSave(updated: ContentPiece) {
    setPieces(prev => prev.map(p => p.id === updated.id ? updated : p));
    // Also update detailPiece if open
    if (detailPiece?.id === updated.id) setDetailPiece(updated);
    await updateContentPiece(updated.id, {
      title: updated.title,
      content_type: updated.content_type,
      platforms: updated.platforms,
      planned_date: updated.planned_date,
      notes: updated.notes,
      description: updated.description,
      checklist: updated.checklist,
      tags: updated.tags,
      priority: updated.priority,
    });
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
            <h1 className="text-base font-bold text-foreground">🎬 Pipeline</h1>
            <p className="text-xs text-muted-foreground">{total} in production · {published} published</p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm">
            + New
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 pb-6">

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

        {/* Stage Grid */}
        <div className="mb-4">
          <StageGrid pieces={pieces} activeStage={activeStage} onSelect={setActiveStage} />
        </div>

        {/* Active stage banner */}
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl mb-4 border border-transparent ${stage.bg}`}>
          <span className="text-xl">{stage.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${stage.text}`}>{stage.label}</p>
            <p className="text-[10px] text-muted-foreground">{stagePieces.length} piece{stagePieces.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ backgroundColor: stage.color }} />
        </div>

        {/* Pieces */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : stagePieces.length === 0 ? (
          <div className="text-center py-14">
            <div className="text-5xl mb-3 opacity-20">{stage.emoji}</div>
            <h3 className="text-base font-bold text-foreground mb-1">Nothing in {stage.label}</h3>
            <p className="text-sm text-muted-foreground mb-5">
              {activeStage === "idea" ? "Add your first piece to start tracking." : "Move pieces here as they progress."}
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
            {/* Sort: high priority first */}
            {[...stagePieces]
              .sort((a, b) => {
                const order = { high: 0, medium: 1, low: 2 };
                return (order[a.priority || "medium"] ?? 1) - (order[b.priority || "medium"] ?? 1);
              })
              .map(piece => (
                <div key={piece.id} className="relative">
                  {/* Priority bar */}
                  {piece.priority && (
                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${PRIORITY_CONFIG[piece.priority].dot}`} />
                  )}
                  <div className={piece.priority ? "pl-2" : ""}>
                    <PieceCard
                      piece={piece}
                      stage={stage}
                      onOpen={p => setDetailPiece(p)}
                      onScript={id => navigate(`/creator/scripts?piece=${id}`)}
                    />
                  </div>
                </div>
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

      {detailPiece && (
        <PieceDetailSheet
          piece={detailPiece}
          onClose={() => setDetailPiece(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          onMove={handleMove}
          onScript={id => navigate(`/creator/scripts?piece=${id}`)}
        />
      )}
    </CreatorLayout>
  );
}
