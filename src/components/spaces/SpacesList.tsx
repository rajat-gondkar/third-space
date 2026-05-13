"use client";

import { MapPin } from "lucide-react";

import { SpaceCard } from "@/components/spaces/SpaceCard";
import type { VenueWithDistance } from "@/lib/venues/types";

export function SpacesList({
  venues,
  loading,
  selectedVenueId,
  onSelectVenue,
}: {
  venues: VenueWithDistance[];
  loading: boolean;
  selectedVenueId: number | null;
  onSelectVenue: (venueId: number) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2 md:flex-1 md:overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-xl border border-border bg-card"
          />
        ))}
      </div>
    );
  }

  if (venues.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-gradient-to-br from-primary/5 via-transparent to-emerald-500/5 p-6 text-center">
        <MapPin className="mx-auto size-8 text-primary/60" />
        <p className="mt-2 font-medium">No spaces found nearby</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Seed the venues database, then this list will fill with nearby places.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 md:flex-1 md:overflow-y-auto md:pr-1">
      {venues.map((venue) => (
        <SpaceCard
          key={venue.id}
          venue={venue}
          selected={venue.id === selectedVenueId}
          onSelect={() => onSelectVenue(venue.id)}
        />
      ))}
    </div>
  );
}
