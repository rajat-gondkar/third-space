import Link from "next/link";
import { Calendar, MapPin, Users } from "lucide-react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/supabase/server";

const isConfigured = () =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default async function Home() {
  let signedIn = false;
  if (isConfigured()) {
    const user = await getCurrentUser();
    signedIn = !!user;
  }

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-20 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-fuchsia-300/40 via-violet-300/30 to-indigo-300/20 blur-3xl dark:from-fuchsia-700/20 dark:via-violet-700/15 dark:to-indigo-700/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-amber-200/40 via-rose-200/30 to-fuchsia-200/20 blur-3xl dark:from-amber-700/15 dark:via-rose-700/15 dark:to-fuchsia-700/10"
      />

      <div className="relative max-w-2xl space-y-8">
        <div className="flex justify-center">
          <Logo size="lg" className="animate-pop-in" />
        </div>

        <div className="space-y-4">
          <h1 className="animate-fade-up text-5xl font-bold tracking-tight sm:text-6xl">
            Find your{" "}
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              third space.
            </span>
          </h1>
          <p
            className="animate-fade-up mx-auto max-w-xl text-lg text-muted-foreground sm:text-xl"
            style={{ animationDelay: "120ms" }}
          >
            See what people are doing nearby — right now. Join a pickup game,
            a study session, or a coffee meet — or post your own in 30
            seconds.
          </p>
        </div>

        <div
          className="animate-fade-up flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          style={{ animationDelay: "220ms" }}
        >
          <Button
            asChild
            size="lg"
            className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg ring-1 ring-white/20 transition-transform hover:scale-[1.02] hover:opacity-95 sm:w-auto"
          >
            <Link href={signedIn ? "/map" : "/login"}>
              {signedIn ? "Open the map →" : "Get started — it's free"}
            </Link>
          </Button>
          {!signedIn && (
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full border-primary/30 bg-card text-foreground hover:border-primary hover:bg-primary/5 sm:w-auto"
            >
              <Link href="/map">Browse the map →</Link>
            </Button>
          )}
        </div>

        <div
          className="animate-fade-up grid grid-cols-3 gap-3 pt-6 text-sm sm:gap-6"
          style={{ animationDelay: "320ms" }}
        >
          <Feature
            icon={<MapPin className="size-5" />}
            title="Right here"
            desc="Pin-drop precise"
          />
          <Feature
            icon={<Users className="size-5" />}
            title="Real people"
            desc="Verified via Google"
          />
          <Feature
            icon={<Calendar className="size-5" />}
            title="Right now"
            desc="Live 6-hour window"
          />
        </div>

        {!isConfigured() && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-200">
            <strong>Setup needed:</strong> add your Supabase credentials to{" "}
            <code>.env.local</code>. See <code>README.md</code>.
          </p>
        )}
      </div>
    </main>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-fuchsia-100 text-indigo-600 ring-1 ring-inset ring-white/60 dark:from-indigo-950/60 dark:to-fuchsia-950/60 dark:text-indigo-300 dark:ring-white/5">
        {icon}
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}
