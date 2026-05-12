import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, Calendar, MapPin, Users } from "lucide-react";

import { JoinButton } from "@/components/JoinButton";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import {
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  type Activity,
  type ActivityCategory,
} from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

export default async function ActivityDetail({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/activity/${id}`);

  const { data: activity, error } = await supabase
    .from("activities")
    .select("*")
    .eq("id", id)
    .single<Activity>();

  if (error || !activity) notFound();

  const { count: participantCount } = await supabase
    .from("participants")
    .select("activity_id", { count: "exact", head: true })
    .eq("activity_id", id);

  const { data: myRow } = await supabase
    .from("participants")
    .select("activity_id")
    .eq("activity_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: host } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", activity.host_id)
    .maybeSingle();

  const total = participantCount ?? 0;
  const isFull = total >= activity.max_participants;
  const hasJoined = !!myRow;
  const startsAt = new Date(activity.start_time);
  // eslint-disable-next-line react-hooks/purity -- server component, runs once per request
  const isPast = startsAt.getTime() < Date.now();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Button asChild variant="ghost" size="icon" aria-label="Back">
          <Link href="/map">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="font-semibold leading-tight">Activity</h1>
      </header>

      <RealtimeRefresh
        channelName={`activity-${id}`}
        tables={["participants", "activities"]}
      />

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
            <span>{CATEGORY_EMOJI[activity.category as ActivityCategory]}</span>
            <span>
              {CATEGORY_LABEL[activity.category as ActivityCategory]}
            </span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {activity.title}
          </h2>
          {host?.display_name && (
            <p className="text-sm text-muted-foreground">
              Hosted by {host.display_name}
            </p>
          )}
        </div>

        <dl className="grid gap-3 rounded-lg border border-border p-4">
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
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {activity.description}
          </p>
        )}

        <JoinButton
          activityId={activity.id}
          isFull={isFull}
          hasJoined={hasJoined}
          isPast={isPast}
        />

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
