import { useState } from "react";
import { Sun, Target, Coffee, Wind, ArrowRight, ArrowLeft, Check, Briefcase, Zap,
  GraduationCap, TrendingUp, Clapperboard, Palette, Code2,
  FlaskConical, BarChart2, HeartPulse, Scale, BookMarked, Building2,
  Megaphone, Handshake, ShoppingBag, LayoutDashboard, Flame, Video,
  PenLine, Music, Layers, Settings2, Package, Sparkles, LineChart,
  Brain, Phone, Sunrise, Clock, Moon, Sunset, LucideIcon,
} from "lucide-react";

// ─── Data types ───────────────────────────────────────────────
export type Profession = "student" | "employee" | "entrepreneur" | "creator" | "freelancer" | "developer";
export type WorkHours  = "early" | "standard" | "flexible" | "night";
export type Productivity = "morning" | "afternoon" | "evening";
export type WorkType = "deep" | "meetings" | "mixed";
export type BreakStyle = "short" | "long" | "frequent";

export interface OnboardingData {
  profession:   Profession;
  industry:     string;
  wakeUpTime:   string;
  workHours:    WorkHours;
  productivity: Productivity;
  goals:        string[];
  breakStyle:   BreakStyle;
  workType:     WorkType;
}

interface OnboardingWizardProps {
  onComplete: (data: OnboardingData) => void;
}

// ─── Step content definitions ─────────────────────────────────

const PROFESSIONS: { value: Profession; label: string; desc: string; Icon: LucideIcon }[] = [
  { value: "student",       label: "Student",              desc: "Courses, assignments, exams & learning",    Icon: GraduationCap },
  { value: "employee",      label: "Professional",         desc: "9-to-5, team meetings, corporate work",     Icon: Briefcase },
  { value: "entrepreneur",  label: "Entrepreneur",         desc: "Building a business, revenue, growth",      Icon: TrendingUp },
  { value: "creator",       label: "Content Creator",      desc: "Videos, posts, brand deals, audience",      Icon: Clapperboard },
  { value: "freelancer",    label: "Freelancer",           desc: "Client projects, proposals, billing",       Icon: Palette },
  { value: "developer",     label: "Developer / Engineer", desc: "Coding, PRs, architecture, shipping",       Icon: Code2 },
];

const INDUSTRIES: Record<Profession, { value: string; label: string; Icon: LucideIcon }[]> = {
  student: [
    { value: "stem",         label: "STEM / Sciences",          Icon: FlaskConical },
    { value: "business_edu", label: "Business / Economics",     Icon: BarChart2 },
    { value: "arts",         label: "Arts & Humanities",        Icon: Palette },
    { value: "medicine",     label: "Medicine / Health",        Icon: HeartPulse },
    { value: "law",          label: "Law",                      Icon: Scale },
    { value: "other_edu",    label: "Other",                    Icon: BookMarked },
  ],
  employee: [
    { value: "tech",         label: "Technology",               Icon: Code2 },
    { value: "finance",      label: "Finance & Banking",        Icon: LineChart },
    { value: "marketing",    label: "Marketing & Sales",        Icon: Megaphone },
    { value: "healthcare",   label: "Healthcare",               Icon: HeartPulse },
    { value: "consulting",   label: "Consulting",               Icon: Handshake },
    { value: "other_emp",    label: "Other",                    Icon: Building2 },
  ],
  entrepreneur: [
    { value: "saas",         label: "SaaS / Tech Startup",      Icon: LayoutDashboard },
    { value: "ecommerce",    label: "E-commerce / Retail",      Icon: ShoppingBag },
    { value: "agency",       label: "Agency / Services",        Icon: Handshake },
    { value: "hospitality",  label: "Hospitality / F&B",        Icon: Sparkles },
    { value: "real_estate",  label: "Real Estate",              Icon: Building2 },
    { value: "other_ent",    label: "Other",                    Icon: Zap },
  ],
  creator: [
    { value: "youtube",      label: "YouTube / Video",          Icon: Video },
    { value: "instagram",    label: "Instagram / TikTok",       Icon: Flame },
    { value: "podcast",      label: "Podcast / Audio",          Icon: Megaphone },
    { value: "writing",      label: "Blog / Newsletter",        Icon: PenLine },
    { value: "music",        label: "Music / Production",       Icon: Music },
    { value: "other_cr",     label: "Other",                    Icon: Clapperboard },
  ],
  freelancer: [
    { value: "design_fl",    label: "Graphic / UI Design",      Icon: Palette },
    { value: "dev_fl",       label: "Web / App Development",    Icon: Code2 },
    { value: "copy",         label: "Copywriting / Content",    Icon: PenLine },
    { value: "video_fl",     label: "Video / Photography",      Icon: Video },
    { value: "consult_fl",   label: "Consulting / Coaching",    Icon: Handshake },
    { value: "other_fl",     label: "Other",                    Icon: Layers },
  ],
  developer: [
    { value: "frontend",     label: "Frontend / Mobile",        Icon: Layers },
    { value: "backend",      label: "Backend / APIs",           Icon: Settings2 },
    { value: "fullstack",    label: "Full-Stack",               Icon: Code2 },
    { value: "devops",       label: "DevOps / Cloud",           Icon: Package },
    { value: "ai_ml",        label: "AI / ML / Data",           Icon: Brain },
    { value: "other_dev",    label: "Other",                    Icon: Code2 },
  ],
};

