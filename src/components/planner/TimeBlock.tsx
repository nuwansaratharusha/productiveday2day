import { TimeBlockData, Category, DEFAULT_CATEGORIES } from "@/data/plannerData";
import { Check, Pencil, Trash2, GripVertical, Zap } from "lucide-react";

interface TimeBlockProps {
  block: TimeBlockData;
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
  block, isActive, completed, onToggle, onEdit, onDelete,
  isDragging, isDropTarget, dropPosition,
  onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
  onTouchStart, onTouchMove, onTouchEnd,
  categories,
}: TimeBlockProps) {
  const cats = categories || DEFAULT_CATEGORIES;
  const cat = cats[block.cat] || { color: "hsl(220 14% 93%)", accent: "hsl(220 10% 48%)", icon: "📌" };

  return (
    <div
      className={`
        group relative flex items-stretch rounded-xl overflow-hidden mb-2
        bg-card border transition-all duration-200 cursor-pointer
        ${isDragging ? "opacity-40 scale-[0.98]" : ""}
        ${isActive
          ? "border-primary/25 shadow-card-hover"
          : "border-border hover:border-border hover:shadow-card-hover"
        }
        ${completed ? "opacity-55" : ""}
      `}
      style={isActive ? { boxShadow: "0 0 0 1px hsl(14 90% 48% / 0.15), 0 4px 12px 0 rgb(0 0 0 / 0.07)" } : {}}
      onClick={onToggle}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Drop indicators */}
      {isDropTarget && dropPosition === "above" && (
        <div className="absolute -top-px left-4 right-4 h-0.5 gradient-brand rounded-full z-10" />
      )}
      {isDropTarget && dropPosition === "below" && (
        <div className="absolute -bottom-px left-4 right-4 h-0.5 gradient-brand rounded-full z-10" />
      )}

      {/* Active: subtle brand top stripe */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-[2px] gradient-brand opacity-70" />
      )}

      {/* Drag handle */}
      <div
        className="flex items-center justify-center w-6 flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/25 group-hover:text-muted-foreground/50 transition-colors touch-none"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Category accent bar */}
      <div
        className="w-[3px] flex-shrink-0 my-3 rounded-full"
        style={{ background: cat.accent }}
      />

      {/* Main content */}
      <div className="py-3 px-3.5 flex-1 flex items-center gap-3 min-w-0">

        {/* Checkbox */}
        <div
          className="w-[18px] h-[18px] rounded-[5px] flex items-center justify-center flex-shrink-0 transition-all duration-200 border-[1.5px]"
          style={{
            borderColor: completed ? cat.accent : cat.accent + "80",
            background: completed ? cat.accent : "transparent",
          }}
        >
          {completed && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`font-semibold text-[13px] leading-snug transition-all duration-200 ${
                completed ? "line-through text-muted-foreground" : "text-card-foreground"
              }`}
            >
              {block.block}
            </span>

            <span
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
              style={{ background: cat.color, color: cat.accent }}
            >
              <span>{cat.icon}</span>
              {block.cat}
            </span>

            {isActive && (
              <span className="inline-flex items-center gap-0.5 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold tracking-wider animate-pulse-active">
                <Zap className="w-2.5 h-2.5" />
                NOW
              </span>
            )}
          </div>

          {block.desc && (
            <p
              className={`text-[11px] text-muted-foreground mt-0.5 leading-snug truncate ${
                completed ? "line-through" : ""
              }`}
            >
              {block.desc}
            </p>
          )}
        </div>

        {/* Time */}
        <div className="text-right flex-shrink-0">
          <div className="text-[12px] font-bold text-card-foreground leading-none">{block.time}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{block.dur}m</div>
        </div>

        {/* Actions — revealed on hover */}
        <div
          className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground/60 hover:text-foreground transition-colors"
            aria-label="Edit"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground/60 hover:text-destructive transition-colors"
            aria-label="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
