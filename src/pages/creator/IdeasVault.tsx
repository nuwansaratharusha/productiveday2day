// =============================================================
// ProductiveDay — Ideas Vault
// Quick-capture idea vault with rating, tags, platform selection,
// and one-click promote to content pipeline
// =============================================================

import { useEffect, useState, useCallback, useRef } from "react";
import { getIdeas, captureIdea, updateIdea, deleteIdea, promoteIdea } from "@/lib/creator/contentActions";

interface Idea {
  id: string;
  title: string;
  body?: string;
  source?: string;
  tags?: string[];
  platforms?: string[];
  rating?: number;
  status: string;
  created_at: string;
}

const PLATFORMS = ["YouTube", "TikTok", "Instagram", "LinkedIn", "Twitter", "Blog", "Newsletter", "Podcast"];
const STATUS_TABS = [
  { key: "all",        label: "All" },
  { key: "captured",   label: "Captured" },
  { key: "researching",label: "Researching" },
  { key: "ready",      label: "Ready" },
  { key: "promoted",   label: "Promoted" },
];

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange?.(star)}
          className={`text-lg transition-transform hover:scale-110 ${
            star <= (value || 0) ? "text-yellow-400" : "text-muted-foreground/30"
          }`}
          type="button"
        >
          ★
        </button>
      ))}
    </div>
  );
}

function PlatformBadge({ name }: { name: string }) {
  const icons: Record<string, string> = {
    YouTube: "🎥", TikTok: "🎵", Instagram: "📸", LinkedIn: "💼",
    Twitter: "🐦", Blog: "📄", Newsletter: "📧", Podcast: "🎙️",
  };
  return (
    <span className="inline-flex items-center gap-1 text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
      {icons[name] || "📦"} {name}
    </span>
  );
}

function IdeaCard({
  idea,
  onPromote,
  onDelete,
  onStatusChange,
}: {
  idea: Idea;
  onPromote: (id: string) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [promoting, setPromoting] = useState(false);

  const statusColor: Record<string, string> = {
    captured:    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    researching: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300",
    ready:       "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-300",
    promoted:    "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-300",
    discarded:   "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300",
  };

  async function handlePromote() {
    setPromoting(true);
    await onPromote(idea.id);
    setPromoting(false);
  }

  return (
    <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
      <button
        className="w-full text-left p-4 hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor[idea.status] || statusColor.captured}`}>
                {idea.status}
              </span>
              {(idea.rating || 0) > 0 && (
                <StarRating value={idea.rating || 0} />
              )}
            </div>
            <div className="text-sm font-semibold text-foreground leading-snug">{idea.title}</div>
            {idea.platforms && idea.platforms.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {idea.platforms.map(p => <PlatformBadge key={p} name={p} />)}
              </div>
            )}
          </div>
          <span className={`text-muted-foreground transition-transform shrink-0 mt-0.5 ${expanded ? "rotate-180" : ""}`}>
            ▾
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/30">
          {idea.body && (
            <p className="text-sm text-muted-foreground pt-3 leading-relaxed">{idea.body}</p>
          )}

          {idea.tags && idea.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {idea.tags.map(t => (
                <span key={t} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">#{t}</span>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {idea.status !== "promoted" && (
              <>
                <button
                  onClick={handlePromote}
                  disabled={promoting}
                  className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
                >
                  {promoting ? "Promoting..." : "🚀 Promote to Pipeline"}
                </button>
                {idea.status === "captured" && (
                  <button
                    onClick={() => onStatusChange(idea.id, "researching")}
                    className="px-3 py-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 text-xs font-semibold hover:opacity-90 active:scale-95 transition-all"
                  >
                    Research
                  </button>
                )}
                {idea.status === "researching" && (
                  <button
                    onClick={() => onStatusChange(idea.id, "ready")}
                    className="px-3 py-2 rounded-xl bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-300 text-xs font-semibold hover:opacity-90 active:scale-95 transition-all"
                  >
                    Mark Ready
                  </button>
                )}
              </>
            )}
            <button
              onClick={() => onDelete(idea.id)}
              className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-500 text-xs font-semibold hover:opacity-90 active:scale-95 transition-all"
            >
              🗑️
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CaptureSheet({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(0);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle(""); setBody(""); setRating(0); setSelectedPlatforms([]); setTags("");
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open]);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    await captureIdea({
      title: title.trim(),
      body: body.trim() || undefined,
      rating: rating || undefined,
      platforms: selectedPlatforms.length ? selectedPlatforms : undefined,
      tags: tags.trim() ? tags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
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
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 pb-2 space-y-4">
          <h2 className="text-lg font-bold text-foreground pt-2">💡 Capture Idea</h2>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              Title *
            </label>
            <input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What's the idea?"
              className="w-full bg-muted/50 border border-border/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              Notes
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Add context, research notes, angles..."
              rows={3}
              className="w-full bg-muted/50 border border-border/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              Idea Rating
            </label>
            <StarRating value={rating} onChange={setRating} />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              Platforms
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPlatforms(prev =>
                    prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
                  )}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    selectedPlatforms.includes(p)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              Tags (comma separated)
            </label>
            <input
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="productivity, tutorial, tips"
              className="w-full bg-muted/50 border border-border/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        {/* Sticky footer */}
        <div className="px-5 py-4 border-t border-border/30 shrink-0">
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? "Saving..." : "💡 Save Idea"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function IdeasVault() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [showCapture, setShowCapture] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await getIdeas();
    if (data) setIdeas(data as Idea[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handlePromote(id: string) {
    await promoteIdea(id);
    await load();
  }

  async function handleDelete(id: string) {
    await deleteIdea(id);
    setIdeas(prev => prev.filter(i => i.id !== id));
  }

  async function handleStatusChange(id: string, status: string) {
    await updateIdea(id, { status });
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, status } : i));
  }

  const filtered = ideas.filter(idea => {
    const matchesTab = activeTab === "all" || idea.status === activeTab;
    const matchesSearch = !search || idea.title.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // Sort: highest rating first, then newest
  filtered.sort((a, b) => {
    if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/50 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-foreground">💡 Ideas Vault</h1>
              <p className="text-xs text-muted-foreground">{ideas.length} ideas captured</p>
            </div>
            <button
              onClick={() => setShowCapture(true)}
              className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
            >
              + Capture
            </button>
          </div>

          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ideas..."
            className="w-full bg-muted/50 border border-border/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 mb-3"
          />

          {/* Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {tab.label}
                <span className="ml-1 opacity-70">
                  {tab.key === "all"
                    ? ideas.length
                    : ideas.filter(i => i.status === tab.key).length}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">💡</div>
            <h3 className="text-base font-semibold text-foreground">No ideas yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Capture your first content idea before it slips away.
            </p>
            <button
              onClick={() => setShowCapture(true)}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
            >
              Capture First Idea
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(idea => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                onPromote={handlePromote}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowCapture(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground text-2xl shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center z-40"
      >
        +
      </button>

      <CaptureSheet open={showCapture} onClose={() => setShowCapture(false)} onSave={load} />
    </div>
  );
}
