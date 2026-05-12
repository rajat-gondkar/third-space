import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import {
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  type ActivityWithCount,
} from "@/lib/types";

export function ActivityCard({ activity }: { activity: ActivityWithCount }) {
  const startsAt = new Date(activity.start_time);
  return (
    <Link
      href={`/activity/${activity.id}`}
      className="group flex items-start gap-3 rounded-lg border border-border bg-card p-3 shadow-sm transition-colors hover:bg-accent"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-xl">
        {CATEGORY_EMOJI[activity.category]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h3 className="truncate font-medium leading-tight">
            {activity.title}
          </h3>
          <span className="shrink-0 text-xs text-muted-foreground">
            {CATEGORY_LABEL[activity.category]}
          </span>
        </div>
        {activity.location_name && (
          <p className="truncate text-sm text-muted-foreground">
            {activity.location_name}
          </p>
        )}
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatDistanceToNow(startsAt, { addSuffix: true })}</span>
          <span>·</span>
          <span>
            {activity.participant_count}/{activity.max_participants} joined
          </span>
        </div>
      </div>
    </Link>
  );
}
