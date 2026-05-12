"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { formatDistanceToNow } from "date-fns";

import {
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  type ActivityWithCount,
} from "@/lib/types";

type Coords = { lat: number; lng: number };

type MapClientProps = {
  center: Coords;
  activities: ActivityWithCount[];
};

function useGeolocatedCenter(fallback: Coords): Coords {
  const [center, setCenter] = useState<Coords>(fallback);
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setCenter({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => {},
      { timeout: 5000, maximumAge: 60_000 },
    );
  }, []);
  return center;
}

function categoryIcon(category: ActivityWithCount["category"]) {
  const emoji = CATEGORY_EMOJI[category] ?? "📍";
  return L.divIcon({
    className: "ts-pin",
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      width:38px;height:38px;border-radius:9999px;
      background:white;box-shadow:0 4px 12px rgba(0,0,0,0.18);
      border:2px solid white;font-size:20px;line-height:1;
      transform: translate(-19px,-38px);
    ">${emoji}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -36],
  });
}

function Recenter({ center }: { center: Coords }) {
  const map = useMap();
  map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
  return null;
}

export default function MapClient({ center, activities }: MapClientProps) {
  const liveCenter = useGeolocatedCenter(center);
  const markers = useMemo(
    () =>
      activities.map((a) => (
        <Marker
          key={a.id}
          position={[a.lat, a.lng]}
          icon={categoryIcon(a.category)}
        >
          <Popup>
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wide text-zinc-500">
                {CATEGORY_LABEL[a.category]}
              </div>
              <div className="font-semibold text-base">{a.title}</div>
              {a.location_name && (
                <div className="text-xs text-zinc-600">{a.location_name}</div>
              )}
              <div className="text-xs text-zinc-600">
                Starts{" "}
                {formatDistanceToNow(new Date(a.start_time), {
                  addSuffix: true,
                })}
              </div>
              <div className="text-xs text-zinc-600">
                {a.participant_count}/{a.max_participants} joined
              </div>
              <Link
                href={`/activity/${a.id}`}
                className="inline-block mt-1 text-sm font-medium text-blue-600 hover:underline"
              >
                View →
              </Link>
            </div>
          </Popup>
        </Marker>
      )),
    [activities],
  );

  return (
    <MapContainer
      center={[liveCenter.lat, liveCenter.lng]}
      zoom={14}
      scrollWheelZoom
      className="h-full w-full"
    >
      <Recenter center={liveCenter} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      {markers}
    </MapContainer>
  );
}
