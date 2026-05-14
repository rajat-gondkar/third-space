"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import { LocateControl } from "./LocateControl";
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
      width:40px;height:40px;border-radius:9999px;
      background: linear-gradient(135deg, #ffffff 0%, #faf5ff 100%);
      box-shadow: 0 6px 18px rgba(99,102,241,0.28), 0 2px 4px rgba(0,0,0,0.08);
      border: 2px solid rgba(167,139,250,0.6);
      font-size:20px;line-height:1;
      transform: translate(-20px,-40px);
    ">${emoji}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -38],
  });
}

function Recenter({ center }: { center: Coords }) {
  const map = useMap();
  map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
  return null;
}

export default function MapClient({ center, activities }: MapClientProps) {
  const liveCenter = useGeolocatedCenter(center);
  // Dedupe by id so a duplicate row never produces two stacked markers at the
  // same coordinates (which would otherwise be indistinguishable on the map).
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
  const markers = useMemo(
    () =>
      uniqueActivities.map((a) => (
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
    [uniqueActivities],
  );

  return (
    <MapContainer
      center={[liveCenter.lat, liveCenter.lng]}
      zoom={14}
      scrollWheelZoom
      className="h-full w-full"
    >
      <Recenter center={liveCenter} />
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
