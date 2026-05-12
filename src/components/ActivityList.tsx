"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";

import { ActivityCard } from "@/components/ActivityCard";
import {
  EMPTY_FILTERS,
  FiltersBar,
  isFilterActive,
  type Filters,
} from "@/components/FiltersBar";
import { Button } from "@/components/ui/button";
import { usePinnedActivities } from "@/hooks/usePinnedActivities";
import type { ActivityWithCount } from "@/lib/types";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function withinDay(t: number, day: Date) {
  const start = startOfDay(day).getTime();
  const end = start + 24 * 60 * 60 * 1000;
  return t >= start && t < end;
}

export function ActivityList({
  activities,
}: {
  activities: ActivityWithCount[];
}) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const { isPinned, togglePin } = usePinnedActivities();

  const filtered = useMemo(() => {
    const q = filters.location.trim().toLowerCase();
    return activities.filter((a) => {
      if (q) {
        const hay = `${a.location_name ?? ""} ${a.title}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const t = new Date(a.start_time).getTime();
      if (filters.mode === "today") {
        if (!withinDay(t, new Date())) return false;
      } else if (filters.mode === "date" && filters.date) {
        if (!withinDay(t, new Date(`${filters.date}T00:00:00`))) return false;
      }
      return true;
    });
  }, [activities, filters]);

  const pinnedActivities = useMemo(
    () => activities.filter((a) => isPinned(a.id)),
    [activities, isPinned],
  );
  const pinnedIds = new Set(pinnedActivities.map((a) => a.id));
  const remaining = filtered.filter((a) => !pinnedIds.has(a.id));

  const showEmpty = pinnedActivities.length === 0 && remaining.length === 0;
  const filterActive = isFilterActive(filters);

  return (
    <div className="flex flex-col gap-3 md:h-full md:overflow-hidden">
      <FiltersBar filters={filters} onChange={setFilters} />

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
              {activities.length === 0
                ? "No activities nearby"
                : filterActive
                  ? "Nothing matches your filters"
                  : "Quiet right now"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {activities.length === 0
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
