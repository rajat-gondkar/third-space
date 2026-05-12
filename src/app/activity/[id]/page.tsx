import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, Calendar, MapPin, Users } from "lucide-react";

import { DeleteActivityButton } from "@/components/DeleteActivityButton";
import { JoinButton } from "@/components/JoinButton";
import { NavBar } from "@/components/NavBar";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { Button } from "@/components/ui/button";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import {
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  type Activity,
  type ActivityCategory,
} from "@/lib/types";

// Activity row + embedded host profile (1 round-trip via PostgREST embed)
type ActivityWithHost = Activity & {
  host: { display_name: string | null; avatar_url: string | null } | null;
};

type Props = { params: Promise<{ id: string }> };

export default async function ActivityDetail({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/activity/${id}`);

  const supabase = await createClient();

  // 1 round-trip: activity + embedded host profile
  // 2 round-trips parallel: participant count + my participant row
  // → 2 wall-clock RTTs instead of the previous 4 sequential ones.
  const [activityRes, countRes, myRowRes] = await Promise.all([
    supabase
      .from("activities")
      .select("*, host:profiles(display_name, avatar_url)")
      .eq("id", id)
      .single<ActivityWithHost>(),
    supabase
      .from("participants")
      .select("activity_id", { count: "exact", head: true })
      .eq("activity_id", id),
    supabase
      .from("participants")
      .select("activity_id")
      .eq("activity_id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const { data: activity, error } = activityRes;
  if (error || !activity) notFound();

  const host = activity.host;
  const total = countRes.count ?? 0;
  const isFull = total >= activity.max_participants;
  const hasJoined = !!myRowRes.data;
  const isHost = activity.host_id === user.id;
  const startsAt = new Date(activity.start_time);
  // eslint-disable-next-line react-hooks/purity -- server component, runs once per request
  const isPast = startsAt.getTime() < Date.now();

  const navUser = {
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  };

  return (
    <div className="flex flex-1 flex-col">
      <NavBar user={navUser} />
      <RealtimeRefresh
        channelName={`activity-${id}`}
        tables={["participants", "activities"]}
      />

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link href="/map">
            <ArrowLeft />
            Back to map
          </Link>
        </Button>

        <div className="animate-fade-up space-y-3 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <span className="text-base">
              {CATEGORY_EMOJI[activity.category as ActivityCategory]}
            </span>
            <span>{CATEGORY_LABEL[activity.category as ActivityCategory]}</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {activity.title}
          </h2>
          {host?.display_name && (
            <p className="text-sm text-muted-foreground">
              Hosted by {host.display_name}
            </p>
          )}

          <dl className="mt-2 grid gap-3 rounded-xl border border-border bg-background/60 p-4">
            <Row icon={<Calendar className="size-4" />}>
              <div>
                <div>{format(startsAt, "EEE, d MMM · h:mm a")}</div>
                <div className="text-xs text-muted-foreground">
                  {isPast ? "Started" : "Starts"}{" "}
                  {formatDistanceToNow(startsAt, { addSuffix: true })}
                </div>
              </div>
            </Row>
            {activity.location_name && (
              <Row icon={<MapPin className="size-4" />}>
                {activity.location_name}
              </Row>
            )}
            <Row icon={<Users className="size-4" />}>
              {total}/{activity.max_participants} joined
            </Row>
          </dl>

          {activity.description && (
            <p className="whitespace-pre-wrap pt-2 text-sm leading-relaxed">
              {activity.description}
            </p>
          )}
        </div>

        <JoinButton
          activityId={activity.id}
          isFull={isFull}
          hasJoined={hasJoined}
          isPast={isPast}
        />

        {isHost && (
          <div className="flex justify-center">
            <DeleteActivityButton
              activityId={activity.id}
              activityTitle={activity.title}
            />
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Pin: {activity.lat.toFixed(4)}, {activity.lng.toFixed(4)}
        </p>
      </main>
    </div>
  );
}

function Row({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
