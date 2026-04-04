// =============================================================
// ProductiveDay — Planner Blocks Hook (Supabase-backed)
// =============================================================
// Replaces the localStorage-based block storage in Index.tsx
// with Supabase persisted tasks.
//
// Encoding convention (stored in `tags` column):
//   tags[0] = dayType  → "weekday" | "weekend"
//   tags[1] = timeStr  → "9:00 AM – 10:00 AM"
//   tags[2] = category → "Personal"
//
// Other mappings:
//   title              → block.block  (display name)
//   description        → block.desc
//   estimated_minutes  → block.dur    (minutes)
//   sort_order         → array index
//   status             → "done" | "todo"
//   completed_at       → ISO string if done TODAY (checked on load)
// =============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TimeBlockData } from "@/data/plannerData";
import type { TaskInsert } from "@/lib/types/database";

const PLANNER_TAG = "planner-block"; // sentinel tag to distinguish planner tasks

// ─── Helpers ──────────────────────────────────────────────────

function isToday(isoString: string | null): boolean {
  if (!isoString) return false;
  const d = new Date(isoString);
  const t = new Date();
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
}

function isUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/** Convert a Supabase task row → TimeBlockData */
function taskToBlock(task: {
  id: string;
  title: string;
  description: string | null;
  estimated_minutes: number | null;
  tags: string[];
  status: string;
  completed_at: string | null;
  sort_order: number;
}): TimeBlockData {
  const tags = task.tags || [];
  return {
    id: task.id,
    block: task.title,
    desc: task.description || "",
    dur: task.estimated_minutes || 30,
    time: tags[1] || "",
    cat: tags[2] || "Personal",
  };
}

/** Convert TimeBlockData + dayType → TaskInsert (for new rows) */
function blockToInsert(block: TimeBlockData, dayType: "weekday" | "weekend", index: number): TaskInsert {
  return {
    title: block.block,
    description: block.desc || null,
    estimated_minutes: block.dur,
    tags: [PLANNER_TAG, dayType, block.time, block.cat],
    sort_order: index,
    status: "todo",
  };
}

// ─── Hook ─────────────────────────────────────────────────────

export interface UsePlannerBlocksReturn {
  allBlocks: { weekday: TimeBlockData[]; weekend: TimeBlockData[] };
  completed: Record<string, boolean>;
  hasBlocks: boolean;
  loading: boolean;
  saveBlocks: (newBlocks: TimeBlockData[], dayType: "weekday" | "weekend") => Promise<void>;
  toggleComplete: (blockId: string) => Promise<void>;
  bulkCreate: (schedule: { weekday: TimeBlockData[]; weekend: TimeBlockData[] }) => Promise<void>;
}

