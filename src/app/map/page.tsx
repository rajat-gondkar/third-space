import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { ActivityList } from "@/components/ActivityList";
import { Map } from "@/components/Map";
import { NavBar } from "@/components/NavBar";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { checkOnboarding } from "@/lib/onboarding";
import type {
  Activity,
  ActivityCategory,
  ActivityWithCount,
} from "@/lib/types";

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 }; // Bangalore

type RawRow = Activity & {
  participants: { count: number }[] | null;
};

export default async function MapPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/map");

  if (!(await checkOnboarding(supabase, user.id, user.email ?? undefined))) redirect("/onboarding?next=/map");

  // eslint-disable-next-line react-hooks/purity -- server component, runs once per request
  const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("activities")
    .select("*, participants(count)")
    .gt("start_time", cutoff)
    .order("start_time", { ascending: true });

  const rows: RawRow[] = (data as RawRow[] | null) ?? [];
  const activities: ActivityWithCount[] = rows.map((row) => ({
    ...row,
    category: row.category as ActivityCategory,
    participant_count: row.participants?.[0]?.count ?? 0,
  }));

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
    <div className="flex min-h-dvh flex-col md:h-dvh">
      <NavBar user={navUser} liveCount={activities.length} />
      <RealtimeRefresh
        channelName="map"
        tables={["activities", "participants"]}
      />

      <div className="flex flex-1 flex-col md:grid md:grid-cols-[1fr_440px] md:overflow-hidden">
        <div className="relative h-[55vh] w-full shrink-0 md:h-full md:overflow-hidden">
          <Map center={DEFAULT_CENTER} activities={activities} />
        </div>

        <aside className="flex flex-col border-t border-border bg-background p-4 pb-24 md:min-h-0 md:overflow-hidden md:border-l md:border-t-0 md:pb-4">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Happening now
              </h2>
              <p className="text-xs text-muted-foreground">
                Pin up to 2 · filter by today, date, or area
              </p>
            </div>
            <Button asChild size="sm" className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md ring-1 ring-white/20 transition-transform hover:scale-[1.03] hover:opacity-95">
              <Link href="/post">
                <Plus />
                Post
              </Link>
            </Button>
          </div>

          {error && (
            <p className="mb-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Couldn&rsquo;t load activities: {error.message}
            </p>
          )}

          <ActivityList activities={activities} />
        </aside>
      </div>
    </div>
  );
}
