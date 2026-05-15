"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { AddVenueModal } from "@/components/spaces/AddVenueModal";
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
  const [allVenues, setAllVenues] = useState<VenueWithDistance[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [category, setCategory] = useState<VenueCategorySlug | null>(null);
  const [radius, setRadius] = useState(2000);
  const [sort, setSort] = useState<VenueSortMode>("nearest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

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
        const all = await fetchNearbyVenues({
          lat: center.lat,
          lng: center.lng,
          sort,
          all: true,
        });

        if (!cancelled) {
          setAllVenues(all);
          setSelectedVenueId((current) =>
            current && all.some((venue) => venue.id === current)
              ? current
              : all[0]?.id ?? null,
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setAllVenues([]);
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
  }, [center.lat, center.lng, sort]);

  const listVenues = useMemo(() => {
    let out = allVenues;
    if (category) {
      out = out.filter((v) => v.category.slug === category);
    }
    out = out.filter((v) => v.distanceMetres <= radius);
    return out;
  }, [allVenues, category, radius]);

  const selectedVenue =
    allVenues.find((venue) => venue.id === selectedVenueId) ?? null;

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
          venues={allVenues}
          selectedVenueId={selectedVenueId}
          onSelectVenue={selectVenue}
        />
        <VenueSheet
          venue={selectedVenue}
          center={center}
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
        />

        {/* Floating add button */}
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="absolute bottom-4 right-4 z-[40] flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg ring-2 ring-white/40 transition-transform hover:scale-110 active:scale-95 md:bottom-6 md:right-6"
          aria-label="Suggest a space"
          title="Suggest a space"
        >
          <Plus className="size-6" />
        </button>
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
          venues={listVenues}
          loading={loading}
          selectedVenueId={selectedVenueId}
          onSelectVenue={selectVenue}
        />
      </aside>

      <AddVenueModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </div>
  );
}
