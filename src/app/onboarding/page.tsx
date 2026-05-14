import { redirect } from "next/navigation";

import { isCollegeEmail, getCollegeName } from "@/lib/college-domains";
import { createClient } from "@/lib/supabase/server";
import { resolveProfile } from "@/lib/auth-identity";
import { OnboardingFlow } from "@/components/OnboardingFlow";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");

  const profile = await resolveProfile(supabase, user.id);

  if (profile?.onboarding_complete) {
    const { next } = await searchParams;
    redirect(next ?? "/map");
  }

  const email = user.email ?? "";
  const isCollege = isCollegeEmail(email);
  const collegeFromEmail = isCollege ? getCollegeName(email) : null;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            {isCollege ? "Almost there" : "Verify your college"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isCollege
              ? "Tell us a bit about yourself to get started."
              : "We need to verify you're a college student."}
          </p>
        </div>

        <OnboardingFlow
          userEmail={email}
          isCollegeEmail={isCollege}
          collegeNameFromEmail={collegeFromEmail}
          collegeEmailVerified={isCollege ? true : false}
          initialDisplayName={
            (profile as { display_name?: string | null } | null)?.display_name ??
            (user.user_metadata?.full_name as string | undefined) ??
            (user.user_metadata?.name as string | undefined) ??
            ""
          }
          initialAvatarUrl={
            ((profile as { avatar_url?: string | null } | null)?.avatar_url ??
              (user.user_metadata?.avatar_url as string | undefined)) ??
            null
          }
        />
      </div>
    </div>
  );
}
