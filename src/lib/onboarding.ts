import { isCollegeEmail } from "@/lib/college-domains";
import { resolveProfile } from "@/lib/auth-identity";

export async function checkOnboarding(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  userId: string,
  userEmail?: string,
): Promise<boolean> {
  const profile = await resolveProfile(supabase, userId);

  if (profile?.onboarding_complete) return true;

  // If the user signed in with a college email that's already linked
  // to another onboarded account, treat this user as onboarded.
  if (userEmail && isCollegeEmail(userEmail)) {
    const { data: linked } = await supabase
      .from("profiles")
      .select("id, onboarding_complete")
      .eq("college_email", userEmail)
      .eq("college_email_verified", true)
      .eq("onboarding_complete", true)
      .maybeSingle();

    if (linked?.id) {
      // Auto-complete onboarding for this new account by linking it.
      // If the current auth user already has a stray profile, delete it first
      // so the linked_user_id update doesn't conflict.
      const { data: stray } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (stray) {
        await supabase.from("profiles").delete().eq("id", userId);
      }

      await supabase
        .from("profiles")
        .update({ linked_user_id: userId })
        .eq("id", linked.id);

      return true;
    }
  }

  return false;
}
