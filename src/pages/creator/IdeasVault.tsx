// =============================================================
// ProductiveDay — Ideas Vault (Redesigned)
// =============================================================

import { useEffect, useState, useCallback, useRef } from "react";
import { CreatorLayout } from "@/components/creator/CreatorLayout";
import { getIdeas, captureIdea, updateIdea, deleteIdea, promoteIdea } from "@/lib/creator/contentActions";

interface Idea {
  id: string; title: string; body?: string; source?: string;
  tags?: string[]; platforms?: string[]; rating?: number;
  status: string; created_at: string;
}

const PLATFORMS = ["YouTube","TikTok","Instagram","LinkedIn","Twitter","Blog","Newsletter","Podcast"];

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  captured:    { label: "Captured",    dot: "bg-slate-400",  badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  researching: { label: "Researching", dot: "bg-blue-400",   badge: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300" },
  ready:       { label: "Ready",       dot: "bg-green-400",  badge: "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-300" },
  promoted:    { label: "Promoted",    dot: "bg-purple-400", badge: "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-300" },
  discarded:   { label: "Discarded",   dot: "bg-red-400",    badge: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300" },
};

const TABS = [
  { key: "all", label: "All" },
  { key: "captured", label: "New" },
  { key: "researching", label: "Researching" },
  { key: "ready", label: "Ready" },
  { key: "promoted", label: "Promoted" },
];

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button" onClick={() => onChange?.(s)}
          className={`text-base transition-all hover:scale-110 ${s <= value ? "text-amber-400" : "text-border"}`}>★</button>
      ))}
    </div>
  );
}

function IdeaCard({ idea, onPromote, onDelete, onStatusChange }: {
  idea: Idea;
  onPromote: (id: string) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const cfg = STATUS_CONFIG[idea.status] || STATUS_CONFIG.captured;

  async function handlePromote() {
    setPromoting(true);
    await onPromote(idea.id);
    setPromoting(false);
  }

  return (
    <div className={`rounded-2xl bg-card border transition-all duration-200 ${open ? "border-primary/30 shadow-sm" : "border-border/50 hover:border-border"}`}>
      <button className="w-full text-left p-4" onClick={() => setOpen(!open)}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
              {(idea.rating || 0) > 0 && <Stars value={idea.rating || 0} />}
            </div>
            <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{idea.title}</p>
            {idea.platforms && idea.platforms.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {idea.platforms.map(p => (
                  <span key={p} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md font-medium">{p}</span>
                ))}
              </div>
            )}
          </div>
          <span className={`text-muted-foreground text-sm transition-transform mt-0.5 shrink-0 ${open ? "rotate-180" : ""}`}>›</span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
          {idea.body && <p className="text-sm text-muted-foreground leading-relaxed">{idea.body}</p>}

          {idea.tags && idea.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {idea.tags.map(t => (
                <span key={t} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">#{t}</span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 pt-1">
            {idea.status !== "promoted" && (
              <button onClick={handlePromote} disabled={promoting}
                className="col-span-2 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-60">
                {promoting ? "Moving..." : "🚀 Send to Pipeline"}
              </button>
            )}
            {idea.status === "captured" && (
              <button onClick={() => onStatusChange(idea.id, "researching")}
                className="py-2 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 text-xs font-semibold hover:opacity-90 active:scale-95 transition-all">
                Research
              </button>
            )}
            {idea.status === "researching" && (
              <button onClick={() => onStatusChange(idea.id, "ready")}
                className="py-2 rounded-xl bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-300 text-xs font-semibold hover:opacity-90 active:scale-95 transition-all">
                Mark Ready
              </button>
            )}
            {idea.status === "promoted" && <div className="col-span-2" />}
            <button onClick={() => onDelete(idea.id)}
              className="py-2 rounded-xl bg-muted text-muted-foreground text-xs font-semibold hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 transition-all">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CaptureSheet({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(0);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle(""); setBody(""); setRating(0); setPlatforms([]); setTags("");
      setTimeout(() => ref.current?.focus(), 80);
    }
  }, [open]);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    await captureIdea({
      title: title.trim(),
      body: body.trim() || undefined,
      rating: rating || undefined,
      platforms: platforms.length ? platforms : undefined,
      tags: tags.trim() ? tags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
    });
    setSaving(false);
    onSave();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-background rounded-t-3xl flex flex-col" style={{ maxHeight: "92dvh" }} onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        <div className="px-5 pb-2 shrink-0">
          <h2 className="text-lg font-bold text-foreground">💡 New Idea</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Capture it before it slips away</p>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {/* Title */}
          <div>
            <input ref={ref} value={title} onChange={e => setTitle(e.target.value)} placeholder="What's the idea?"
              className="w-full text-base font-semibold bg-transparent border-b-2 border-border focus:border-primary pb-2 text-foreground placeholder:text-muted-foreground/40 focus:outline-none transition-colors" />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">Notes</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Angle, references, why this works..." rows={3}
              className="w-full bg-muted/40 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none border border-transparent focus:border-primary/20" />
          </div>

          {/* Rating */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">How strong is this idea?</label>
            <Stars value={rating} onChange={setRating} />
          </div>

          {/* Platforms */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button key={p} type="button"
                  onClick={() => setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${platforms.includes(p) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">Tags</label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="productivity, tips, tutorial (comma separated)"
              className="w-full bg-muted/40 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 border border-transparent focus:border-primary/20" />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border/30 shrink-0">
          <button onClick={handleSave} disabled={!title.trim() || saving}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 shadow-sm">
            {saving ? "Saving..." : "Save Idea ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function IdeasVault() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [showCapture, setShowCapture] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await getIdeas();
    if (data) setIdeas(data as Idea[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handlePromote(id: string) { await promoteIdea(id); load(); }
  async function handleDelete(id: string) { await deleteIdea(id); setIdeas(p => p.filter(i => i.id !== id)); }
  async function handleStatusChange(id: string, status: string) {
    await updateIdea(id, { status });
    setIdeas(p => p.map(i => i.id === id ? { ...i, status } : i));
  }

  const filtered = ideas
    .filter(i => (tab === "all" || i.status === tab) && (!search || i.title.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <CreatorLayout>
      {/* Page header */}
      <div className="sticky top-[52px] z-10 bg-background/95 backdrop-blur-xl border-b border-border/40 px-4 py-3">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-foreground">💡 Ideas Vault</h1>
              <p className="text-xs text-muted-foreground">{ideas.length} ideas captured</p>
            </div>
            <button onClick={() => setShowCapture(true)}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm">
              + Capture
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ideas..."
              className="w-full pl-8 pr-3 py-2 bg-muted/50 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 border border-transparent focus:border-primary/20" />
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${tab === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                {t.label}
                <span className="ml-1.5 opacity-60">
                  {t.key === "all" ? ideas.length : ideas.filter(i => i.status === t.key).length}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-3">💡</div>
            <h3 className="text-base font-bold text-foreground">{search ? "No matches" : "No ideas yet"}</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-5">{search ? "Try a different search" : "Capture your first content idea."}</p>
            {!search && (
              <button onClick={() => setShowCapture(true)}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 active:scale-95 transition-all">
                Capture First Idea
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(idea => (
              <IdeaCard key={idea.id} idea={idea} onPromote={handlePromote} onDelete={handleDelete} onStatusChange={handleStatusChange} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button onClick={() => setShowCapture(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground text-2xl shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center z-40">
        +
      </button>

      <CaptureSheet open={showCapture} onClose={() => setShowCapture(false)} onSave={load} />
    </CreatorLayout>
  );
}
