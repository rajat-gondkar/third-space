import { redirect } from "next/navigation";

import { NavBar } from "@/components/NavBar";
import { ThreadsShell } from "@/components/threads/ThreadsShell";
import { checkOnboarding } from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/server";

export default async function ThreadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/threads");
  if (!(await checkOnboarding(supabase, user.id, user.email ?? undefined)))
    redirect("/onboarding?next=/threads");

  const navUser = {
    email: user.email ?? "",
    name:
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null,
    avatarUrl:
      (user.user_metadata?.avatar_url as string | undefined) ?? null,
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <NavBar user={navUser} />
      <ThreadsShell />
    </div>
  );
}
