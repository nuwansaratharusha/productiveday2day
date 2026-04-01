import { useEffect, useState } from "react";
import { Coffee, Footprints, Wind, BookOpen, Headphones, Dumbbell } from "lucide-react";

const SUGGESTIONS = [
  { text: "Take a 5-min walk", icon: Footprints, color: "hsl(133 55% 38%)", bg: "hsl(133 60% 96%)" },
  { text: "Make a coffee or tea", icon: Coffee, color: "hsl(27 80% 42%)", bg: "hsl(27 80% 96%)" },
  { text: "3-min breathing", icon: Wind, color: "hsl(213 70% 40%)", bg: "hsl(213 80% 96%)" },
  { text: "Read a few pages", icon: BookOpen, color: "hsl(280 60% 40%)", bg: "hsl(280 70% 96%)" },
  { text: "Listen to a podcast", icon: Headphones, color: "hsl(340 65% 40%)", bg: "hsl(340 70% 96%)" },
  { text: "Quick stretch", icon: Dumbbell, color: "hsl(0 65% 44%)", bg: "hsl(0 70% 96%)" },
];

interface BreakSuggestionCardProps {
  blockName: string;
}

export function BreakSuggestionCard({ blockName }: BreakSuggestionCardProps) {
  const [items, setItems] = useState(SUGGESTIONS.slice(0, 3));

  useEffect(() => {
    const shuffled = [...SUGGESTIONS].sort(() => Math.random() - 0.5);
    setItems(shuffled.slice(0, 3));
  }, [blockName]);

  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-3.5 mb-3 animate-fade-in">
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="text-sm">☕</span>
        <span className="text-[11px] font-bold text-foreground">Break Ideas</span>
      </div>
      <div className="flex gap-2">
        {items.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1.5 py-2.5 px-1.5 rounded-xl transition-colors cursor-pointer hover:opacity-90"
              style={{ background: s.bg }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: s.color + "18" }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
              </div>
              <span className="text-[10px] text-center leading-tight font-medium" style={{ color: s.color }}>
                {s.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
