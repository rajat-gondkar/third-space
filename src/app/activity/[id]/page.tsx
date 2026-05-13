import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, Calendar, MapPin, Pencil, Users } from "lucide-react";

import { DeleteActivityButton } from "@/components/DeleteActivityButton";
import { JoinButton } from "@/components/JoinButton";
import { NavBar } from "@/components/NavBar";
import { ParticipantsList } from "@/components/ParticipantsList";
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

  // Pull the participants together with their profile in one PostgREST query
  // (FK-implicit join via `participants_user_id_fkey` → `profiles`). Caps the
  // list to keep the accordion lightweight; total count drives the `(N more)`
  // indicator.
  const { data: participants, count: participantCount } = await supabase
    .from("participants")
    .select(
      "user_id, display_name, joined_at, profile:profiles!participants_user_id_fkey(email, display_name, avatar_url)",
      { count: "exact" },
    )
    .eq("activity_id", id)
    .order("joined_at", { ascending: true })
    .limit(50);

  // Fetch viewer's profile separately for the JoinModal prefill.
  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  // PostgREST gives us a typed-loose row — narrow it before mapping.
  type ParticipantRow = {
    user_id: string;
    display_name: string | null;
    profile:
      | { email: string | null; display_name: string | null }
      | { email: string | null; display_name: string | null }[]
      | null;
  };
  const rows = (participants ?? []) as ParticipantRow[];

  const people = rows.map((p) => {
    // Supabase typings sometimes infer the embedded row as an array; normalise.
    const profile = Array.isArray(p.profile) ? p.profile[0] : p.profile;
    return {
      userId: p.user_id,
      displayName:
        p.display_name?.trim() ||
        profile?.display_name?.trim() ||
        "Someone",
      email: profile?.email ?? null,
      isHost: p.user_id === activity.host_id,
    };
  });
  // Show host first, then by join order.
  people.sort((a, b) => Number(b.isHost) - Number(a.isHost));

  const hostPerson = people.find((p) => p.isHost);
  const total = participantCount ?? rows.length;
  const isFull = total >= activity.max_participants;
  const hasJoined = rows.some((p) => p.user_id === user.id);
  const isHost = activity.host_id === user.id;
  const startsAt = new Date(activity.start_time);
  // eslint-disable-next-line react-hooks/purity -- server component, runs once per request
  const isPast = startsAt.getTime() < Date.now();

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
          {hostPerson?.displayName && (
            <p className="text-sm text-muted-foreground">
              Hosted by {hostPerson.displayName}
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

          <div className="pt-2">
            <ParticipantsList people={people} total={total} />
          </div>
        </div>

        <JoinButton
          activityId={activity.id}
          activityTitle={activity.title}
          isFull={isFull}
          hasJoined={hasJoined}
          isPast={isPast}
          defaultDisplayName={
            viewerProfile?.display_name?.trim() ||
            (user.user_metadata?.full_name as string | undefined)?.trim() ||
            (user.user_metadata?.name as string | undefined)?.trim() ||
            ""
          }
        />

        {isHost && (
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/activity/${activity.id}/edit`}>
                <Pencil />
                Edit activity
              </Link>
            </Button>
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
