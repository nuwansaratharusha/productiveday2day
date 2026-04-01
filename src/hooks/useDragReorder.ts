import { useState, useRef, useCallback } from "react";

interface DragState {
  dragIndex: number | null;
  dropIndex: number | null;
  dropPosition: "above" | "below" | null;
}

export function useDragReorder(itemCount: number, onReorder: (fromIndex: number, toIndex: number) => void) {
  const [dragState, setDragState] = useState<DragState>({
    dragIndex: null,
    dropIndex: null,
    dropPosition: null,
  });

  const touchState = useRef<{
    active: boolean;
    startIndex: number;
    startY: number;
    currentY: number;
    clone: HTMLElement | null;
  }>({ active: false, startIndex: -1, startY: 0, currentY: 0, clone: null });

  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((index: number) => (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    setDragState({ dragIndex: index, dropIndex: null, dropPosition: null });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragState({ dragIndex: null, dropIndex: null, dropPosition: null });
  }, []);

  const handleDragOver = useCallback((index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? "above" : "below";
    setDragState(prev => ({ ...prev, dropIndex: index, dropPosition: position }));
  }, []);

  const handleDragLeave = useCallback((index: number) => (e: React.DragEvent) => {
    const related = e.relatedTarget as HTMLElement | null;
    if (!related || !(e.currentTarget as HTMLElement).contains(related)) {
      setDragState(prev => prev.dropIndex === index ? { ...prev, dropIndex: null, dropPosition: null } : prev);
    }
  }, []);

  const handleDrop = useCallback((index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const fromIndex = Number(e.dataTransfer.getData("text/plain"));
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    let toIndex = e.clientY < midY ? index : index + 1;
    if (fromIndex < toIndex) toIndex--;
    if (fromIndex !== toIndex && fromIndex >= 0 && fromIndex < itemCount) {
      onReorder(fromIndex, toIndex);
    }
    setDragState({ dragIndex: null, dropIndex: null, dropPosition: null });
  }, [itemCount, onReorder]);

  const handleTouchStart = useCallback((index: number) => (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const target = (e.currentTarget as HTMLElement).closest("[draggable]") as HTMLElement;
    if (!target) return;

    touchState.current = {
      active: false,
      startIndex: index,
      startY: touch.clientY,
      currentY: touch.clientY,
      clone: null,
    };

    const timer = setTimeout(() => {
      touchState.current.active = true;
      const clone = target.cloneNode(true) as HTMLElement;
      clone.style.position = "fixed";
      clone.style.left = `${target.getBoundingClientRect().left}px`;
      clone.style.width = `${target.offsetWidth}px`;
      clone.style.top = `${touch.clientY - target.offsetHeight / 2}px`;
      clone.style.zIndex = "9999";
      clone.style.opacity = "0.9";
      clone.style.pointerEvents = "none";
      clone.style.boxShadow = "0 8px 32px rgba(0,0,0,0.18)";
      clone.style.transform = "scale(1.03)";
      clone.style.transition = "box-shadow 0.2s, transform 0.2s";
      clone.style.borderRadius = "0.75rem";
      document.body.appendChild(clone);
      touchState.current.clone = clone;
      target.style.opacity = "0.4";
      setDragState({ dragIndex: index, dropIndex: null, dropPosition: null });
    }, 180);

    target.dataset.touchTimer = String(timer);
  }, []);

  const handleTouchMove = useCallback((_index: number) => (e: React.TouchEvent) => {
    const ts = touchState.current;
    if (!ts.active) {
      const dy = Math.abs(e.touches[0].clientY - ts.startY);
      if (dy > 10) {
        const target = (e.currentTarget as HTMLElement).closest("[draggable]") as HTMLElement;
        if (target?.dataset.touchTimer) clearTimeout(Number(target.dataset.touchTimer));
      }
      return;
    }

    e.preventDefault();
    const touch = e.touches[0];
    ts.currentY = touch.clientY;

    if (ts.clone) {
      const target = (e.currentTarget as HTMLElement).closest("[draggable]") as HTMLElement;
      ts.clone.style.top = `${touch.clientY - (target?.offsetHeight || 40) / 2}px`;
    }

    if (!containerRef.current) return;
    const items = containerRef.current.querySelectorAll("[draggable]");
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        const midY = rect.top + rect.height / 2;
        const position = touch.clientY < midY ? "above" : "below";
        setDragState(prev => ({ ...prev, dropIndex: i, dropPosition: position }));
        break;
      }
    }
  }, []);

  const handleTouchEnd = useCallback((_index: number) => (e: React.TouchEvent) => {
    const ts = touchState.current;
    const target = (e.currentTarget as HTMLElement).closest("[draggable]") as HTMLElement;
    if (target?.dataset.touchTimer) clearTimeout(Number(target.dataset.touchTimer));

    if (ts.clone) {
      document.body.removeChild(ts.clone);
      ts.clone = null;
    }
    if (target) target.style.opacity = "";

    if (ts.active && containerRef.current) {
      const items = containerRef.current.querySelectorAll("[draggable]");
      for (let i = 0; i < items.length; i++) {
        const rect = items[i].getBoundingClientRect();
        if (ts.currentY >= rect.top && ts.currentY <= rect.bottom) {
          const midY = rect.top + rect.height / 2;
          let toIndex = ts.currentY < midY ? i : i + 1;
          const fromIndex = ts.startIndex;
          if (fromIndex < toIndex) toIndex--;
          if (fromIndex !== toIndex && fromIndex >= 0 && fromIndex < itemCount) {
            onReorder(fromIndex, toIndex);
          }
          break;
        }
      }
    }

    touchState.current = { active: false, startIndex: -1, startY: 0, currentY: 0, clone: null };
    setDragState({ dragIndex: null, dropIndex: null, dropPosition: null });
  }, [itemCount, onReorder]);

  return {
    containerRef,
    dragState,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