const WAKE_PRESETS = [
  "05:00","05:30","06:00","06:30","07:00","07:30","08:00","08:30","09:00","09:30",
];

const WORK_HOURS_OPTIONS: { value: WorkHours; label: string; desc: string; Icon: LucideIcon }[] = [
  { value: "early",    label: "Early Bird",   desc: "Work starts around 7–8 AM",   Icon: Sunrise },
  { value: "standard", label: "Standard",     desc: "9 AM – 5 PM typical day",     Icon: Sun },
  { value: "flexible", label: "Flexible",     desc: "Start around 10–11 AM",       Icon: Clock },
  { value: "night",    label: "Night Shift",  desc: "Afternoon to evening focus",  Icon: Moon },
];

const PRODUCTIVITY_OPTS: { value: Productivity; label: string; desc: string; Icon: LucideIcon }[] = [
  { value: "morning",   label: "Morning",   desc: "Best before noon",            Icon: Sunrise },
  { value: "afternoon", label: "Afternoon", desc: "Peak energy 1–5 PM",          Icon: Sun },
  { value: "evening",   label: "Evening",   desc: "Hit stride after 6 PM",       Icon: Sunset },
];

const WORK_TYPES: { value: WorkType; label: string; desc: string; Icon: LucideIcon }[] = [
  { value: "deep",     label: "Deep Work",     desc: "Long focused sessions, no interruptions",   Icon: Brain },
  { value: "meetings", label: "Meeting Heavy", desc: "Lots of calls, client sessions, standups",  Icon: Phone },
  { value: "mixed",    label: "Mixed",         desc: "Balance of focus and collaborative time",   Icon: Zap },
];

const GOAL_OPTIONS: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: "revenue",    label: "Revenue Growth",     Icon: TrendingUp },
  { value: "study",      label: "Study & Learning",   Icon: BookMarked },
  { value: "health",     label: "Health & Fitness",   Icon: HeartPulse },
  { value: "creative",   label: "Creative Projects",  Icon: Palette },
  { value: "networking", label: "Networking",         Icon: Handshake },
  { value: "personal",   label: "Personal Growth",    Icon: Sparkles },
  { value: "launch",     label: "Launch Something",   Icon: Zap },
  { value: "mindset",    label: "Mindset & Wellness", Icon: Brain },
];

const BREAK_STYLES: { value: BreakStyle; label: string; desc: string; Icon: LucideIcon }[] = [
  { value: "short",    label: "Short & Sharp",  desc: "15-min breaks every 2 sessions",    Icon: Zap },
  { value: "long",     label: "Deep Rest",      desc: "30-min breaks to fully recharge",   Icon: Wind },
  { value: "frequent", label: "Micro Breaks",   desc: "10-min breather every session",     Icon: Coffee },
];

const STEPS = [
  { label: "Role",     icon: Briefcase },
  { label: "Field",    icon: Target },
  { label: "Schedule", icon: Sun },
  { label: "Peak",     icon: Zap },
  { label: "Goals",    icon: Target },
  { label: "Breaks",   icon: Coffee },
];

// ─── Helper ───────────────────────────────────────────────────
function fmt12(val: string) {
  const [h, m] = val.split(":").map(Number);
  const p = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")} ${p}`;
}

