"use client";

import { Star } from "lucide-react";

import { cn } from "@/lib/utils";
import type { VenueWithDistance } from "@/lib/venues/types";

function formatDistance(distanceMetres: number) {
  return distanceMetres < 1000
    ? `${distanceMetres} m away`
    : `${(distanceMetres / 1000).toFixed(1)} km away`;
}

function scoreDots(score: number) {
  const filled = Math.max(0, Math.min(5, Math.round(score / 2)));
  return "●".repeat(filled) + "○".repeat(5 - filled);
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
        <div className="min-w-0">
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
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xs font-semibold text-foreground">
            {formatDistance(venue.distanceMetres)}
          </p>
          <p className="mt-2 flex items-center justify-end gap-1 text-[11px] text-amber-600">
            <Star className="size-3 fill-current" />
            <span className="font-mono tracking-normal">
              {scoreDots(venue.popularityScore)}
            </span>
          </p>
        </div>
      </div>
    </button>
  );
}
