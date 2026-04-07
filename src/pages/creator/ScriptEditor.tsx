// =============================================================
// ProductiveDay — Script Editor (Redesigned)
// =============================================================

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { CreatorLayout } from "@/components/creator/CreatorLayout";
import { getScripts, createScript, updateScript, deleteScript } from "@/lib/creator/contentActions";
import { generateScript, type ScriptRequest, type ScriptSection } from "@/lib/creator/generateScript";

interface Script {
  id: string; title: string; script_type: string; sections: ScriptSection[];
  ai_generated: boolean; estimated_duration_sec?: number; word_count?: number;
  status: string; content_piece_id?: string; created_at: string;
}

const CONTENT_TYPES = ["video","short","blog","newsletter","social"] as const;
const PLATFORMS: Record<string, string[]> = {
  video:      ["YouTube","Vimeo","LinkedIn"],
  short:      ["TikTok","Instagram Reels","YouTube Shorts"],
  blog:       ["Personal Blog","Medium","LinkedIn","Dev.to"],
  newsletter: ["Email","Substack","ConvertKit"],
  social:     ["Twitter","LinkedIn","Instagram","Facebook"],
};
const DURATIONS = [["60","1 min"],["180","3 min"],["480","8 min"],["600","10 min"],["900","15 min"]];

const SECTION_COLORS: Record<string, { bar: string; bg: string; label: string }> = {
  hook:         { bar: "bg-orange-400",  bg: "bg-orange-50 dark:bg-orange-950/30",  label: "Hook" },
  intro:        { bar: "bg-blue-400",    bg: "bg-blue-50 dark:bg-blue-950/30",      label: "Intro" },
  body:         { bar: "bg-purple-400",  bg: "bg-purple-50 dark:bg-purple-950/30",  label: "Body" },
  cta:          { bar: "bg-green-400",   bg: "bg-green-50 dark:bg-green-950/30",    label: "CTA" },
  outro:        { bar: "bg-slate-400",   bg: "bg-slate-50 dark:bg-slate-800/30",    label: "Outro" },
  subject_line: { bar: "bg-pink-400",    bg: "bg-pink-50 dark:bg-pink-950/30",      label: "Subject" },
  preview:      { bar: "bg-yellow-400",  bg: "bg-yellow-50 dark:bg-yellow-950/30",  label: "Preview" },
  headline:     { bar: "bg-red-400",     bg: "bg-red-50 dark:bg-red-950/30",        label: "Headline" },
  hashtags:     { bar: "bg-teal-400",    bg: "bg-teal-50 dark:bg-teal-950/30",      label: "Hashtags" },
};

function fmt(sec?: number) {
  if (!sec) return "";
  return sec < 60 ? `${sec}s` : `${Math.round(sec / 60)}m`;
}

