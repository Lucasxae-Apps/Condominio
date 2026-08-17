import { supabase } from "@/lib/supabase";
import type { Store } from "@/lib/condo-store";

/**
 * Single-condominium architecture:
 * - One row in `condo_data` stores all app state (shared by all users)
 * - `admin_users` table lists user IDs that can write
 * - All authenticated users can read
 */

const CONDO_ID = "default"; // single condominium, single row

/**
 * Saves the store to the shared condo_data row.
 * Only admin users can write (enforced by RLS).
 */
export async function saveStoreToCloud(
  _userId: string,
  store: Store,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("condo_data").upsert(
    {
      id: CONDO_ID,
      data: store,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("Failed to save to cloud:", error.message);
    return { error: error.message };
  }
  return { error: null };
}

/**
 * Loads the shared condominium data.
 * All authenticated users can read.
 */
export async function loadStoreFromCloud(
  _userId: string,
): Promise<{ data: Store | null; error: string | null }> {
  const { data, error } = await supabase
    .from("condo_data")
    .select("data")
    .eq("id", CONDO_ID)
    .maybeSingle();

  if (error) {
    console.error("Failed to load from cloud:", error.message);
    return { data: null, error: error.message };
  }

  if (!data) {
    return { data: null, error: null };
  }

  return { data: data.data as Store, error: null };
}

/**
 * Checks if the current user is an admin (can edit).
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to check admin status:", error.message);
    return false;
  }

  return data !== null;
}
