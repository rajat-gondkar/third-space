"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import { LocateControl } from "@/components/LocateControl";
import type { VenueCategorySlug, VenueWithDistance } from "@/lib/venues/types";

type Coords = { lat: number; lng: number };

const PIN_COLORS: Record<VenueCategorySlug, string> = {
  cafe: "#7B4F2E",
  park: "#2D7A3A",
  sports: "#2563EB",
  hobby: "#7C3AED",
};

function venueIcon(venue: VenueWithDistance, selected: boolean) {
  const color = PIN_COLORS[venue.category.slug];
  const size = selected ? 44 : 38;
  const offset = size / 2;

  return L.divIcon({
    className: "ts-space-pin",
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      width:${size}px;height:${size}px;border-radius:9999px;
      background:${color};color:#fff;
      box-shadow:0 8px 20px rgba(15,23,42,0.22),0 2px 6px rgba(15,23,42,0.16);
      border:3px solid rgba(255,255,255,0.92);
      font-size:18px;line-height:1;
      transform:translate(-${offset}px,-${size}px);
    ">${venue.category.emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [offset, size],
    popupAnchor: [0, -size + 4],
  });
}

function Recenter({ center }: { center: Coords }) {
  const map = useMap();

  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
  }, [center.lat, center.lng, map]);

  return null;
}

function RadiusZoom({ radius }: { radius: number }) {
  const map = useMap();

  useEffect(() => {
    const zoom = radius <= 500 ? 16 : radius <= 1000 ? 15 : radius <= 2000 ? 14 : 13;
    map.setZoom(zoom, { animate: true });
  }, [map, radius]);

  return null;
}

export default function SpacesMapClient({
  center,
  radius,
  venues,
  selectedVenueId,
  onSelectVenue,
}: {
  center: Coords;
  radius: number;
  venues: VenueWithDistance[];
  selectedVenueId: number | null;
  onSelectVenue: (venueId: number) => void;
}) {
  const markers = useMemo(
    () =>
      venues.map((venue) => (
        <Marker
          key={venue.id}
          position={[venue.lat, venue.lng]}
          icon={venueIcon(venue, venue.id === selectedVenueId)}
          eventHandlers={{ click: () => onSelectVenue(venue.id) }}
        >
          <Popup>
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wide text-zinc-500">
                {venue.category.emoji} {venue.category.label}
              </div>
              <div className="text-base font-semibold">{venue.name}</div>
              {venue.address && (
                <div className="text-xs text-zinc-600">{venue.address}</div>
              )}
              <div className="text-xs text-zinc-600">
                {venue.distanceMetres < 1000
                  ? `${venue.distanceMetres} m away`
                  : `${(venue.distanceMetres / 1000).toFixed(1)} km away`}
              </div>
            </div>
          </Popup>
        </Marker>
      )),
    [onSelectVenue, selectedVenueId, venues],
  );

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={14}
      scrollWheelZoom
      className="h-full w-full"
    >
      <Recenter center={center} />
      <RadiusZoom radius={radius} />
      <LocateControl />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      {markers}
    </MapContainer>
  );
}
