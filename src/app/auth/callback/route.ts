import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { isCollegeEmail } from "@/lib/college-domains";

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
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_complete, college_email_verified")
          .eq("id", user.id)
          .maybeSingle();

        // If this user hasn't completed onboarding yet, check whether
        // they signed in with a college email that's already linked to
        // an existing onboarded account.  If so, copy the profile data
        // so they don't have to redo onboarding.
        if (!profile?.onboarding_complete && user.email) {
          const linked = await findLinkedProfile(supabase, user.email);
          if (linked) {
            await supabase
              .from("profiles")
              .update({
                onboarding_complete: true,
                display_name: linked.display_name,
                avatar_url: linked.avatar_url,
                phone: linked.phone,
                age: linked.age,
                gender: linked.gender,
                college_email: linked.college_email,
                college_email_verified: true,
                college_name: linked.college_name,
              })
              .eq("id", user.id);

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
): Promise<LinkedProfile | null> {
  if (!isCollegeEmail(email)) return null;

  const { data } = await supabase
    .from("profiles")
    .select(
      "display_name, avatar_url, phone, age, gender, college_email, college_name",
    )
    .eq("college_email", email)
    .eq("college_email_verified", true)
    .eq("onboarding_complete", true)
    .maybeSingle();

  return data as LinkedProfile | null;
}