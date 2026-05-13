"use client";

import dynamic from "next/dynamic";

import type { VenueWithDistance } from "@/lib/venues/types";

const SpacesMapClient = dynamic(() => import("./SpacesMapClient"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse bg-muted" aria-hidden />
  ),
});

type Props = {
  center: { lat: number; lng: number };
  radius: number;
  venues: VenueWithDistance[];
  selectedVenueId: number | null;
  onSelectVenue: (venueId: number) => void;
};

export function SpacesMap(props: Props) {
  return <SpacesMapClient {...props} />;
}