export function usePlannerBlocks(): UsePlannerBlocksReturn {
  const supabase = createClient();

  const [allBlocks, setAllBlocks] = useState<{ weekday: TimeBlockData[]; weekend: TimeBlockData[] }>(
    { weekday: [], weekend: [] }
  );
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Track Supabase row IDs per dayType to detect inserts vs updates
  const rowIds = useRef<{ weekday: Set<string>; weekend: Set<string> }>({
    weekday: new Set(),
    weekend: new Set(),
  });

  // ── Fetch all planner blocks from Supabase ─────────────────
  const fetchBlocks = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, description, estimated_minutes, tags, status, completed_at, sort_order")
      .eq("user_id", user.id)
      .contains("tags", [PLANNER_TAG])
      .order("sort_order", { ascending: true });

    if (error || !data) { setLoading(false); return; }

    const weekdayBlocks: TimeBlockData[] = [];
    const weekendBlocks: TimeBlockData[] = [];
    const completedMap: Record<string, boolean> = {};
    const newRowIds = { weekday: new Set<string>(), weekend: new Set<string>() };

    for (const task of data) {
      const tags: string[] = task.tags || [];
      const dayType = tags[1]; // "weekday" | "weekend"
      const block = taskToBlock(task);

      if (dayType === "weekend") {
        weekendBlocks.push(block);
        newRowIds.weekend.add(task.id);
      } else {
        weekdayBlocks.push(block);
        newRowIds.weekday.add(task.id);
      }

      // Mark as completed if status=done AND completed_at is today
      if (task.status === "done" && isToday(task.completed_at)) {
        completedMap[task.id] = true;
      }
    }

    rowIds.current = newRowIds;
    setAllBlocks({ weekday: weekdayBlocks, weekend: weekendBlocks });
    setCompleted(completedMap);
    setLoading(false);
  }, [supabase]);

  // ── Realtime subscription ──────────────────────────────────
  useEffect(() => {
    fetchBlocks();

    const channel = supabase
      .channel("planner-blocks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => fetchBlocks()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchBlocks, supabase]);

  // ── saveBlocks — full sync for one day type ────────────────
  const saveBlocks = useCallback(
    async (newBlocks: TimeBlockData[], dayType: "weekday" | "weekend") => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Optimistic update
      setAllBlocks((prev) => ({ ...prev, [dayType]: newBlocks }));

      const existingIds = rowIds.current[dayType];
      const incomingUUIDs = newBlocks.filter((b) => isUUID(b.id)).map((b) => b.id);

      // 1. Delete rows that no longer exist
      const toDelete = [...existingIds].filter((id) => !incomingUUIDs.includes(id));
      if (toDelete.length > 0) {
        await supabase.from("tasks").delete().in("id", toDelete).eq("user_id", user.id);
      }

      // 2. Upsert each block
      for (let i = 0; i < newBlocks.length; i++) {
        const block = newBlocks[i];

        if (isUUID(block.id)) {
          // Update existing row
          await supabase
            .from("tasks")
            .update({
              title: block.block,
              description: block.desc || null,
              estimated_minutes: block.dur,
              tags: [PLANNER_TAG, dayType, block.time, block.cat],
              sort_order: i,
            })
            .eq("id", block.id)
            .eq("user_id", user.id);
        } else {
          // Insert new row (temp ID like "block-1234567")
          const { data: inserted } = await supabase
            .from("tasks")
            .insert({ ...blockToInsert(block, dayType, i), user_id: user.id })
            .select("id")
            .single();

          // Swap temp ID → real UUID in local state
          if (inserted?.id) {
            setAllBlocks((prev) => ({
              ...prev,
              [dayType]: prev[dayType].map((b) =>
                b.id === block.id ? { ...b, id: inserted.id } : b
              ),
            }));
            rowIds.current[dayType].add(inserted.id);
          }
        }
      }

      // Refresh row ID registry
      rowIds.current[dayType] = new Set(incomingUUIDs);
    },
    [supabase]
  );

  // ── toggleComplete ─────────────────────────────────────────
  const toggleComplete = useCallback(
    async (blockId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const currentlyDone = !!completed[blockId];

      // Optimistic update
      setCompleted((prev) => ({ ...prev, [blockId]: !currentlyDone }));

      if (isUUID(blockId)) {
        await supabase
          .from("tasks")
          .update({
            status: currentlyDone ? "todo" : "done",
            completed_at: currentlyDone ? null : new Date().toISOString(),
          })
          .eq("id", blockId)
          .eq("user_id", user.id);
      }
    },
    [supabase, completed]
  );

  // ── bulkCreate — for onboarding schedule ──────────────────
  const bulkCreate = useCallback(
    async (schedule: { weekday: TimeBlockData[]; weekend: TimeBlockData[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Optimistic update
      setAllBlocks(schedule);

      const allInserts: (TaskInsert & { user_id: string })[] = [
        ...schedule.weekday.map((b, i) => ({
          ...blockToInsert(b, "weekday", i),
          user_id: user.id,
        })),
        ...schedule.weekend.map((b, i) => ({
          ...blockToInsert(b, "weekend", i),
          user_id: user.id,
        })),
      ];

      if (allInserts.length === 0) return;

      const { data: inserted } = await supabase
        .from("tasks")
        .insert(allInserts)
        .select("id, tags, sort_order");

      // Rebuild with real UUIDs
      if (inserted) {
        const weekdayBlocks: TimeBlockData[] = [];
        const weekendBlocks: TimeBlockData[] = [];

        for (const row of inserted) {
          const tags: string[] = row.tags || [];
          const dayType = tags[1];
          // Find matching schedule block by sort_order
          const src =
            dayType === "weekend"
              ? schedule.weekend[row.sort_order]
              : schedule.weekday[row.sort_order];
          if (!src) continue;

          const block: TimeBlockData = { ...src, id: row.id };
          if (dayType === "weekend") {
            weekendBlocks.push(block);
          } else {
            weekdayBlocks.push(block);
          }
        }

        setAllBlocks({ weekday: weekdayBlocks, weekend: weekendBlocks });
        rowIds.current.weekday = new Set(weekdayBlocks.map((b) => b.id));
        rowIds.current.weekend = new Set(weekendBlocks.map((b) => b.id));
      }
    },
    [supabase]
  );

  const hasBlocks =
    allBlocks.weekday.length > 0 || allBlocks.weekend.length > 0;

  return { allBlocks, completed, hasBlocks, loading, saveBlocks, toggleComplete, bulkCreate };
}
