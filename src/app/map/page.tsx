import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { ActivityCard } from "@/components/ActivityCard";
import { Map } from "@/components/Map";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { SignOutButton } from "@/components/SignOutButton";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import type {
  Activity,
  ActivityWithCount,
  ActivityCategory,
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

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <Link href="/map" className="font-semibold tracking-tight">
          Third Space
        </Link>
        <div className="flex items-center gap-1">
          <Button asChild size="sm">
            <Link href="/post">
              <Plus />
              Post
            </Link>
          </Button>
          <SignOutButton />
        </div>
      </header>

      <RealtimeRefresh
        channelName="map"
        tables={["activities", "participants"]}
      />

      <div className="grid flex-1 grid-rows-[55%_45%] overflow-hidden md:grid-cols-[1fr_380px] md:grid-rows-1">
        <div className="relative h-full w-full overflow-hidden">
          <Map center={DEFAULT_CENTER} activities={activities} />
        </div>

        <aside className="flex flex-col gap-3 overflow-y-auto border-t border-border bg-background p-4 md:border-l md:border-t-0">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Happening now</h2>
            <span className="text-xs text-muted-foreground">
              {activities.length}{" "}
              {activities.length === 1 ? "activity" : "activities"}
            </span>
          </div>

          {error && (
            <p className="text-sm text-destructive">
              Couldn’t load activities: {error.message}
            </p>
          )}

          {!error && activities.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <p className="font-medium">No activities nearby</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Be the first to post one.
              </p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/post">
                  <Plus />
                  Post an activity
                </Link>
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {activities.map((a) => (
              <ActivityCard key={a.id} activity={a} />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
