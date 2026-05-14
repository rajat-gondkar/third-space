import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { isCollegeEmail } from "@/lib/college-domains";
import { resolveProfile } from "@/lib/auth-identity";

type LinkedProfile = {
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  age: number | null;
  gender: string | null;
  college_email: string | null;
  college_name: string | null;
};

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/map";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const profile = await resolveProfile(supabase, user.id);

        // If this user hasn't completed onboarding yet, check whether
        // they signed in with a college email that's already linked to
        // an existing onboarded account.  If so, link them so they
        // don't have to redo onboarding.
        if (!profile?.onboarding_complete && user.email) {
          const linked = await findLinkedProfile(supabase, user.email, user.id);
          if (linked) {
            // Remove any stray empty profile that might have been
            // auto-created for this new auth user.
            await supabase.from("profiles").delete().eq("id", user.id);

            await supabase
              .from("profiles")
              .update({ linked_user_id: user.id })
              .eq("id", linked.id);

            const safeNext = next.startsWith("/") ? next : "/map";
            return NextResponse.redirect(`${origin}${safeNext}`);
          }

          const safeNext = next.startsWith("/") ? next : "/map";
          return NextResponse.redirect(
            `${origin}/onboarding?next=${encodeURIComponent(safeNext)}`,
          );
        }
      }

      const safeNext = next.startsWith("/") ? next : "/map";
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}

async function findLinkedProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  email: string,
  currentUserId: string,
): Promise<(LinkedProfile & { id: string }) | null> {
  if (!isCollegeEmail(email)) return null;

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, display_name, avatar_url, phone, age, gender, college_email, college_name",
    )
    .eq("college_email", email)
    .eq("college_email_verified", true)
    .eq("onboarding_complete", true)
    .neq("id", currentUserId)
    .maybeSingle();

  return data as (LinkedProfile & { id: string }) | null;
}
