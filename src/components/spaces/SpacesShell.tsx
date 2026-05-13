"use client";

import { useEffect, useState } from "react";

import { SpacesFiltersBar } from "@/components/spaces/SpacesFiltersBar";
import { SpacesList } from "@/components/spaces/SpacesList";
import { SpacesMap } from "@/components/spaces/SpacesMap";
import { VenueSheet } from "@/components/spaces/VenueSheet";
import { fetchNearbyVenues } from "@/lib/venues/client";
import type {
  VenueCategorySlug,
  VenueSortMode,
  VenueWithDistance,
} from "@/lib/venues/types";

type Coords = { lat: number; lng: number };

type Props = {
  defaultCenter: Coords;
};

export function SpacesShell({ defaultCenter }: Props) {
  const [center, setCenter] = useState(defaultCenter);
  const [venues, setVenues] = useState<VenueWithDistance[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [category, setCategory] = useState<VenueCategorySlug | null>(null);
  const [radius, setRadius] = useState(2000);
  const [sort, setSort] = useState<VenueSortMode>("nearest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {},
      { timeout: 5000, maximumAge: 60_000 },
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadVenues() {
      setLoading(true);
      setError(null);

      try {
        const nearby = await fetchNearbyVenues({
          lat: center.lat,
          lng: center.lng,
          radius,
          category,
          sort,
        });

        if (!cancelled) {
          setVenues(nearby);
          setSelectedVenueId((current) =>
            current && nearby.some((venue) => venue.id === current)
              ? current
              : nearby[0]?.id ?? null,
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setVenues([]);
          setSelectedVenueId(null);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load nearby venues.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadVenues();

    return () => {
      cancelled = true;
    };
  }, [category, center.lat, center.lng, radius, sort]);

  const selectedVenue =
    venues.find((venue) => venue.id === selectedVenueId) ?? null;

  function selectVenue(venueId: number) {
    setSelectedVenueId(venueId);
    setSheetOpen(true);
  }

  return (
    <div className="flex flex-1 flex-col md:grid md:grid-cols-[1fr_440px] md:overflow-hidden">
      <div className="relative h-[55vh] w-full shrink-0 md:h-full md:overflow-hidden">
        <SpacesMap
          center={center}
          radius={radius}
          venues={venues}
          selectedVenueId={selectedVenueId}
          onSelectVenue={selectVenue}
        />
        <VenueSheet
          venue={selectedVenue}
          center={center}
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
        />
      </div>

      <aside className="flex flex-col border-t border-border bg-background p-4 pb-24 md:min-h-0 md:overflow-hidden md:border-l md:border-t-0 md:pb-4">
        <div className="mb-3">
          <h2 className="text-lg font-semibold tracking-tight">Spaces</h2>
          <p className="text-xs text-muted-foreground">
            Cafes, parks, sports grounds, and hobby hubs near you
          </p>
        </div>

        {error && (
          <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mb-3">
          <SpacesFiltersBar
            category={category}
            radius={radius}
            sort={sort}
            onCategoryChange={setCategory}
            onRadiusChange={setRadius}
            onSortChange={setSort}
          />
        </div>

        <SpacesList
          venues={venues}
          loading={loading}
          selectedVenueId={selectedVenueId}
          onSelectVenue={selectVenue}
        />
      </aside>
    </div>
  );
}