// ─── Reusable card option ─────────────────────────────────────
function OptionCard({
  selected, onClick, Icon, label, desc, small,
}: {
  selected: boolean; onClick: () => void;
  Icon: LucideIcon; label: string; desc?: string; small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{ touchAction: "manipulation" }}
      className={[
        "w-full text-left rounded-xl border transition-all duration-150 active:scale-[0.98] flex items-center gap-3",
        small ? "p-3" : "p-4",
        selected
          ? "border-primary/40 bg-primary/5 shadow-sm"
          : "border-border bg-background hover:bg-muted/30",
      ].join(" ")}
    >
      <div className={[
        "flex items-center justify-center rounded-lg flex-shrink-0",
        small ? "w-8 h-8" : "w-10 h-10",
        selected ? "bg-primary/15" : "bg-muted/60",
      ].join(" ")}>
        <Icon className={small ? "w-4 h-4 text-primary" : "w-5 h-5 text-primary"} strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={["font-semibold text-foreground leading-snug", small ? "text-xs" : "text-sm"].join(" ")}>
          {label}
        </div>
        {desc && <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</div>}
      </div>
      {selected && (
        <div className="w-5 h-5 rounded-full gradient-brand flex items-center justify-center flex-shrink-0">
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </div>
      )}
    </button>
  );
}

