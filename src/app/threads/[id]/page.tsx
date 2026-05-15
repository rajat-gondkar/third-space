import { redirect, notFound } from "next/navigation";

import { NavBar } from "@/components/NavBar";
import { ThreadDetailShell } from "@/components/threads/ThreadDetailShell";
import { checkOnboarding } from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/server";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/threads/${id}`);
  if (!(await checkOnboarding(supabase, user.id, user.email ?? undefined)))
    redirect(`/onboarding?next=/threads/${id}`);

  const { data: thread, error } = await supabase
    .from("threads")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !thread) {
    notFound();
  }

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
      <ThreadDetailShell thread={thread} />
    </div>
  );
}
