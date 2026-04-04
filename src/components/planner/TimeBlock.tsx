import { useState } from "react";
import { TimeBlockData, Category, DEFAULT_CATEGORIES } from "@/data/plannerData";
import { Check, Pencil, Trash2, GripVertical, Zap } from "lucide-react";

interface TimeBlockProps {
  block: TimeBlockData;
  index: number;
  isActive: boolean;
  completed: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDragging?: boolean;
  isDropTarget?: boolean;
  dropPosition?: "above" | "below" | null;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  categories?: Record<string, Category>;
}

export function TimeBlock({
  block, index, isActive, completed, onToggle, onEdit, onDelete,
  isDragging, isDropTarget, dropPosition,
  onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
  onTouchStart, onTouchMove, onTouchEnd,
  categories,
}: TimeBlockProps) {
  const cats = categories || DEFAULT_CATEGORIES;
  const cat = cats[block.cat] || { color: "hsl(220 14% 93%)", accent: "hsl(220 10% 48%)", icon: "📌" };

  const [justCompleted, setJustCompleted] = useState(false);

  const handleToggle = () => {
    if (!completed) {
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 700);
    }
    onToggle();
  };

  // Parse start time from "9:00 AM – 10:00 AM"
  const startTime = block.time.split("–")[0].trim();

  return (
    <div
      className={[
        "group relative flex items-stretch rounded-2xl overflow-hidden mb-2",
        "bg-card border cursor-pointer select-none",
        "transition-all duration-200 animate-stagger",
        isDragging ? "opacity-40 scale-[0.97] shadow-card-hover" : "hover:shadow-card-hover hover:-translate-y-[1px]",
        isActive ? "border-primary/25 animate-glow" : "border-border/50 hover:border-border",
        completed ? "opacity-55" : "",
      ].join(" ")}
      style={{ animationDelay: `${index * 45}ms` }}
      onClick={handleToggle}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Drop indicators */}
      {isDropTarget && dropPosition === "above" && (
        <div className="absolute -top-px left-4 right-4 h-0.5 gradient-brand rounded-full z-10 animate-scale-in" />
      )}
      {isDropTarget && dropPosition === "below" && (
        <div className="absolute -bottom-px left-4 right-4 h-0.5 gradient-brand rounded-full z-10 animate-scale-in" />
      )}

      {/* Active block top glow stripe */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-[2px] gradient-brand animate-pulse-active" />
      )}

      {/* Left: category color bar + drag handle */}
      <div className="flex items-stretch">
        {/* Drag handle */}
        <div
          className="flex items-center justify-center w-6 flex-shrink-0 cursor-grab active:cursor-grabbing
                     text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors touch-none"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <GripVertical className="w-3 h-3" />
        </div>

        {/* Color accent bar */}
        <div
          className="w-1 flex-shrink-0 my-3 rounded-full transition-all duration-300"
          style={{
            background: cat.accent,
            opacity: completed ? 0.4 : 1,
            boxShadow: isActive ? `0 0 8px ${cat.accent}60` : "none",
          }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center gap-3 px-3.5 py-3 min-w-0">

        {/* Checkbox */}
        <div
          className={[
            "w-[18px] h-[18px] rounded-[5px] flex items-center justify-center flex-shrink-0",
            "border-[1.5px] transition-all duration-300",
            justCompleted ? "scale-110" : "",
          ].join(" ")}
          style={{
            borderColor: completed ? cat.accent : cat.accent + "60",
            background: completed ? cat.accent : "transparent",
            boxShadow: completed ? `0 2px 8px ${cat.accent}40` : "none",
          }}
        >
          {completed && (
            <Check className="w-2.5 h-2.5 text-white animate-check" strokeWidth={3} />
          )}
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={[
                "font-semibold text-[13.5px] leading-snug transition-all duration-300",
                completed ? "text-muted-foreground" : "text-card-foreground",
              ].join(" ")}
              style={completed ? { textDecoration: "line-through", textDecorationColor: cat.accent + "70" } : {}}
            >
              {block.block}
            </span>

            {isActive && (
              <span className="relative inline-flex items-center gap-0.5 text-[10px] bg-primary/10 text-primary
                               px-1.5 py-0.5 rounded-full font-bold tracking-wider animate-pulse-active now-ring">
                <Zap className="w-2.5 h-2.5" />
                NOW
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            {block.desc && (
              <p className={[
                "text-[11px] text-muted-foreground leading-snug truncate transition-all duration-300",
                completed ? "opacity-50" : "",
              ].join(" ")}>
                {block.desc}
              </p>
            )}
          </div>
        </div>

        {/* Right: time + category + actions */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {/* Time + duration */}
          <div className="text-right">
            <div className="text-[11px] font-bold text-foreground tabular-nums leading-none">{startTime}</div>
            <div className="text-[10px] text-muted-foreground tabular-nums mt-0.5">{block.dur}m</div>
          </div>

          {/* Category badge */}
          <span
            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap
                       transition-transform duration-150 group-hover:scale-[1.03]"
            style={{ background: cat.color, color: cat.accent }}
          >
            <span className="text-[9px]">{cat.icon}</span>
            {block.cat}
          </span>
        </div>

        {/* Action buttons — slide in on hover */}
        <div
          className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-150
                     translate-x-1 group-hover:translate-x-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground/40 hover:text-foreground transition-all duration-150"
            aria-label="Edit"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive transition-all duration-150"
            aria-label="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
