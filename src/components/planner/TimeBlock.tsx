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

  return (
    <div
      className={`
        group relative flex items-stretch rounded-xl overflow-hidden mb-2.5
        bg-card border cursor-pointer select-none
        transition-all duration-250 animate-stagger
        ${isDragging
          ? "opacity-40 scale-[0.97] animate-wiggle shadow-card-hover"
          : "hover-lift"
        }
        ${isActive
          ? "border-primary/20 animate-glow"
          : "border-border hover:border-primary/20"
        }
        ${completed ? "opacity-60" : ""}
      `}
      style={{
        animationDelay: `${index * 55}ms`,
        transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
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

      {/* Active top stripe */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-[2px] gradient-brand animate-pulse-active" />
      )}

      {/* Drag handle */}
      <div
        className="flex items-center justify-center w-7 flex-shrink-0 cursor-grab active:cursor-grabbing
                   text-muted-foreground/20 group-hover:text-muted-foreground/50 transition-colors touch-none"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Category accent bar */}
      <div
        className="w-[3px] flex-shrink-0 my-3 rounded-full transition-all duration-300"
        style={{
          background: cat.accent,
          boxShadow: isActive ? `0 0 8px ${cat.accent}80` : "none",
        }}
      />

      {/* Content */}
      <div className="py-3 px-3.5 flex-1 flex items-center gap-3 min-w-0">

        {/* Animated checkbox */}
        <div
          className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center flex-shrink-0
                      border-[1.5px] transition-all duration-300 ${justCompleted ? "scale-110" : ""}`}
          style={{
            borderColor: completed ? cat.accent : cat.accent + "70",
            background: completed ? cat.accent : "transparent",
            boxShadow: completed ? `0 2px 8px ${cat.accent}50` : "none",
          }}
        >
          {completed && (
            <Check
              className="w-2.5 h-2.5 text-white animate-check"
              strokeWidth={3}
            />
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`font-semibold text-[13px] leading-snug transition-all duration-300 ${
                completed ? "text-muted-foreground" : "text-card-foreground"
              }`}
              style={completed ? { textDecoration: "line-through", textDecorationColor: cat.accent + "80" } : {}}
            >
              {block.block}
            </span>

            <span
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap
                         transition-transform duration-150 group-hover:scale-[1.04]"
              style={{ background: cat.color, color: cat.accent }}
            >
              <span>{cat.icon}</span>
              {block.cat}
            </span>

            {isActive && (
              <span className="relative inline-flex items-center gap-0.5 text-[10px] bg-primary/10 text-primary
                               px-2 py-0.5 rounded-full font-bold tracking-wider animate-pulse-active now-ring">
                <Zap className="w-2.5 h-2.5" />
                NOW
              </span>
            )}
          </div>

          {block.desc && (
            <p className={`text-[11px] text-muted-foreground mt-0.5 leading-snug truncate transition-all duration-300 ${
              completed ? "opacity-60" : ""
            }`}>
              {block.desc}
            </p>
          )}
        </div>

        {/* Time */}
        <div className="text-right flex-shrink-0">
          <div className="text-[12px] font-bold text-card-foreground leading-none tabular-nums">{block.time}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">{block.dur}m</div>
        </div>

        {/* Actions */}
        <div
          className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200
                     translate-x-1 group-hover:translate-x-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground/50 hover:text-foreground
                       transition-all duration-150 hover:scale-110"
            aria-label="Edit"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground/50 hover:text-destructive
                       transition-all duration-150 hover:scale-110"
            aria-label="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
