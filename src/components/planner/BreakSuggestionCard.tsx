import { useEffect, useState } from "react";
import { Coffee, Footprints, Wind, BookOpen, Headphones, Dumbbell } from "lucide-react";

const SUGGESTIONS = [
  { text: "Take a 5-min walk outside", icon: Footprints, color: "hsl(133 77% 35%)" },
  { text: "Make a coffee or tea", icon: Coffee, color: "hsl(27 100% 45%)" },
  { text: "3-min breathing exercise", icon: Wind, color: "hsl(213 77% 37%)" },
  { text: "Read a few pages", icon: BookOpen, color: "hsl(280 77% 35%)" },
  { text: "Listen to a podcast clip", icon: Headphones, color: "hsl(340 72% 39%)" },
  { text: "Quick stretching session", icon: Dumbbell, color: "hsl(0 77% 47%)" },
];

interface BreakSuggestionCardProps {
  blockName: string;
}

export function BreakSuggestionCard({ blockName }: BreakSuggestionCardProps) {
  const [items, setItems] = useState(SUGGESTIONS.slice(0, 3));

  useEffect(() => {
    // Shuffle and pick 3
    const shuffled = [...SUGGESTIONS].sort(() => Math.random() - 0.5);
    setItems(shuffled.slice(0, 3));
  }, [blockName]);

  return (
    <div className="bg-card rounded-xl border border-border p-3 mb-2 animate-fade-in">
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
        💡 Break Ideas
      </div>
      <div className="flex gap-2">
        {items.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1.5 p-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer"
            >
              <Icon className="w-4 h-4" style={{ color: s.color }} />
              <span className="text-[10px] text-center text-muted-foreground font-medium leading-tight">
                {s.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
