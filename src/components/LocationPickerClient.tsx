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
  onChange: (coords: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function FlyTo({ to }: { to: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (to) map.flyTo([to.lat, to.lng], Math.max(map.getZoom(), 15));
  }, [to, map]);
  return null;
}

export default function LocationPickerClient({
  value,
  defaultCenter,
  onChange,
}: {
  value: { lat: number; lng: number } | null;
  defaultCenter: { lat: number; lng: number };
  onChange: (coords: { lat: number; lng: number }) => void;
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
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <ClickHandler onChange={onChange} />
      <FlyTo to={value} />
      {value && <Marker position={[value.lat, value.lng]} icon={pinIcon} />}
    </MapContainer>
  );
}
