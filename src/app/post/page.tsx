import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PostForm } from "@/components/PostForm";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function PostPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/post");

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Button asChild variant="ghost" size="icon" aria-label="Back">
          <Link href="/map">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="font-semibold leading-tight">Post an activity</h1>
          <p className="text-xs text-muted-foreground">
            It’ll show up live for anyone nearby.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <PostForm userId={user.id} />
      </main>
    </div>
  );
}