// ─── Main wizard ──────────────────────────────────────────────
export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    profession:   "employee",
    industry:     "",
    wakeUpTime:   "07:00",
    workHours:    "standard",
    productivity: "morning",
    goals:        [],
    breakStyle:   "short",
    workType:     "mixed",
  });

  const toggleGoal = (g: string) =>
    setData(p => ({ ...p, goals: p.goals.includes(g) ? p.goals.filter(x => x !== g) : [...p.goals, g] }));

  const canProceed = () => {
    if (step === 1) return data.industry !== "";
    if (step === 4) return data.goals.length > 0;
    return true;
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else onComplete(data);
  };

  const industries = INDUSTRIES[data.profession] || [];

  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-start sm:justify-center overflow-y-auto"
      style={{ paddingTop: "max(20px, env(safe-area-inset-top))", paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
    >
      <div className="w-full max-w-[430px] px-4">

        {/* Header brand */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-xl gradient-brand flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-foreground">ProductiveDay</span>
          </div>
          <p className="text-xs text-muted-foreground">Let's build your personalised daily system</p>
        </div>

        {/* Step progress */}
        <div className="flex items-center mb-5 px-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isDone   = i < step;
            const isActive = i === step;
            return (
              <div key={s.label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className={[
                    "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300",
                    isDone   ? "gradient-brand" :
                    isActive ? "bg-card border-2 border-primary shadow-sm" :
                               "bg-muted border-2 border-transparent",
                  ].join(" ")}>
                    {isDone
                      ? <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      : <Icon className={`w-3 h-3 ${isActive ? "text-primary" : "text-muted-foreground/40"}`} />
                    }
                  </div>
                  <span className={[
                    "text-[9px] font-semibold leading-none",
                    isActive ? "text-foreground" : "text-muted-foreground/50",
                  ].join(" ")}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={[
                    "h-[2px] flex-1 mx-1 mb-4 rounded-full transition-all duration-500",
                    i < step ? "gradient-brand" : "bg-muted/60",
                  ].join(" ")} />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl border border-border shadow-card p-5 animate-fade-in" key={step}>

          {/* ── Step 0: Profession ── */}
          {step === 0 && (
            <>
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold text-foreground mb-1">What best describes you?</h2>
                <p className="text-xs text-muted-foreground">We'll tailor your schedule to your role</p>
              </div>
              <div className="space-y-2">
                {PROFESSIONS.map(p => (
                  <OptionCard
                    key={p.value}
                    selected={data.profession === p.value}
                    onClick={() => setData(d => ({ ...d, profession: p.value, industry: "" }))}
                    Icon={p.Icon} label={p.label} desc={p.desc}
                  />
                ))}
              </div>
            </>
          )}

          {/* ── Step 1: Industry ── */}
          {step === 1 && (
            <>
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold text-foreground mb-1">What's your field?</h2>
                <p className="text-xs text-muted-foreground">Your schedule will be built around this</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {industries.map(ind => (
                  <OptionCard
                    key={ind.value}
                    selected={data.industry === ind.value}
                    onClick={() => setData(d => ({ ...d, industry: ind.value }))}
                    Icon={ind.Icon} label={ind.label} small
                  />
                ))}
              </div>
              {data.industry === "" && (
                <p className="text-xs text-destructive text-center mt-3 font-medium">Please select your field</p>
              )}
            </>
          )}

          {/* ── Step 2: Wake time + work hours ── */}
          {step === 2 && (
            <>
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold text-foreground mb-1">Your daily schedule</h2>
                <p className="text-xs text-muted-foreground">When does your day start?</p>
              </div>

              <div className="mb-4">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Wake-up time</div>
                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  {WAKE_PRESETS.map(v => (
                    <button
                      key={v}
                      onClick={() => setData(d => ({ ...d, wakeUpTime: v }))}
                      style={{ touchAction: "manipulation" }}
                      className={[
                        "py-2.5 rounded-xl text-[11px] font-semibold transition-all active:scale-95",
                        data.wakeUpTime === v
                          ? "gradient-brand text-white shadow-sm"
                          : "bg-muted text-muted-foreground hover:text-foreground",
                      ].join(" ")}
                    >
                      {fmt12(v)}
                    </button>
                  ))}
                </div>
                <input
                  type="time"
                  value={data.wakeUpTime}
                  onChange={e => setData(d => ({ ...d, wakeUpTime: e.target.value }))}
                  className="w-full h-10 rounded-xl border border-input bg-background px-4 text-sm font-bold text-foreground text-center focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>

              <div>
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Work window</div>
                <div className="grid grid-cols-2 gap-2">
                  {WORK_HOURS_OPTIONS.map(w => (
                    <OptionCard
                      key={w.value}
                      selected={data.workHours === w.value}
                      onClick={() => setData(d => ({ ...d, workHours: w.value }))}
                      Icon={w.Icon} label={w.label} desc={w.desc} small
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Step 3: Peak + Work type ── */}
          {step === 3 && (
            <>
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold text-foreground mb-1">How you work best</h2>
                <p className="text-xs text-muted-foreground">We'll put hard tasks at your peak</p>
              </div>

              <div className="mb-4">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Peak focus time</div>
                <div className="space-y-2">
                  {PRODUCTIVITY_OPTS.map(p => (
                    <OptionCard
                      key={p.value}
                      selected={data.productivity === p.value}
                      onClick={() => setData(d => ({ ...d, productivity: p.value }))}
                      Icon={p.Icon} label={p.label} desc={p.desc} small
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Work style</div>
                <div className="space-y-2">
                  {WORK_TYPES.map(w => (
                    <OptionCard
                      key={w.value}
                      selected={data.workType === w.value}
                      onClick={() => setData(d => ({ ...d, workType: w.value }))}
                      Icon={w.Icon} label={w.label} desc={w.desc} small
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Step 4: Goals ── */}
          {step === 4 && (
            <>
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold text-foreground mb-1">What are you working towards?</h2>
                <p className="text-xs text-muted-foreground">Select all that matter to you right now</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {GOAL_OPTIONS.map(g => {
                  const sel = data.goals.includes(g.value);
                  return (
                    <button
                      key={g.value}
                      onClick={() => toggleGoal(g.value)}
                      style={{ touchAction: "manipulation" }}
                      className={[
                        "p-3 rounded-xl border flex items-center gap-2.5 transition-all active:scale-95",
                        sel
                          ? "border-primary/40 bg-primary/5 shadow-sm"
                          : "border-border bg-background hover:bg-muted/30",
                      ].join(" ")}
                    >
                      <div className={["w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", sel ? "bg-primary/15" : "bg-muted/60"].join(" ")}>
                        <g.Icon className="w-4 h-4 text-primary" strokeWidth={1.75} />
                      </div>
                      <span className="text-xs font-semibold text-foreground leading-snug flex-1 min-w-0">{g.label}</span>
                      {sel && (
                        <div className="w-4 h-4 rounded-full gradient-brand flex items-center justify-center flex-shrink-0">
                          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {data.goals.length === 0 && (
                <p className="text-xs text-destructive text-center mt-3 font-medium">Pick at least one goal</p>
              )}
            </>
          )}

          {/* ── Step 5: Break style ── */}
          {step === 5 && (
            <>
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold text-foreground mb-1">How do you rest?</h2>
                <p className="text-xs text-muted-foreground">Good breaks make the work better</p>
              </div>
              <div className="space-y-2.5">
                {BREAK_STYLES.map(b => (
                  <OptionCard
                    key={b.value}
                    selected={data.breakStyle === b.value}
                    onClick={() => setData(d => ({ ...d, breakStyle: b.value }))}
                    Icon={b.Icon} label={b.label} desc={b.desc}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3 mt-4">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 h-12 px-4 rounded-xl border border-border/60 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
          <button
            onClick={next}
            disabled={!canProceed()}
            style={{ touchAction: "manipulation" }}
            className="flex-1 h-12 rounded-xl gradient-brand text-white text-sm font-bold flex items-center justify-center gap-2 shadow-brand disabled:opacity-40 transition-all active:scale-[0.98]"
          >
            {step === STEPS.length - 1 ? "Generate My Schedule ✨" : "Continue"}
            {step < STEPS.length - 1 && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Progress text */}
        <p className="text-center text-[11px] text-muted-foreground mt-3">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}
