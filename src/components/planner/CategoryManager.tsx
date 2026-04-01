import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Palette } from "lucide-react";
import { Category } from "@/data/plannerData";

interface CategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Record<string, Category>;
  onSave: (categories: Record<string, Category>) => void;
}

const PRESET_COLORS = [
  { bg: "46 100% 94%", accent: "40 94% 56%" },
  { bg: "213 100% 94%", accent: "213 77% 37%" },
  { bg: "0 100% 95%", accent: "0 77% 47%" },
  { bg: "280 100% 95%", accent: "280 77% 35%" },
  { bg: "133 100% 95%", accent: "133 77% 35%" },
  { bg: "187 100% 95%", accent: "187 80% 28%" },
  { bg: "27 100% 94%", accent: "27 100% 45%" },
  { bg: "340 100% 95%", accent: "340 72% 39%" },
  { bg: "160 100% 94%", accent: "160 77% 30%" },
  { bg: "60 100% 94%", accent: "60 80% 40%" },
];

const EMOJI_OPTIONS = ["☀", "📖", "💰", "⚙", "🔧", "🚀", "🎯", "✦", "🎓", "💪", "🎨", "🤝", "💡", "🧠", "❤", "🔥"];

export function CategoryManager({ open, onOpenChange, categories, onSave }: CategoryManagerProps) {
  const [cats, setCats] = useState<Record<string, Category>>({ ...categories });
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("🎯");
  const [newColorIdx, setNewColorIdx] = useState(0);

  const handleAdd = () => {
    if (!newName.trim() || cats[newName]) return;
    const color = PRESET_COLORS[newColorIdx % PRESET_COLORS.length];
    setCats(prev => ({
      ...prev,
      [newName.trim()]: {
        color: `hsl(${color.bg})`,
        accent: `hsl(${color.accent})`,
        icon: newIcon,
      },
    }));
    setNewName("");
    setNewColorIdx(i => i + 1);
  };

  const handleDelete = (name: string) => {
    const next = { ...cats };
    delete next[name];
    setCats(next);
  };

  const handleSave = () => {
    onSave(cats);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" /> Manage Categories
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {Object.entries(cats).map(([name, cat]) => (
            <div
              key={name}
              className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-muted/20"
            >
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                style={{ background: cat.color, color: cat.accent }}
              >
                {cat.icon}
              </span>
              <span className="flex-1 text-sm font-semibold text-foreground">{name}</span>
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.accent }} />
              <button
                onClick={() => handleDelete(name)}
                className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-4 mt-4 space-y-3">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Add New Category
          </Label>
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Category name"
            onKeyDown={e => e.key === "Enter" && handleAdd()}
          />
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Icon</Label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setNewIcon(emoji)}
                  className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-all ${
                    newIcon === emoji
                      ? "bg-primary text-primary-foreground scale-110"
                      : "bg-muted/50 hover:bg-muted"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Color</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setNewColorIdx(i)}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    newColorIdx === i ? "ring-2 ring-ring scale-110" : ""
                  }`}
                  style={{ background: `hsl(${c.accent})` }}
                />
              ))}
            </div>
          </div>
          <Button
            onClick={handleAdd}
            disabled={!newName.trim()}
            variant="outline"
            className="w-full gap-2"
          >
            <Plus className="w-4 h-4" /> Add Category
          </Button>
        </div>

        <Button onClick={handleSave} className="w-full gradient-brand text-primary-foreground font-semibold mt-2">
          Save Categories
        </Button>
      </DialogContent>
    </Dialog>
  );
}
