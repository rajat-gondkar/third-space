"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus, ChevronDown, CalendarDays, MapPin } from "lucide-react";

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

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function withinDay(t: number, day: Date) {
  const start = startOfDay(day).getTime();
  const end = start + 24 * 60 * 60 * 1000;
  return t >= start && t < end;
}

const categoryItems: Array<{
  value: ActivityCategory | null;
  label: string;
  emoji: string;
}> = [
  { value: null, label: "All Activities", emoji: "✨" },
  ...ACTIVITY_CATEGORIES.map((c) => ({
    value: c,
    label: CATEGORY_LABEL[c],
    emoji: CATEGORY_EMOJI[c],
  })),
];

const radii = [
  { value: 500, label: "500m" },
  { value: 1000, label: "1km" },
  { value: 2000, label: "2km" },
  { value: 5000, label: "5km" },
];

function formatDateShort(d: Date) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

type Props = {
  activities: ActivityWithCount[];
  defaultCenter: Coords;
  errorMessage?: string;
};

export function MapShell({ activities, defaultCenter, errorMessage }: Props) {
  const [center, setCenter] = useState<Coords>(defaultCenter);
  const [radius, setRadius] = useState(500);
  const [category, setCategory] = useState<ActivityCategory | null>(null);
  const [dateMode, setDateMode] = useState<"today" | "date">("today");
  const [customDate, setCustomDate] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Geolocation
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

  // Close category dropdown on outside click
  useEffect(() => {
    if (!categoryOpen) return;
    function handleClick(e: MouseEvent) {
      if (!categoryRef.current?.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [categoryOpen]);

  const filteredActivities = useMemo(() => {
    let out = activities;
    if (category) {
      out = out.filter((a) => a.category === category);
    }
    out = out.filter(
      (a) => haversineMeters(center, { lat: a.lat, lng: a.lng }) <= radius,
    );
    out = out.filter((a) => {
      const t = new Date(a.start_time).getTime();
      if (dateMode === "today") {
        return withinDay(t, new Date());
      }
      if (dateMode === "date" && customDate) {
        return withinDay(t, new Date(`${customDate}T00:00:00`));
      }
      return true;
    });
    return out;
  }, [activities, category, center, radius, dateMode, customDate]);

  const filterActive = category !== null || dateMode === "date";

  // Radius cycling
  function cycleRadius() {
    const idx = radii.findIndex((r) => r.value === radius);
    const next = radii[(idx + 1) % radii.length];
    setRadius(next.value);
  }

  // Category button label
  const activeCategory = categoryItems.find((c) => c.value === category);
  const categoryLabel = activeCategory
    ? `${activeCategory.emoji} ${activeCategory.label}`
    : "✨ All";

  // Date button label
  let dateLabel = "Today";
  if (dateMode === "date" && customDate) {
    dateLabel = formatDateShort(new Date(`${customDate}T00:00:00`));
  }

  const activeRadius = radii.find((r) => r.value === radius)!;

  return (
    <div className="flex flex-1 flex-col md:grid md:grid-cols-[1fr_440px] md:overflow-hidden">
      <div className="relative h-[55vh] w-full shrink-0 md:h-full md:overflow-hidden">
        <Map center={center} activities={activities} radius={radius} />
      </div>

      <aside className="flex flex-col border-t border-border bg-background p-4 pb-24 md:min-h-0 md:overflow-hidden md:border-l md:border-t-0 md:pb-4">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Happening now
            </h2>
            <p className="text-xs text-muted-foreground">
              Pin up to 2 &middot; tap to join
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

        {/* Single-row filter bar */}
        <div className="mb-3 flex items-center gap-2">
          {/* Category dropdown */}
          <div ref={categoryRef} className="relative">
            <button
              type="button"
              onClick={() => setCategoryOpen((v) => !v)}
              className={cn(
                "flex h-9 w-[120px] items-center justify-between rounded-full border px-3 text-xs font-medium shadow-sm transition-colors md:w-[128px]",
                category
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/40 hover:bg-accent/60",
              )}
            >
              <span className="truncate">{categoryLabel}</span>
              <ChevronDown
                className={cn(
                  "ml-1 size-3 shrink-0 transition-transform",
                  categoryOpen && "rotate-180",
                )}
              />
            </button>

            {categoryOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-lg">
                {categoryItems.map((item) => (
                  <button
                    key={item.value ?? "all"}
                    type="button"
                    onClick={() => {
                      setCategory(item.value);
                      setCategoryOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors",
                      item.value === category
                        ? "bg-primary/10 font-semibold text-primary"
                        : "hover:bg-accent/60",
                    )}
                  >
                    <span className="text-sm">{item.emoji}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Radius cycle button */}
          <button
            type="button"
            onClick={cycleRadius}
            className={cn(
              "flex h-9 w-[120px] items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-semibold shadow-sm transition-colors md:w-[128px]",
              "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-accent/60",
            )}
          >
            <MapPin className="size-3 shrink-0" />
            <span>{activeRadius.label}</span>
          </button>

          {/* Date picker button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => dateInputRef.current?.showPicker?.()}
              className={cn(
                "flex h-9 w-[120px] items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-semibold shadow-sm transition-colors md:w-[128px]",
                dateMode === "date" && customDate
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-accent/60",
              )}
            >
              <CalendarDays className="size-3 shrink-0" />
              <span className="truncate">{dateLabel}</span>
            </button>
            <input
              ref={dateInputRef}
              type="date"
              className="pointer-events-none absolute inset-0 opacity-0"
              value={customDate}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  setDateMode("today");
                  setCustomDate("");
                  return;
                }
                const picked = new Date(`${val}T00:00:00`);
                const today = startOfDay(new Date());
                if (picked.getTime() === today.getTime()) {
                  setDateMode("today");
                  setCustomDate("");
                } else {
                  setDateMode("date");
                  setCustomDate(val);
                }
              }}
            />
          </div>
        </div>

        <ActivityList
          activities={filteredActivities}
          filterActive={filterActive}
        />
      </aside>
    </div>
  );
}
