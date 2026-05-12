import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

const isConfigured = () =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default async function Home() {
  if (isConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/map");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="max-w-xl space-y-6">
        <div className="flex items-center justify-center gap-2 text-3xl">
          ⚽️ 📚 ☕️ 🎨
        </div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Find your third space.
        </h1>
        <p className="text-lg text-muted-foreground">
          See what people are doing nearby, right now. Join a pickup game, a
          study session, a coffee meet — or post your own in 30 seconds.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/login">Get started</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/map">Browse the map</Link>
          </Button>
        </div>
        {!isConfigured() && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
            <strong>Setup needed:</strong> add your Supabase credentials to{" "}
            <code>.env.local</code>. See <code>README.md</code> for the 5-minute
            setup.
          </p>
        )}
      </div>
    </main>
  );
}
