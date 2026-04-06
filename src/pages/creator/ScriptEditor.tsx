// =============================================================
// ProductiveDay — Script Editor
// AI-powered script generation with Hook/Body/CTA sections
// =============================================================

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { getScripts, createScript, updateScript } from "@/lib/creator/contentActions";
import { generateScript, type ScriptRequest, type ScriptSection } from "@/lib/creator/generateScript";

interface Script {
  id: string;
  title: string;
  script_type: string;
  sections: ScriptSection[];
  body?: string;
  ai_generated: boolean;
  estimated_duration_sec?: number;
  word_count?: number;
  status: string;
  content_piece_id?: string;
  created_at: string;
}

const CONTENT_TYPES = ["video","short","blog","newsletter","social"] as const;
const PLATFORMS: Record<string, string[]> = {
  video:      ["YouTube","Vimeo","LinkedIn"],
  short:      ["TikTok","Instagram Reels","YouTube Shorts"],
  blog:       ["Personal Blog","Medium","LinkedIn","Dev.to"],
  newsletter: ["Email","Substack","ConvertKit"],
  social:     ["Twitter","LinkedIn","Instagram","Facebook"],
};

const SECTION_TYPE_COLORS: Record<string, string> = {
  hook:         "border-l-orange-400 bg-orange-50 dark:bg-orange-950/30",
  intro:        "border-l-blue-400 bg-blue-50 dark:bg-blue-950/30",
  body:         "border-l-purple-400 bg-purple-50 dark:bg-purple-950/30",
  cta:          "border-l-green-400 bg-green-50 dark:bg-green-950/30",
  outro:        "border-l-slate-400 bg-slate-50 dark:bg-slate-800/30",
  subject_line: "border-l-pink-400 bg-pink-50 dark:bg-pink-950/30",
  preview:      "border-l-yellow-400 bg-yellow-50 dark:bg-yellow-950/30",
  headline:     "border-l-red-400 bg-red-50 dark:bg-red-950/30",
  hashtags:     "border-l-teal-400 bg-teal-50 dark:bg-teal-950/30",
};

function formatDuration(sec?: number) {
  if (!sec) return "";
  if (sec < 60) return `${sec}s`;
  return `${Math.round(sec / 60)}m`;
}

