"use client";

import dynamic from "next/dynamic";

const LocationPickerClient = dynamic(() => import("./LocationPickerClient"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse bg-muted" aria-hidden />
  ),
});

export function LocationPicker(props: {
  value: { lat: number; lng: number } | null;
  defaultCenter: { lat: number; lng: number };
  onChange: (coords: { lat: number; lng: number }) => void;
  onCenterChange?: (coords: { lat: number; lng: number }) => void;
}) {
  return <LocationPickerClient {...props} />;
}
