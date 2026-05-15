"use client";

import { StarRating } from "@/components/StarRating";
import { cn } from "@/lib/utils";
import type { VenueWithDistance } from "@/lib/venues/types";

function formatDistance(distanceMetres: number) {
  return distanceMetres < 1000
    ? `${distanceMetres} m`
    : `${(distanceMetres / 1000).toFixed(1)} km`;
}

export function SpaceCard({
  venue,
  selected,
  onSelect,
}: {
  venue: VenueWithDistance;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl border bg-card p-3 text-left shadow-sm transition-all hover:border-primary/40 hover:bg-accent/30",
        selected
          ? "border-primary/60 ring-2 ring-primary/15"
          : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 text-xs font-medium">
            <span>{venue.category.emoji}</span>
            {venue.category.label}
          </div>
          <h3 className="truncate text-sm font-semibold tracking-tight">
            {venue.name}
          </h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {venue.address ?? formatDistance(venue.distanceMetres)}
          </p>

          {/* Rating row */}
          <div className="mt-2 flex items-center gap-2">
            <StarRating
              value={Number(venue.avgRating)}
              size="sm"
              interactive={false}
            />
            <span className="text-xs font-medium">
              {Number(venue.avgRating).toFixed(1)}
            </span>
            <span className="text-[11px] text-muted-foreground">
              ({Number(venue.ratingCount)})
            </span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xs font-semibold text-foreground">
            {formatDistance(venue.distanceMetres)}
          </p>
        </div>
      </div>
    </button>
  );
}