function SectionCard({
  section,
  index,
  onChange,
}: {
  section: ScriptSection;
  index: number;
  onChange: (i: number, content: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const colorClass = SECTION_TYPE_COLORS[section.type] || SECTION_TYPE_COLORS.body;

  return (
    <div className={`rounded-xl border-l-4 p-4 ${colorClass}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {section.label || section.type}
          </span>
          {section.duration_sec && (
            <span className="text-[10px] bg-background/60 rounded-full px-2 py-0.5 text-muted-foreground">
              ⏱ {formatDuration(section.duration_sec)}
            </span>
          )}
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      {editing ? (
        <textarea
          value={section.content}
          onChange={e => onChange(index, e.target.value)}
          rows={6}
          className="w-full bg-background/60 border border-border/50 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none leading-relaxed"
        />
      ) : (
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{section.content}</p>
      )}
    </div>
  );
}

function GenerateForm({
  onGenerated,
  contentPieceId,
}: {
  onGenerated: (script: Script) => void;
  contentPieceId?: string;
}) {
  const [topic, setTopic] = useState("");
  const [contentType, setContentType] = useState<typeof CONTENT_TYPES[number]>("video");
  const [platform, setPlatform] = useState("YouTube");
  const [duration, setDuration] = useState("480");
  const [keyPoints, setKeyPoints] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPlatform(PLATFORMS[contentType]?.[0] || "YouTube");
  }, [contentType]);

  async function handleGenerate() {
    if (!topic.trim()) return;
    setGenerating(true);
    setError(null);

    const req: ScriptRequest = {
      topic: topic.trim(),
      content_type: contentType,
      platform,
      target_duration_sec: duration ? parseInt(duration) : undefined,
      key_points: keyPoints.trim()
        ? keyPoints.split("\n").map(s => s.trim()).filter(Boolean)
        : undefined,
    };

    const { data: generated, error: genErr } = await generateScript(req);
    if (genErr || !generated) {
      setError(genErr || "Generation failed");
      setGenerating(false);
      return;
    }

    // Save to Supabase
    const { data: saved } = await createScript({
      title: generated.title,
      script_type: contentType,
      sections: generated.sections,
      ai_generated: true,
      ai_model: "claude-sonnet-4-6",
      estimated_duration_sec: generated.estimated_duration_sec,
      content_piece_id: contentPieceId,
    });

    if (saved) onGenerated(saved as Script);
    setGenerating(false);
  }

  return (
    <div className="space-y-4">
      {/* Content type selector */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Content Type</label>
        <div className="flex gap-1.5 flex-wrap">
          {CONTENT_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setContentType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${
                contentType === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Platform */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Platform</label>
        <div className="flex gap-1.5 flex-wrap">
          {(PLATFORMS[contentType] || []).map(p => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                platform === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Topic */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Topic *</label>
        <textarea
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="e.g. 5 productivity habits that changed my routine..."
          rows={2}
          className="w-full bg-muted/50 border border-border/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
      </div>

      {/* Duration (video only) */}
      {(contentType === "video" || contentType === "short") && (
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
            Target Duration
          </label>
          <div className="flex gap-2 flex-wrap">
            {[["60","1 min"],["180","3 min"],["480","8 min"],["600","10 min"],["900","15 min"]].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setDuration(val)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  duration === val ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Key points */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
          Key Points (one per line, optional)
        </label>
        <textarea
          value={keyPoints}
          onChange={e => setKeyPoints(e.target.value)}
          placeholder={"Morning planning ritual\nTime blocking for deep work\nWeekly review system"}
          rows={4}
          className="w-full bg-muted/50 border border-border/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/50 p-3 text-sm text-red-600 dark:text-red-400">
          {error.includes("VITE_GROQ_API_KEY") ? (
            <span>
              Add <code className="bg-red-100 dark:bg-red-900/40 rounded px-1">VITE_GROQ_API_KEY=your-key</code> to your <code className="bg-red-100 dark:bg-red-900/40 rounded px-1">.env.local</code> file. Get a free key at <strong>console.groq.com</strong>
            </span>
          ) : error}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={!topic.trim() || generating}
        className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-primary text-white font-semibold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {generating ? (
          <>
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Generating script...
          </>
        ) : (
          "✨ Generate Script with AI"
        )}
      </button>
    </div>
  );
}

export default function ScriptEditor() {
  const [searchParams] = useSearchParams();
  const contentPieceId = searchParams.get("piece") || undefined;

  const [scripts, setScripts] = useState<Script[]>([]);
  const [activeScript, setActiveScript] = useState<Script | null>(null);
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
    setActiveScript(script);
    setView("edit");
  }

  function handleSectionChange(index: number, content: string) {
    if (!activeScript) return;
    const newSections = activeScript.sections.map((s, i) => i === index ? { ...s, content } : s);
    setActiveScript({ ...activeScript, sections: newSections });
  }

  async function handleSave() {
    if (!activeScript) return;
    setSaving(true);
    await updateScript(activeScript.id, { sections: activeScript.sections });
    setSaving(false);
    // Update in list
    setScripts(prev => prev.map(s => s.id === activeScript.id ? activeScript : s));
  }

  function copyToClipboard() {
    if (!activeScript) return;
    const text = activeScript.sections.map(s => `## ${s.label}\n\n${s.content}`).join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
  }

  const wordCount = activeScript?.sections.reduce(
    (sum, s) => sum + s.content.split(/\s+/).filter(Boolean).length, 0
  ) || 0;

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/50 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-1">
            {view === "edit" && activeScript ? (
              <>
                <button onClick={() => setView("list")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  ← Scripts
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="px-3 py-1.5 rounded-xl bg-muted text-muted-foreground text-xs font-semibold hover:bg-muted/80 transition-all"
                  >
                    📋 Copy
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </>
            ) : view === "generate" ? (
              <>
                <button onClick={() => setView("list")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  ← Scripts
                </button>
                <h1 className="text-base font-bold text-foreground">AI Script Generator</h1>
                <div />
              </>
            ) : (
              <>
                <div>
                  <h1 className="text-xl font-bold text-foreground">✍️ Scripts</h1>
                  <p className="text-xs text-muted-foreground">{scripts.length} scripts</p>
                </div>
                <button
                  onClick={() => setView("generate")}
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-primary text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
                >
                  ✨ Generate
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5">
        {/* Generate view */}
        {view === "generate" && (
          <GenerateForm onGenerated={handleGenerated} contentPieceId={contentPieceId} />
        )}

        {/* Edit view */}
        {view === "edit" && activeScript && (
          <div className="space-y-4">
            {/* Script meta */}
            <div className="rounded-2xl bg-card border border-border/50 p-4">
              <h2 className="text-base font-bold text-foreground mb-1">{activeScript.title}</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span className="bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded-full">
                  {activeScript.script_type}
                </span>
                {activeScript.ai_generated && (
                  <span className="bg-gradient-to-r from-purple-500 to-primary bg-clip-text text-transparent font-semibold">
                    ✨ AI Generated
                  </span>
                )}
                <span>{wordCount} words</span>
                {activeScript.estimated_duration_sec && (
                  <span>⏱ {formatDuration(activeScript.estimated_duration_sec)}</span>
                )}
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-3">
              {activeScript.sections.map((section, i) => (
                <SectionCard
                  key={i}
                  section={section}
                  index={i}
                  onChange={handleSectionChange}
                />
              ))}
            </div>

            <button
              onClick={() => setView("generate")}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600/20 to-primary/20 border border-primary/20 text-primary font-semibold text-sm hover:opacity-90 active:scale-95 transition-all"
            >
              ✨ Regenerate with AI
            </button>
          </div>
        )}

        {/* List view */}
        {view === "list" && (
          <>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
              </div>
            ) : scripts.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">✍️</div>
                <h3 className="text-base font-semibold text-foreground">No scripts yet</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">Generate your first AI-powered script.</p>
                <button
                  onClick={() => setView("generate")}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-primary text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
                >
                  ✨ Generate First Script
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {scripts.map(script => (
                  <button
                    key={script.id}
                    onClick={() => { setActiveScript(script); setView("edit"); }}
                    className="w-full text-left rounded-2xl bg-card border border-border/50 p-4 hover:shadow-sm active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-xl shrink-0">✍️</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-foreground truncate">{script.title}</span>
                          {script.ai_generated && <span className="text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 px-1.5 py-0.5 rounded-full shrink-0">AI</span>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="capitalize">{script.script_type}</span>
                          <span>·</span>
                          <span>{script.word_count || 0} words</span>
                          {script.estimated_duration_sec && (
                            <><span>·</span><span>⏱ {formatDuration(script.estimated_duration_sec)}</span></>
                          )}
                        </div>
                      </div>
                      <span className="text-muted-foreground shrink-0">→</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB for generate */}
      {view === "list" && (
        <button
          onClick={() => setView("generate")}
          className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-primary text-white text-xl shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center z-40"
        >
          ✨
        </button>
      )}
    </div>
  );
}
