import { useState } from "react";
import { Sun, Briefcase, Brain, Target, Coffee, ArrowRight, ArrowLeft, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import zipLogo from "@/assets/zip-logo.png";

export interface OnboardingData {
  wakeUpTime: string;
  workType: "deep" | "meetings" | "mixed";
  productivity: "morning" | "evening";
  goals: string[];
  breakStyle: "short" | "long" | "frequent";
}

interface OnboardingWizardProps {
  onComplete: (data: OnboardingData) => void;
}

const WAKE_PRESETS = [
  { label: "5:00 AM", value: "05:00" },
  { label: "5:30 AM", value: "05:30" },
  { label: "6:00 AM", value: "06:00" },
  { label: "6:30 AM", value: "06:30" },
  { label: "7:00 AM", value: "07:00" },
  { label: "7:30 AM", value: "07:30" },
  { label: "8:00 AM", value: "08:00" },
  { label: "8:30 AM", value: "08:30" },
];

const WORK_TYPES = [
  { value: "deep" as const, label: "Deep Work", desc: "Long focused sessions, minimal interruptions", icon: "🧠" },
  { value: "meetings" as const, label: "Meetings Heavy", desc: "Lots of calls, client sessions, outreach", icon: "📞" },
  { value: "mixed" as const, label: "Mixed", desc: "Balance of focused work and collaborative time", icon: "⚡" },
];

const PRODUCTIVITY_TYPES = [
  { value: "morning" as const, label: "Morning Person", desc: "Peak focus before noon", icon: "🌅" },
  { value: "evening" as const, label: "Night Owl", desc: "Best work in the afternoon / evening", icon: "🌙" },
];

const GOAL_OPTIONS = [
  { value: "business", label: "Business Growth", icon: "💼" },
  { value: "study", label: "Study & Learning", icon: "📚" },
  { value: "personal", label: "Personal Growth", icon: "🌱" },
  { value: "health", label: "Health & Fitness", icon: "💪" },
  { value: "creative", label: "Creative Projects", icon: "🎨" },
  { value: "networking", label: "Networking", icon: "🤝" },
];

const BREAK_STYLES = [
  { value: "short" as const, label: "Short & Sweet", desc: "15-min breaks, stay in the zone", icon: "⚡" },
  { value: "long" as const, label: "Deep Rest", desc: "30–45 min breaks, full recharge", icon: "🧘" },
  { value: "frequent" as const, label: "Frequent Micro", desc: "10-min breaks every hour", icon: "🔄" },
];

const STEPS = [
  { label: "Wake Up", icon: Sun },
  { label: "Work Style", icon: Briefcase },
  { label: "Peak Hours", icon: Brain },
  { label: "Goals", icon: Target },
  { label: "Breaks", icon: Coffee },
];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    wakeUpTime: "06:00",
    workType: "mixed",
    productivity: "morning",
    goals: ["business"],
    breakStyle: "short",
  });

  const formatDisplay = (val: string) => {
    const [h, m] = val.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
  };

  const toggleGoal = (goal: string) => {
    setData(prev => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal],
    }));
  };

  const canProceed = () => {
    if (step === 3) return data.goals.length > 0;
    return true;
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else onComplete(data);
  };

  const back = () => {
    if (step > 0) setStep(s => s - 1);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-[420px]">

        {/* Brand mark */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center shadow-card">
            <img src={zipLogo} alt="ZIP" className="h-[14px] invert brightness-200" />
          </div>
          <span className="text-sm font-bold text-foreground tracking-tight">ZIP</span>
          <span className="text-muted-foreground text-sm">·</span>
          <span className="text-sm text-muted-foreground">Daily Operating System</span>
        </div>

        {/* Step progress */}
        <div className="flex items-center justify-between mb-6 px-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isDone = i < step;
            const isActive = i === step;
            return (
              <div key={s.label} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isDone
                        ? "gradient-brand"
                        : isActive
                        ? "bg-card border-2 border-primary shadow-card"
                        : "bg-muted border-2 border-transparent"
                    }`}
                  >
                    {isDone
                      ? <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                      : <Icon className={`w-3.5 h-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    }
                  </div>
                  <span className={`text-[9px] font-semibold transition-colors ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-[2px] w-8 mx-1 mb-4 rounded-full transition-all duration-300 ${
                      i < step ? "gradient-brand" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div
          className="bg-card rounded-2xl border border-border shadow-card p-6 animate-fade-in"
          key={step}
        >
          {/* Step 0: Wake Up */}
          {step === 0 && (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-xl gradient-brand-soft flex items-center justify-center mx-auto mb-3">
                  <Sun className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-1">When do you wake up?</h2>
                <p className="text-sm text-muted-foreground">We'll build your schedule around this.</p>
              </div>
              <div className="grid grid-cols-4 gap-1.5 mb-4">
                {WAKE_PRESETS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setData(prev => ({ ...prev, wakeUpTime: p.value }))}
                    className={`py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      data.wakeUpTime === p.value
                        ? "gradient-brand text-white shadow-card font-bold"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[11px] text-muted-foreground font-medium">or set custom</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <input
                type="time"
                value={data.wakeUpTime}
                onChange={e => setData(prev => ({ ...prev, wakeUpTime: e.target.value }))}
                className="w-full h-11 rounded-xl border border-input bg-background px-4 text-base font-bold text-foreground text-center focus:outline-none focus:ring-2 focus:ring-ring/50 mb-3"
              />
              <p className="text-center text-xs text-muted-foreground">
                Day starts at <span className="font-bold text-foreground">{formatDisplay(data.wakeUpTime)}</span>
              </p>
            </>
          )}

          {/* Step 1: Work Type */}
          {step === 1 && (
            <>
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-xl gradient-brand-soft flex items-center justify-center mx-auto mb-3">
                  <Briefcase className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-1">How do you work?</h2>
                <p className="text-sm text-muted-foreground">This shapes how we structure your blocks.</p>
              </div>
              <div className="space-y-2">
                {WORK_TYPES.map(w => (
                  <button
                    key={w.value}
                    onClick={() => setData(prev => ({ ...prev, workType: w.value }))}
                    className={`w-full text-left p-3.5 rounded-xl transition-all duration-200 flex items-center gap-3 border ${
                      data.workType === w.value
                        ? "border-primary/30 bg-primary/5 shadow-card"
                        : "border-border bg-background hover:border-border hover:bg-muted/30"
                    }`}
                  >
                    <span className="text-xl flex-shrink-0">{w.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-sm ${data.workType === w.value ? "text-foreground" : "text-foreground"}`}>
                        {w.label}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{w.desc}</div>
                    </div>
                    {data.workType === w.value && (
                      <div className="w-5 h-5 rounded-full gradient-brand flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 2: Productivity */}
          {step === 2 && (
            <>
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-xl gradient-brand-soft flex items-center justify-center mx-auto mb-3">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-1">When are you most productive?</h2>
                <p className="text-sm text-muted-foreground">We'll schedule hard work during peak hours.</p>
              </div>
              <div className="space-y-2">
                {PRODUCTIVITY_TYPES.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setData(prev => ({ ...prev, productivity: p.value }))}
                    className={`w-full text-left p-4 rounded-xl transition-all duration-200 flex items-center gap-3.5 border ${
                      data.productivity === p.value
                        ? "border-primary/30 bg-primary/5 shadow-card"
                        : "border-border bg-background hover:border-border hover:bg-muted/30"
                    }`}
                  >
                    <span className="text-2xl flex-shrink-0">{p.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-foreground">{p.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{p.desc}</div>
                    </div>
                    {data.productivity === p.value && (
                      <div className="w-5 h-5 rounded-full gradient-brand flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 3: Goals */}
          {step === 3 && (
            <>
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-xl gradient-brand-soft flex items-center justify-center mx-auto mb-3">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-1">What are your main goals?</h2>
                <p className="text-sm text-muted-foreground">Select all that apply.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {GOAL_OPTIONS.map(g => {
                  const isSelected = data.goals.includes(g.value);
                  return (
                    <button
                      key={g.value}
                      onClick={() => toggleGoal(g.value)}
                      className={`p-3.5 rounded-xl transition-all duration-200 text-left flex items-start gap-2.5 border ${
                        isSelected
                          ? "border-primary/30 bg-primary/5 shadow-card"
                          : "border-border bg-background hover:bg-muted/30"
                      }`}
                    >
                      <span className="text-lg flex-shrink-0 mt-0.5">{g.icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-foreground leading-snug">{g.label}</span>
                      </div>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full gradient-brand flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {data.goals.length === 0 && (
                <p className="text-xs text-destructive text-center mt-3 font-medium">
                  Please select at least one goal
                </p>
              )}
            </>
          )}

          {/* Step 4: Break Style */}
          {step === 4 && (
            <>
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-xl gradient-brand-soft flex items-center justify-center mx-auto mb-3">
                  <Coffee className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-1">How do you like your breaks?</h2>
                <p className="text-sm text-muted-foreground">We'll space rest time accordingly.</p>
              </div>
              <div className="space-y-2">
                {BREAK_STYLES.map(b => (
                  <button
                    key={b.value}
                    onClick={() => setData(prev => ({ ...prev, breakStyle: b.value }))}
                    className={`w-full text-left p-3.5 rounded-xl transition-all duration-200 flex items-center gap-3 border ${
                      data.breakStyle === b.value
                        ? "border-primary/30 bg-primary/5 shadow-card"
                        : "border-border bg-background hover:border-border hover:bg-muted/30"
                    }`}
                  >
                    <span className="text-xl flex-shrink-0">{b.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-foreground">{b.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{b.desc}</div>
                    </div>
                    {data.breakStyle === b.value && (
                      <div className="w-5 h-5 rounded-full gradient-brand flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="flex gap-2.5 mt-6">
            {step > 0 && (
              <Button
                variant="outline"
                onClick={back}
                className="h-11 px-5 gap-2 font-semibold rounded-xl text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            )}
            <Button
              onClick={next}
              disabled={!canProceed()}
              className={`flex-1 h-11 gradient-brand text-white font-bold text-sm gap-2 border-0 rounded-xl transition-opacity ${
                !canProceed() ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {step === STEPS.length - 1 ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate My Schedule
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-5">
          <span className="font-semibold text-foreground">ZIP Solutions</span>
          {" "}— The Art of Hospitality
        </p>
      </div>
    </div>
  );
}
