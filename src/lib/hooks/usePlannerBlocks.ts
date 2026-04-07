// =============================================================
// ProductiveDay — Planner Blocks Hook (Date-Specific v2)
// =============================================================
// Each calendar day has its own independent set of blocks.
// History is fully preserved — no midnight reset.
//
// Encoding:
//   tags[0] = "planner-block"   (sentinel)
//   tags[1] = "YYYY-MM-DD"      (specific date, e.g. "2026-04-07")
//   tags[2] = timeStr           → "9:00 AM – 10:00 AM"
//   tags[3] = category          → "Personal"
//
// Auto-copy: when navigating to a date with no blocks, copies
// from the most recent past date that has blocks.
// =============================================================

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import type { TimeBlockData } from "@/data/plannerData";
import type { TaskInsert } from "@/lib/types/database";

const PLANNER_TAG = "planner-block";

// ─── Helpers ──────────────────────────────────────────────────

function isUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function isDateString(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function taskToBlock(task: {
  id: string;
  title: string;
  description: string | null;
  estimated_minutes: number | null;
  tags: string[];
  status: string;
  completed_at: string | null;
}): TimeBlockData {
  const tags = task.tags || [];
  return {
    id: task.id,
    block: task.title,
    desc: task.description || "",
    dur: task.estimated_minutes || 30,
    time: tags[2] || "",
    cat: tags[3] || "Personal",
  };
}

function blockToInsert(
  block: TimeBlockData,
  dateStr: string,
  index: number,
  userId: string
): TaskInsert & { user_id: string } {
  return {
    title: block.block,
    description: block.desc || null,
    estimated_minutes: block.dur,
    tags: [PLANNER_TAG, dateStr, block.time, block.cat],
    sort_order: index,
    status: "todo",
    user_id: userId,
  };
}

// ─── Hook Interface ────────────────────────────────────────────

export interface UsePlannerBlocksReturn {
  blocks: TimeBlockData[];
  completed: Record<string, boolean>;
  hasBlocks: boolean;
  hasAnyBlocks: boolean;
  loading: boolean;
  saveBlocks: (newBlocks: TimeBlockData[]) => Promise<void>;
  toggleComplete: (blockId: string) => Promise<void>;
  bulkCreate: (schedule: { weekday: TimeBlockData[]; weekend: TimeBlockData[] }) => Promise<void>;
  clearAllBlocks: () => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────

export function usePlannerBlocks(selectedDate: string): UsePlannerBlocksReturn {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [blocks, setBlocks] = useState<TimeBlockData[]>([]);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [hasAnyBlocks, setHasAnyBlocks] = useState(false);
  const [loading, setLoading] = useState(true);

  const rowIdsRef = useRef<Set<string>>(new Set());
  // Suppress realtime refetch when we ourselves just mutated the DB
  const suppressRealtimeRef = useRef(false);

  // ── Fetch blocks for selectedDate ──────────────────────────
  // silent=true → background refresh (no loading skeleton, used by realtime)
  const fetchBlocks = useCallback(async (silent = false) => {
    if (!user) { setLoading(false); return; }
    if (!silent) setLoading(true);

    // Fetch ALL planner blocks (need all dates for auto-copy logic)
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, description, estimated_minutes, tags, status, completed_at, sort_order")
      .eq("user_id", user.id)
      .contains("tags", [PLANNER_TAG])
      .order("sort_order", { ascending: true });

    if (error || !data) { setLoading(false); return; }

    // Only consider date-specific blocks (tags[1] is YYYY-MM-DD)
    const dateTasks = data.filter(t => isDateString((t.tags || [])[1] || ""));

    setHasAnyBlocks(dateTasks.length > 0);

    // Get blocks for the selected date
    let dayTasks = dateTasks.filter(t => (t.tags || [])[1] === selectedDate);

    // Auto-copy from most recent past date if this date has no blocks
    if (dayTasks.length === 0 && dateTasks.length > 0) {
      // Find unique dates earlier than or equal to selectedDate
      const pastDates = [
        ...new Set(
          dateTasks
            .map(t => (t.tags || [])[1] as string)
            .filter(d => !!d && d < selectedDate)
        ),
      ].sort().reverse();

      if (pastDates.length > 0) {
        const mostRecentDate = pastDates[0];
        const sourceTasks = dateTasks.filter(t => (t.tags || [])[1] === mostRecentDate);

        // Insert copies for selectedDate
        const inserts = sourceTasks.map((t, i) => ({
          title: t.title,
          description: t.description,
          estimated_minutes: t.estimated_minutes,
          tags: [PLANNER_TAG, selectedDate, (t.tags || [])[2] || "", (t.tags || [])[3] || "Personal"],
          sort_order: i,
          status: "todo" as const,
          user_id: user.id,
        }));

        const { data: inserted } = await supabase
          .from("tasks")
          .insert(inserts)
          .select("id, title, description, estimated_minutes, tags, status, completed_at, sort_order");

        if (inserted) {
          dayTasks = inserted;
          setHasAnyBlocks(true);
        }
      }
    }

    const newBlocks: TimeBlockData[] = [];
    const completedMap: Record<string, boolean> = {};
    const newRowIds = new Set<string>();

    for (const task of dayTasks) {
      newBlocks.push(taskToBlock(task));
      newRowIds.add(task.id);
      if (task.status === "done") {
        completedMap[task.id] = true;
      }
    }

    rowIdsRef.current = newRowIds;
    setBlocks(newBlocks);
    setCompleted(completedMap);
    setLoading(false);
  }, [user, supabase, selectedDate]);

  // Fetch when user or date changes
  useEffect(() => {
    if (user) {
      fetchBlocks();
    } else {
      setLoading(false);
    }
  }, [user, fetchBlocks]);

  // Realtime subscription — silent background refresh so no skeleton flash.
  // Skipped entirely when suppressRealtimeRef is true (we just mutated).
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`planner-${user.id}-${selectedDate}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        if (suppressRealtimeRef.current) return; // our own write — ignore
        fetchBlocks(true); // silent: no loading skeleton
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, supabase, fetchBlocks, selectedDate]);

  // ── saveBlocks ─────────────────────────────────────────────
  const saveBlocks = useCallback(
    async (newBlocks: TimeBlockData[]) => {
      if (!user) return;

      // Optimistic update — no loading skeleton
      setBlocks(newBlocks);
      suppressRealtimeRef.current = true;

      const existingIds = rowIdsRef.current;
      const incomingUUIDs = newBlocks.filter(b => isUUID(b.id)).map(b => b.id);

      // Delete removed rows
      const toDelete = [...existingIds].filter(id => !incomingUUIDs.includes(id));
      if (toDelete.length > 0) {
        await supabase.from("tasks").delete().in("id", toDelete).eq("user_id", user.id);
      }

      // Upsert each block
      await Promise.all(
        newBlocks.map(async (block, i) => {
          if (isUUID(block.id)) {
            await supabase
              .from("tasks")
              .update({
                title: block.block,
                description: block.desc || null,
                estimated_minutes: block.dur,
                tags: [PLANNER_TAG, selectedDate, block.time, block.cat],
                sort_order: i,
              })
              .eq("id", block.id)
              .eq("user_id", user.id);
          } else {
            const { data: inserted } = await supabase
              .from("tasks")
              .insert(blockToInsert(block, selectedDate, i, user.id))
              .select("id")
              .single();

            if (inserted?.id) {
              const tempId = block.id;
              const realId = inserted.id;
              setBlocks(prev => prev.map(b => b.id === tempId ? { ...b, id: realId } : b));
              rowIdsRef.current.add(realId);
            }
          }
        })
      );

      rowIdsRef.current = new Set(newBlocks.filter(b => isUUID(b.id)).map(b => b.id));
      setTimeout(() => { suppressRealtimeRef.current = false; }, 1500);
    },
    [user, supabase, selectedDate]
  );

  // ── toggleComplete ─────────────────────────────────────────
  const toggleComplete = useCallback(
    async (blockId: string) => {
      if (!user) return;
      const currentlyDone = !!completed[blockId];

      // Optimistic update — instant UI, no flicker
      setCompleted(prev => ({ ...prev, [blockId]: !currentlyDone }));

      if (isUUID(blockId)) {
        // Suppress realtime so our own write doesn't trigger a reload
        suppressRealtimeRef.current = true;
        await supabase
          .from("tasks")
          .update({
            status: currentlyDone ? "todo" : "done",
            completed_at: currentlyDone ? null : new Date().toISOString(),
          })
          .eq("id", blockId)
          .eq("user_id", user.id);
        // Re-enable after a short delay (realtime events can arrive a bit late)
        setTimeout(() => { suppressRealtimeRef.current = false; }, 1500);
      }
    },
    [user, supabase, completed]
  );

  // ── bulkCreate ─────────────────────────────────────────────
  // Creates blocks for all 7 days of the current week at onboarding
  const bulkCreate = useCallback(
    async (schedule: { weekday: TimeBlockData[]; weekend: TimeBlockData[] }) => {
      if (!user) return;

      // Find Monday of current week
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...
      const monday = new Date(today);
      monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      monday.setHours(0, 0, 0, 0);

      const allInserts: (TaskInsert & { user_id: string })[] = [];

      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateStr = date.toISOString().slice(0, 10);
        const dayOfW = date.getDay();
        const isWeekend = dayOfW === 0 || dayOfW === 6;
        const template = isWeekend ? schedule.weekend : schedule.weekday;

        template.forEach((block, j) => {
          allInserts.push(blockToInsert(block, dateStr, j, user.id));
        });
      }

      if (allInserts.length === 0) return;

      const { data: inserted } = await supabase
        .from("tasks")
        .insert(allInserts)
        .select("id, title, description, estimated_minutes, tags, status, completed_at, sort_order");

      if (inserted) {
        setHasAnyBlocks(true);
        // Show blocks for selectedDate
        const dayBlocks = inserted
          .filter(t => (t.tags || [])[1] === selectedDate)
          .map(t => taskToBlock(t));
        setBlocks(dayBlocks);
        rowIdsRef.current = new Set(dayBlocks.map(b => b.id));
      }
    },
    [user, supabase, selectedDate]
  );

  // ── clearAllBlocks ─────────────────────────────────────────
  // Deletes ALL planner blocks for this user (for reset/onboarding)
  const clearAllBlocks = useCallback(async () => {
    if (!user) return;

    await supabase
      .from("tasks")
      .delete()
      .eq("user_id", user.id)
      .contains("tags", [PLANNER_TAG]);

    setBlocks([]);
    setCompleted({});
    setHasAnyBlocks(false);
    rowIdsRef.current = new Set();
  }, [user, supabase]);

  const hasBlocks = blocks.length > 0;

  return {
    blocks,
    completed,
    hasBlocks,
    hasAnyBlocks,
    loading,
    saveBlocks,
    toggleComplete,
    bulkCreate,
    clearAllBlocks,
  };
}