function SectionCard({ section, index, onChange }: {
  section: ScriptSection; index: number; onChange: (i: number, c: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const cfg = SECTION_COLORS[section.type] || SECTION_COLORS.body;

  function copySection() {
    navigator.clipboard.writeText(section.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={`rounded-2xl overflow-hidden border border-border/40 ${cfg.bg}`}>
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/30">
        <div className={`w-1.5 h-1.5 rounded-full ${cfg.bar}`} />
        <span className="text-xs font-bold text-foreground uppercase tracking-wider flex-1">
          {section.label || cfg.label}
        </span>
        {section.duration_sec && (
          <span className="text-[10px] text-muted-foreground bg-background/60 rounded-full px-2 py-0.5">⏱ {fmt(section.duration_sec)}</span>
        )}
        <button onClick={copySection}
          className="text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded-lg hover:bg-background/60">
          {copied ? "✓ Copied" : "Copy"}
        </button>
        <button onClick={() => setEditing(!editing)}
          className="text-[10px] font-semibold text-primary hover:underline">
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      <div className="p-4">
        {editing ? (
          <textarea value={section.content} onChange={e => onChange(index, e.target.value)} rows={6}
            className="w-full bg-background/60 border border-border/40 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none leading-relaxed" />
        ) : (
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{section.content}</p>
        )}
      </div>
    </div>
  );
}

function GenerateForm({ onGenerated, contentPieceId }: { onGenerated: (s: Script) => void; contentPieceId?: string }) {
  const [topic, setTopic] = useState("");
  const [contentType, setContentType] = useState<typeof CONTENT_TYPES[number]>("video");
  const [platform, setPlatform] = useState("YouTube");
  const [duration, setDuration] = useState("480");
  const [keyPoints, setKeyPoints] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setPlatform(PLATFORMS[contentType]?.[0] || "YouTube"); }, [contentType]);

  async function handleGenerate() {
    if (!topic.trim()) return;
    setGenerating(true); setError(null);

    const req: ScriptRequest = {
      topic: topic.trim(), content_type: contentType, platform,
      target_duration_sec: duration ? parseInt(duration) : undefined,
      key_points: keyPoints.trim() ? keyPoints.split("\n").map(s => s.trim()).filter(Boolean) : undefined,
    };

    const { data: generated, error: genErr } = await generateScript(req);
    if (genErr || !generated) { setError(genErr || "Generation failed"); setGenerating(false); return; }

    const { data: saved } = await createScript({
      title: generated.title, script_type: contentType, sections: generated.sections,
      ai_generated: true, ai_model: "llama-3.3-70b-versatile",
      estimated_duration_sec: generated.estimated_duration_sec, content_piece_id: contentPieceId,
    });

    if (saved) onGenerated(saved as Script);
    setGenerating(false);
  }

  return (
    <div className="space-y-6">
      {/* Content type */}
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2.5">Content Type</label>
        <div className="flex gap-2 flex-wrap">
          {CONTENT_TYPES.map(t => (
            <button key={t} onClick={() => setContentType(t)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold capitalize transition-all ${contentType === t ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Platform */}
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2.5">Platform</label>
        <div className="flex gap-2 flex-wrap">
          {(PLATFORMS[contentType] || []).map(p => (
            <button key={p} onClick={() => setPlatform(p)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${platform === p ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Topic */}
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2.5">Topic *</label>
        <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={2}
          placeholder="e.g. 5 productivity habits that changed my morning routine..."
          className="w-full bg-muted/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none border border-transparent focus:border-primary/20" />
      </div>

      {/* Duration */}
      {(contentType === "video" || contentType === "short") && (
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2.5">Target Duration</label>
          <div className="flex gap-2 flex-wrap">
            {DURATIONS.map(([val, lbl]) => (
              <button key={val} onClick={() => setDuration(val)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${duration === val ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Key points */}
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2.5">Key Points <span className="normal-case font-normal text-muted-foreground">(one per line, optional)</span></label>
        <textarea value={keyPoints} onChange={e => setKeyPoints(e.target.value)} rows={4}
          placeholder={"Morning planning ritual\nTime blocking technique\nWeekly review system"}
          className="w-full bg-muted/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none border border-transparent focus:border-primary/20" />
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/50 p-4 text-sm text-red-600 dark:text-red-400">
          {error.includes("VITE_GROQ_API_KEY")
            ? <span>Add <code className="bg-red-100 dark:bg-red-900/40 rounded px-1 text-xs">VITE_GROQ_API_KEY=your-key</code> to <code className="bg-red-100 dark:bg-red-900/40 rounded px-1 text-xs">.env.local</code>. Get a free key at <strong>console.groq.com</strong></span>
            : error}
        </div>
      )}

      <button onClick={handleGenerate} disabled={!topic.trim() || generating}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-primary text-white font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 shadow-md flex items-center justify-center gap-2">
        {generating ? (
          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating your script...</>
        ) : "✨ Generate with AI"}
      </button>
    </div>
  );
}

export default function ScriptEditor() {
  const [searchParams] = useSearchParams();
  const contentPieceId = searchParams.get("piece") || undefined;

  const [scripts, setScripts] = useState<Script[]>([]);
  const [active, setActive] = useState<Script | null>(null);
  const [view, setView] = useState<"list" | "generate" | "edit">("list");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await getScripts(contentPieceId);
    if (data) setScripts(data as Script[]);
    setLoading(false);
  }, [contentPieceId]);

  useEffect(() => { load(); }, [load]);

  function handleGenerated(script: Script) {
    setScripts(prev => [script, ...prev]);
    setActive(script);
    setView("edit");
  }

  function handleSectionChange(i: number, content: string) {
    if (!active) return;
    setActive({ ...active, sections: active.sections.map((s, idx) => idx === i ? { ...s, content } : s) });
  }

  async function handleSave() {
    if (!active) return;
    setSaving(true);
    await updateScript(active.id, { sections: active.sections });
    setScripts(prev => prev.map(s => s.id === active.id ? active : s));
    setSaving(false);
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this script? This can't be undone.")) return;
    setScripts(prev => prev.filter(s => s.id !== id));
    if (active?.id === id) { setActive(null); setView("list"); }
    await deleteScript(id);
  }

  function copyAll() {
    if (!active) return;
    navigator.clipboard.writeText(active.sections.map(s => `## ${s.label}\n\n${s.content}`).join("\n\n---\n\n"));
  }

  const wordCount = active?.sections.reduce((sum, s) => sum + s.content.split(/\s+/).filter(Boolean).length, 0) || 0;

  return (
    <CreatorLayout>
      {/* Header */}
      <div className="sticky top-[52px] z-10 bg-background/95 backdrop-blur-xl border-b border-border/40 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {view === "edit" && active ? (
            <>
              <button onClick={() => setView("list")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Scripts
              </button>
              <div className="flex gap-2">
                <button onClick={copyAll} className="px-3 py-1.5 rounded-xl bg-muted text-muted-foreground text-xs font-bold hover:bg-muted/80 transition-all">📋 Copy All</button>
                <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all disabled:opacity-60">
                  {saving ? "Saving..." : "Save ✓"}
                </button>
              </div>
            </>
          ) : view === "generate" ? (
            <>
              <button onClick={() => setView("list")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
              <span className="text-sm font-bold text-foreground">AI Script Generator</span>
              <div />
            </>
          ) : (
            <>
              <div>
                <h1 className="text-lg font-bold text-foreground">✍️ Scripts</h1>
                <p className="text-xs text-muted-foreground">{scripts.length} script{scripts.length !== 1 ? "s" : ""}</p>
              </div>
              <button onClick={() => setView("generate")}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-primary text-white text-sm font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm">
                ✨ Generate
              </button>
            </>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5">

        {/* Generate view */}
        {view === "generate" && (
          <GenerateForm onGenerated={handleGenerated} contentPieceId={contentPieceId} />
        )}

        {/* Edit view */}
        {view === "edit" && active && (
          <div className="space-y-4">
            {/* Script meta card */}
            <div className="rounded-2xl bg-gradient-to-br from-purple-500/8 to-primary/5 border border-purple-200/30 dark:border-purple-800/30 p-4">
              <h2 className="text-base font-bold text-foreground mb-2 leading-snug">{active.title}</h2>
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 rounded-lg capitalize">
                  {active.script_type}
                </span>
                {active.ai_generated && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-gradient-to-r from-purple-500/10 to-primary/10 text-primary rounded-lg border border-primary/20">
                    ✨ AI Generated
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{wordCount} words</span>
                {active.estimated_duration_sec && <span className="text-xs text-muted-foreground">⏱ {fmt(active.estimated_duration_sec)}</span>}
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-3">
              {active.sections.map((s, i) => (
                <SectionCard key={i} section={s} index={i} onChange={handleSectionChange} />
              ))}
            </div>

            <button onClick={() => setView("generate")}
              className="w-full py-3.5 rounded-2xl border-2 border-dashed border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 font-bold text-sm hover:bg-purple-50 dark:hover:bg-purple-950/20 active:scale-[0.98] transition-all">
              ✨ Regenerate with AI
            </button>
          </div>
        )}

        {/* List view */}
        {view === "list" && (
          <>
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}</div>
            ) : scripts.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">✍️</div>
                <h3 className="text-lg font-bold text-foreground">No scripts yet</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-6">Generate your first AI-powered script in seconds.</p>
                <button onClick={() => setView("generate")}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-primary text-white font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-md">
                  ✨ Generate First Script
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {scripts.map(script => (
                  <button key={script.id} onClick={() => { setActive(script); setView("edit"); }}
                    className="w-full text-left rounded-2xl bg-card border border-border/50 p-4 hover:shadow-sm hover:border-border active:scale-[0.99] transition-all group">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-primary/10 dark:from-purple-950 dark:to-primary/5 flex items-center justify-center text-lg shrink-0">✍️</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-sm font-bold text-foreground truncate">{script.title}</span>
                          {script.ai_generated && <span className="text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 px-1.5 py-0.5 rounded-md font-bold shrink-0">AI</span>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span className="capitalize">{script.script_type}</span>
                          <span>·</span>
                          <span>{script.word_count || 0} words</span>
                          {script.estimated_duration_sec && <><span>·</span><span>⏱ {fmt(script.estimated_duration_sec)}</span></>}
                        </div>
                      </div>
                      <button onClick={(e) => handleDelete(script.id, e)}
                        className="px-2 py-1.5 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all text-xs shrink-0">
                        ✕
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      {view === "list" && (
        <button onClick={() => setView("generate")}
          className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-primary text-white text-xl shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center z-40">
          ✨
        </button>
      )}
    </CreatorLayout>
  );
}
