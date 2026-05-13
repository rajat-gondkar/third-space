import { notFound, redirect } from "next/navigation";

import { NavBar } from "@/components/NavBar";
import { PostForm } from "@/components/PostForm";
import { createClient } from "@/lib/supabase/server";
import type { Activity } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditActivityPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/activity/${id}/edit`);

  const { data: activity, error } = await supabase
    .from("activities")
    .select("*")
    .eq("id", id)
    .maybeSingle<Activity>();

  if (error) {
    throw new Error(error.message);
  }
  if (!activity) {
    notFound();
  }

  // Hard gate — RLS would still reject the UPDATE, but bouncing the page
  // earlier gives a clearer UX than letting them edit a form they can't save.
  if (activity.host_id !== user.id) {
    redirect(`/activity/${id}`);
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
    <div className="flex flex-1 flex-col">
      <NavBar user={navUser} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <header className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Edit activity
          </h1>
          <p className="text-sm text-muted-foreground">
            Update the details below — everyone who&rsquo;s seeing this
            activity will see your changes instantly.
          </p>
        </header>
        <PostForm userId={user.id} editing={activity} />
      </main>
    </div>
  );
}
