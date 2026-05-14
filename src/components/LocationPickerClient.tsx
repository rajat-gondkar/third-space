"use client";

import { useEffect } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import { LocateControl } from "@/components/LocateControl";

type Coords = { lat: number; lng: number };

const pinIcon = L.divIcon({
  className: "ts-picker-pin",
  html: `<div style="
    display:flex;align-items:center;justify-content:center;
    width:36px;height:36px;border-radius:9999px;
    background:#ef4444;color:white;
    box-shadow:0 4px 14px rgba(0,0,0,0.25);
    border:2px solid white;font-size:18px;line-height:1;
    transform: translate(-18px,-36px);
  ">📍</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

function ClickHandler({
  onChange,
}: {
  onChange: (coords: Coords) => void;
}) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function FlyTo({ to }: { to: Coords | null }) {
  const map = useMap();
  useEffect(() => {
    if (to) map.flyTo([to.lat, to.lng], Math.max(map.getZoom(), 15));
  }, [to, map]);
  return null;
}

/** Fly to the user's GPS location on mount if no pin has been dropped yet. */
function InitialGeolocate({ hasValue }: { hasValue: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (hasValue) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.flyTo(
          [pos.coords.latitude, pos.coords.longitude],
          15,
          { animate: true },
        );
      },
      () => {},
      { timeout: 5000, maximumAge: 60_000 },
    );
  }, [hasValue, map]);
  return null;
}

/** Notify parent whenever the map center changes (pan, fly, zoom). */
function MapCenterTracker({
  onChange,
}: {
  onChange?: (c: Coords) => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!onChange) return;
    const handler = () => {
      const c = map.getCenter();
      onChange({ lat: c.lat, lng: c.lng });
    };
    map.on("moveend", handler);
    handler(); // initial center
    return () => {
      map.off("moveend", handler);
    };
  }, [map, onChange]);
  return null;
}

export default function LocationPickerClient({
  value,
  defaultCenter,
  onChange,
  onCenterChange,
}: {
  value: Coords | null;
  defaultCenter: Coords;
  onChange: (coords: Coords) => void;
  onCenterChange?: (coords: Coords) => void;
}) {
  const center = value ?? defaultCenter;
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={14}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />
      <LocateControl />
      <ClickHandler onChange={onChange} />
      <FlyTo to={value} />
      <InitialGeolocate hasValue={value !== null} />
      <MapCenterTracker onChange={onCenterChange} />
      {value && <Marker position={[value.lat, value.lng]} icon={pinIcon} />}
    </MapContainer>
  );
}
