"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { ActivityList } from "@/components/ActivityList";
import { Map } from "@/components/Map";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ACTIVITY_CATEGORIES,
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  type ActivityCategory,
  type ActivityWithCount,
} from "@/lib/types";

type Coords = { lat: number; lng: number };

function haversineMeters(a: Coords, b: Coords): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const radLatA = (a.lat * Math.PI) / 180;
  const radLatB = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radLatA) * Math.cos(radLatB) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

const categoryItems: Array<{
  value: ActivityCategory | null;
  label: string;
  emoji: string;
}> = [
  { value: null, label: "All", emoji: "✨" },
  ...ACTIVITY_CATEGORIES.map((c) => ({
    value: c,
    label: CATEGORY_LABEL[c],
    emoji: CATEGORY_EMOJI[c],
  })),
];

const radii = [
  { value: 500, label: "500 m" },
  { value: 1000, label: "1 km" },
  { value: 2000, label: "2 km" },
  { value: 5000, label: "5 km" },
];

type Props = {
  activities: ActivityWithCount[];
  defaultCenter: Coords;
  errorMessage?: string;
};

export function MapShell({ activities, defaultCenter, errorMessage }: Props) {
  const [center, setCenter] = useState<Coords>(defaultCenter);
  const [radius, setRadius] = useState(5000);
  const [category, setCategory] = useState<ActivityCategory | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {},
      { timeout: 5000, maximumAge: 60_000 },
    );
  }, []);

  const filteredActivities = useMemo(() => {
    let out = activities;
    if (category) {
      out = out.filter((a) => a.category === category);
    }
    out = out.filter(
      (a) => haversineMeters(center, { lat: a.lat, lng: a.lng }) <= radius,
    );
    return out;
  }, [activities, category, center, radius]);

  return (
    <div className="flex flex-1 flex-col md:grid md:grid-cols-[1fr_440px] md:overflow-hidden">
      <div className="relative h-[55vh] w-full shrink-0 md:h-full md:overflow-hidden">
        <Map center={center} activities={filteredActivities} radius={radius} />
      </div>

      <aside className="flex flex-col border-t border-border bg-background p-4 pb-24 md:min-h-0 md:overflow-hidden md:border-l md:border-t-0 md:pb-4">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Happening now
            </h2>
            <p className="text-xs text-muted-foreground">
              Pin up to 2 &middot; filter by today, date, or area
            </p>
          </div>
          <Button
            asChild
            size="sm"
            className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md ring-1 ring-white/20 transition-transform hover:scale-[1.03] hover:opacity-95"
          >
            <Link href="/post">
              <Plus />
              Post
            </Link>
          </Button>
        </div>

        {errorMessage && (
          <p className="mb-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Couldn&rsquo;t load activities: {errorMessage}
          </p>
        )}

        {/* Category pills */}
        <div className="-mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-1">
          {categoryItems.map((item) => {
            const active = item.value === category;
            return (
              <button
                key={item.value ?? "all"}
                type="button"
                onClick={() => setCategory(item.value)}
                className={cn(
                  "h-8 shrink-0 rounded-full border px-3 text-xs font-medium shadow-sm transition-colors",
                  active
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-primary/40 hover:bg-accent/60",
                )}
              >
                {item.emoji} {item.label}
              </button>
            );
          })}
        </div>

        {/* Radius grid */}
        <div className="mb-3 grid grid-cols-4 rounded-full border border-border bg-card p-1 shadow-sm">
          {radii.map((item) => {
            const active = item.value === radius;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setRadius(item.value)}
                className={cn(
                  "h-7 rounded-full text-[11px] font-semibold transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <ActivityList activities={filteredActivities} />
      </aside>
    </div>
  );
}
