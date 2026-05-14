import { redirect } from "next/navigation";

import { NavBar } from "@/components/NavBar";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { MapShell } from "@/components/MapShell";
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

  if (!(await checkOnboarding(supabase, user.id, user.email ?? undefined)))
    redirect("/onboarding?next=/map");

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
      <MapShell
        activities={activities}
        defaultCenter={DEFAULT_CENTER}
        errorMessage={error?.message}
      />
    </div>
  );
}
