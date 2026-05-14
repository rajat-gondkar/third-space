import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolve the canonical profile row for an auth user.
 *
 * Checks `profiles.id` first (direct match for non-linked users).
 * Falls back to `profiles.linked_user_id` for linked accounts.
 *
 * This ensures that whether the user logs in with their primary Gmail
 * account or their linked college account, they see the same profile.
 */
export async function resolveProfile(
  supabase: SupabaseClient,
  authUserId: string,
) {
  const { data: direct } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUserId)
    .maybeSingle();

  if (direct) return direct;

  const { data: linked } = await supabase
    .from("profiles")
    .select("*")
    .eq("linked_user_id", authUserId)
    .maybeSingle();

  return linked ?? null;
}

/**
 * Resolve the canonical profile ID for an auth user.
 *
 * Returns the profile's `id` if found, otherwise falls back to the
 * auth user ID itself (for users who haven't created a profile yet).
 */
export async function resolveProfileId(
  supabase: SupabaseClient,
  authUserId: string,
): Promise<string> {
  const profile = await resolveProfile(supabase, authUserId);
  return (profile as { id?: string } | null)?.id ?? authUserId;
}
