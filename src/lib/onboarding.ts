import { isCollegeEmail } from "@/lib/college-domains";

export async function checkOnboarding(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  userId: string,
  userEmail?: string,
): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", userId)
    .maybeSingle();

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
      // Auto-complete onboarding for this new account by copying
      // from the linked profile.
      const { data: source } = await supabase
        .from("profiles")
        .select(
          "display_name, avatar_url, phone, age, gender, college_email, college_name",
        )
        .eq("id", linked.id)
        .maybeSingle();

      if (source) {
        await supabase
          .from("profiles")
          .update({
            onboarding_complete: true,
            display_name: source.display_name,
            avatar_url: source.avatar_url,
            phone: source.phone,
            age: source.age,
            gender: source.gender,
            college_email: source.college_email,
            college_email_verified: true,
            college_name: source.college_name,
          })
          .eq("id", userId);
      }

      return true;
    }
  }

  return false;
}