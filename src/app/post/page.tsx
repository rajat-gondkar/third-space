import { redirect } from "next/navigation";

import { NavBar } from "@/components/NavBar";
import { PostForm } from "@/components/PostForm";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function PostPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/post");

  const navUser = {
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  };

  return (
    <div className="flex flex-1 flex-col">
      <NavBar user={navUser} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <header className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Post an activity
          </h1>
          <p className="text-sm text-muted-foreground">
            It&rsquo;ll show up live for anyone nearby in the next 6 hours.
          </p>
        </header>
        <PostForm userId={user.id} />
      </main>
    </div>
  );
}
