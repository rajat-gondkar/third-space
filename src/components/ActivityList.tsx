"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";

import { ActivityCard } from "@/components/ActivityCard";
import { Button } from "@/components/ui/button";
import { usePinnedActivities } from "@/hooks/usePinnedActivities";
import type { ActivityWithCount } from "@/lib/types";

export function ActivityList({
  activities,
  filterActive = false,
}: {
  activities: ActivityWithCount[];
  filterActive?: boolean;
}) {
  const { isPinned, togglePin } = usePinnedActivities();

  // Dedupe by activity id — guards against duplicate rows from any source
  const uniqueActivities = useMemo(() => {
    const seen = new Set<string>();
    const out: ActivityWithCount[] = [];
    for (const a of activities) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      out.push(a);
    }
    return out;
  }, [activities]);

  const pinnedActivities = useMemo(
    () => uniqueActivities.filter((a) => isPinned(a.id)),
    [uniqueActivities, isPinned],
  );
  const pinnedIds = new Set(pinnedActivities.map((a) => a.id));
  const remaining = uniqueActivities.filter((a) => !pinnedIds.has(a.id));

  const showEmpty = pinnedActivities.length === 0 && remaining.length === 0;

  return (
    <div className="flex flex-col gap-3 md:h-full md:overflow-hidden">
      <div className="space-y-4 md:flex-1 md:overflow-y-auto md:pr-1">
        {pinnedActivities.length > 0 && (
          <section className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <span>📌</span>
              Pinned
            </h3>
            <div className="space-y-2">
              {pinnedActivities.map((a, i) => (
                <ActivityCard
                  key={a.id}
                  activity={a}
                  index={i}
                  pinned
                  onTogglePin={() => togglePin(a.id)}
                />
              ))}
            </div>
          </section>
        )}

        {remaining.length > 0 && (
          <section className="space-y-2">
            {pinnedActivities.length > 0 && (
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Everything else
              </h3>
            )}
            <div className="space-y-2">
              {remaining.map((a, i) => (
                <ActivityCard
                  key={a.id}
                  activity={a}
                  index={i + pinnedActivities.length}
                  pinned={false}
                  onTogglePin={() => togglePin(a.id)}
                />
              ))}
            </div>
          </section>
        )}

        {showEmpty && (
          <div className="animate-fade-up rounded-2xl border border-dashed border-border bg-gradient-to-br from-primary/5 via-transparent to-fuchsia-500/5 p-6 text-center">
            <Sparkles className="mx-auto size-8 text-primary/60" />
            <p className="mt-2 font-medium">
              {uniqueActivities.length === 0
                ? "No activities nearby"
                : filterActive
                  ? "Nothing matches your filters"
                  : "Quiet right now"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {uniqueActivities.length === 0
                ? "Be the first to post one."
                : filterActive
                  ? "Try clearing them, or post something new."
                  : "Post something and the map fills up."}
            </p>
            <Button asChild size="sm" className="mt-3">
              <Link href="/post">
                <Plus />
                Post an activity
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
