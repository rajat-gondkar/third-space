"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import { PinButton } from "@/components/PinButton";
import { ShareButton } from "@/components/ShareButton";
import { cn } from "@/lib/utils";
import {
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  type ActivityWithCount,
} from "@/lib/types";

type Props = {
  activity: ActivityWithCount;
  index?: number;
  pinned?: boolean;
  onTogglePin?: () => { ok: boolean; reason?: "max" };
};

export function ActivityCard({
  activity,
  index = 0,
  pinned = false,
  onTogglePin,
}: Props) {
  const startsAt = new Date(activity.start_time);
  return (
    <div
      className={cn(
        "group relative animate-fade-up rounded-2xl border bg-card p-3 shadow-sm transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-md",
        pinned
          ? "border-amber-300/70 ring-1 ring-amber-200/50 dark:border-amber-500/40"
          : "border-border hover:border-primary/30",
      )}
      style={{ animationDelay: `${Math.min(index * 45, 360)}ms` }}
    >
      <Link
        href={`/activity/${activity.id}`}
        className="flex items-start gap-3"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-fuchsia-100 text-xl ring-1 ring-inset ring-white/40 dark:from-indigo-950/60 dark:to-fuchsia-950/60 dark:ring-white/5">
          {CATEGORY_EMOJI[activity.category]}
        </div>
        <div className="min-w-0 flex-1 pr-[4.75rem]">
          <div className="flex items-baseline gap-2">
            <h3 className="truncate font-medium leading-tight">
              {activity.title}
            </h3>
            <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
              {CATEGORY_LABEL[activity.category]}
            </span>
          </div>
          {activity.location_name && (
            <p className="truncate text-sm text-muted-foreground">
              {activity.location_name}
            </p>
          )}
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDistanceToNow(startsAt, { addSuffix: true })}</span>
            <span aria-hidden>·</span>
            <span>
              {activity.participant_count}/{activity.max_participants} joined
            </span>
          </div>
        </div>
      </Link>

      <div className="absolute right-2 top-2 flex items-center gap-1.5">
        <ShareButton
          path={`/activity/${activity.id}`}
          title={activity.title}
          text={`Join "${activity.title}"${activity.location_name ? ` at ${activity.location_name}` : ""} on Third Space`}
        />
        {onTogglePin && (
          <PinButton pinned={pinned} onToggle={onTogglePin} />
        )}
      </div>
    </div>
  );
}
