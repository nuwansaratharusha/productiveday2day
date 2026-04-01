import { useState } from "react";
import { Sun, Briefcase, Brain, Target, Coffee, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  { value: "evening" as const, label: "Night Owl", desc: "Best work in the afternoon/evening", icon: "🌙" },
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
  { value: "long" as const, label: "Deep Rest", desc: "30-45 min breaks, full recharge", icon: "🧘" },
  { value: "frequent" as const, label: "Frequent Micro", desc: "10-min breaks every hour", icon: "🔄" },
];

const STEPS = ["Wake Up", "Work Style", "Peak Hours", "Goals", "Breaks"];

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
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className={`h-1.5 w-full rounded-full transition-all duration-500 ${
                  i <= step ? "gradient-brand" : "bg-muted"
                }`}
              />
              <span className={`text-[10px] font-semibold transition-colors ${
                i <= step ? "text-foreground" : "text-muted-foreground"
              }`}>
                {s}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm animate-fade-in" key={step}>
          {/* Step 0: Wake Up */}
          {step === 0 && (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4">
                  <Sun className="w-7 h-7 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-extrabold text-foreground mb-1">When do you wake up?</h1>
                <p className="text-muted-foreground text-sm">We'll build your schedule around this.</p>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {WAKE_PRESETS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setData(prev => ({ ...prev, wakeUpTime: p.value }))}
                    className={`py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      data.wakeUpTime === p.value
                        ? "gradient-brand text-primary-foreground scale-[1.03] shadow-md"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[11px] text-muted-foreground font-medium">or custom</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <input
                type="time"
                value={data.wakeUpTime}
                onChange={e => setData(prev => ({ ...prev, wakeUpTime: e.target.value }))}
                className="w-full h-12 rounded-xl border border-input bg-background px-4 text-lg font-bold text-foreground text-center focus:outline-none focus:ring-2 focus:ring-ring mb-3"
              />
              <div className="text-center text-sm text-muted-foreground">
                Your day starts at <span className="font-bold text-foreground">{formatDisplay(data.wakeUpTime)}</span>
              </div>
            </>
          )}

          {/* Step 1: Work Type */}
          {step === 1 && (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-7 h-7 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-extrabold text-foreground mb-1">How do you work?</h1>
                <p className="text-muted-foreground text-sm">This shapes how we structure your blocks.</p>
              </div>
              <div className="space-y-2.5">
                {WORK_TYPES.map(w => (
                  <button
                    key={w.value}
                    onClick={() => setData(prev => ({ ...prev, workType: w.value }))}
                    className={`w-full text-left p-4 rounded-xl transition-all duration-200 flex items-center gap-3.5 ${
                      data.workType === w.value
                        ? "gradient-brand text-primary-foreground shadow-md scale-[1.01]"
                        : "bg-muted/30 text-foreground hover:bg-muted/50 border border-border"
                    }`}
                  >
                    <span className="text-2xl">{w.icon}</span>
                    <div>
                      <div className="font-bold text-sm">{w.label}</div>
                      <div className={`text-xs ${data.workType === w.value ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {w.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 2: Productivity */}
          {step === 2 && (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-7 h-7 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-extrabold text-foreground mb-1">When are you most productive?</h1>
                <p className="text-muted-foreground text-sm">We'll put your hardest work during peak hours.</p>
              </div>
              <div className="space-y-2.5">
                {PRODUCTIVITY_TYPES.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setData(prev => ({ ...prev, productivity: p.value }))}
                    className={`w-full text-left p-5 rounded-xl transition-all duration-200 flex items-center gap-4 ${
                      data.productivity === p.value
                        ? "gradient-brand text-primary-foreground shadow-md scale-[1.01]"
                        : "bg-muted/30 text-foreground hover:bg-muted/50 border border-border"
                    }`}
                  >
                    <span className="text-3xl">{p.icon}</span>
                    <div>
                      <div className="font-bold text-sm">{p.label}</div>
                      <div className={`text-xs ${data.productivity === p.value ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {p.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 3: Goals */}
          {step === 3 && (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4">
                  <Target className="w-7 h-7 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-extrabold text-foreground mb-1">What are your main goals?</h1>
                <p className="text-muted-foreground text-sm">Select all that apply. We'll prioritize these.</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {GOAL_OPTIONS.map(g => (
                  <button
                    key={g.value}
                    onClick={() => toggleGoal(g.value)}
                    className={`p-4 rounded-xl transition-all duration-200 text-center ${
                      data.goals.includes(g.value)
                        ? "gradient-brand text-primary-foreground shadow-md scale-[1.02]"
                        : "bg-muted/30 text-foreground hover:bg-muted/50 border border-border"
                    }`}
                  >
                    <span className="text-2xl block mb-1">{g.icon}</span>
                    <span className="text-xs font-bold">{g.label}</span>
                  </button>
                ))}
              </div>
              {data.goals.length === 0 && (
                <p className="text-xs text-destructive text-center mt-3">Select at least one goal</p>
              )}
            </>
          )}

          {/* Step 4: Break Style */}
          {step === 4 && (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4">
                  <Coffee className="w-7 h-7 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-extrabold text-foreground mb-1">How do you like your breaks?</h1>
                <p className="text-muted-foreground text-sm">We'll space rest time accordingly.</p>
              </div>
              <div className="space-y-2.5">
                {BREAK_STYLES.map(b => (
                  <button
                    key={b.value}
                    onClick={() => setData(prev => ({ ...prev, breakStyle: b.value }))}
                    className={`w-full text-left p-4 rounded-xl transition-all duration-200 flex items-center gap-3.5 ${
                      data.breakStyle === b.value
                        ? "gradient-brand text-primary-foreground shadow-md scale-[1.01]"
                        : "bg-muted/30 text-foreground hover:bg-muted/50 border border-border"
                    }`}
                  >
                    <span className="text-2xl">{b.icon}</span>
                    <div>
                      <div className="font-bold text-sm">{b.label}</div>
                      <div className={`text-xs ${data.breakStyle === b.value ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {b.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <Button variant="outline" onClick={back} className="h-11 px-5 gap-2 font-semibold rounded-xl">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            )}
            <Button
              onClick={next}
              disabled={!canProceed()}
              className="flex-1 h-11 gradient-brand text-primary-foreground font-bold text-sm gap-2 border-0 rounded-xl"
            >
              {step === STEPS.length - 1 ? (
                <>
                  <Sparkles className="w-4 h-4" /> Generate My Schedule
                </>
              ) : (
                <>
                  Continue <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-5">
          <span className="font-bold text-primary">ZIP Solutions</span> — The Art of Hospitality
        </p>
      </div>
    </div>
  );
}
