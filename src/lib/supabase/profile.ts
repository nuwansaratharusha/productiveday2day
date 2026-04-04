// =============================================================
// ProductiveDay — Profile & Category Service
// =============================================================
import { createClient } from "./client";
import type { ProfileUpdate, CategoryInsert } from "@/lib/types/database";

async function getUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

// ─── Profile ───────────────────────────────────────────────
export async function getProfile() {
  const { supabase, user } = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { data, error: error?.message || null };
}

export async function updateProfile(updates: ProfileUpdate) {
  const { supabase, user } = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  return { data, error: error?.message || null };
}

// ─── Categories ────────────────────────────────────────────
export async function getCategories() {
  const { supabase, user } = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  return { data, error: error?.message || null };
}

export async function createCategory(category: CategoryInsert) {
  const { supabase, user } = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("categories")
    .insert({ ...category, user_id: user.id })
    .select()
    .single();

  return { data, error: error?.message || null };
}

export async function updateCategory(categoryId: string, updates: Partial<CategoryInsert>) {
  const { supabase, user } = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("categories")
    .update(updates)
    .eq("id", categoryId)
    .eq("user_id", user.id)
    .select()
    .single();

  return { data, error: error?.message || null };
}

export async function deleteCategory(categoryId: string) {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("user_id", user.id);

  return { error: error?.message || null };
}
