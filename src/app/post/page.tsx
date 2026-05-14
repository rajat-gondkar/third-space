import { redirect } from "next/navigation";

import { NavBar } from "@/components/NavBar";
import { PostForm } from "@/components/PostForm";
import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{
    lat?: string;
    lng?: string;
    name?: string;
    address?: string;
  }>;
};

export default async function PostPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/post");

  const navUser = {
    email: user.email ?? "",
    name:
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null,
    avatarUrl:
      (user.user_metadata?.avatar_url as string | undefined) ?? null,
  };

  const params = await searchParams;
  const venue =
    params.lat && params.lng
      ? {
          lat: Number(params.lat),
          lng: Number(params.lng),
          name: params.name ?? "",
          address: params.address ?? "",
        }
      : undefined;

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
        <PostForm userId={user.id} venue={venue} />
      </main>
    </div>
  );
}
