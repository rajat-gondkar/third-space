"use client";

import dynamic from "next/dynamic";

import type { ActivityWithCount } from "@/lib/types";

const MapClient = dynamic(() => import("./MapClient"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse bg-muted" aria-hidden />
  ),
});

export function Map(props: {
  center: { lat: number; lng: number };
  activities: ActivityWithCount[];
  radius?: number;
}) {
  return <MapClient {...props} />;
}
