"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, MapPin, X } from "lucide-react";

import { fetchVenueDetail, upvoteVenueTag } from "@/lib/venues/client";
import type {
  VenueCategorySlug,
  VenueDetail,
  VenueTag,
  VenueWithDistance,
} from "@/lib/venues/types";
import { cn } from "@/lib/utils";

const DEFAULT_TAGS: Record<VenueCategorySlug, string[]> = {
  cafe: ["quiet", "good wifi", "power outlets", "outdoor seating", "dog friendly"],
  park: ["dog friendly", "open late", "walking paths", "playground"],
  sports: ["floodlit", "booking required", "open access"],
  hobby: ["free entry", "drop-in welcome", "beginner friendly"],
};

function formatDistance(distanceMetres: number) {
  return distanceMetres < 1000
    ? `${distanceMetres} m away`
    : `${(distanceMetres / 1000).toFixed(1)} km away`;
}

function readableTagKey(key: string) {
  return key.replace(/^contact:/, "").replace(/^addr:/, "").replace(/_/g, " ");
}

function osmUrl(venue: VenueDetail) {
  if (!venue.osmId || !venue.osmType) return null;
  return `https://www.openstreetmap.org/${venue.osmType}/${venue.osmId}`;
}

function mergeTags(detail: VenueDetail | null, fallback: VenueWithDistance | null) {
  const base = fallback ? DEFAULT_TAGS[fallback.category.slug] : [];
  const existing = detail?.tags ?? [];
  const seen = new Set(existing.map((item) => item.tag));
  const defaults = base
    .filter((tag) => !seen.has(tag))
    .map(
      (tag, index): VenueTag => ({
        id: -index - 1,
        tag,
        count: 0,
      }),
    );

  return [...existing, ...defaults];
}

export function VenueSheet({
  venue,
  center,
  open,
  onClose,
}: {
  venue: VenueWithDistance | null;
  center: { lat: number; lng: number };
  open: boolean;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<VenueDetail | null>(null);
  const [error, setError] = useState<{
    venueId: number;
    message: string;
  } | null>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !venue) return;

    let cancelled = false;

    fetchVenueDetail({ id: venue.id, lat: center.lat, lng: center.lng })
      .then((loaded) => {
        if (!cancelled) {
          setDetail(loaded);
          setError(null);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError({
            venueId: venue.id,
            message:
              loadError instanceof Error
                ? loadError.message
                : "Could not load venue details.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [center.lat, center.lng, open, venue]);

  const venueId = venue?.id ?? null;
  const currentDetail = venueId !== null && detail?.id === venueId ? detail : null;
  const currentError =
    venueId !== null && error?.venueId === venueId ? error.message : null;
  const loading = open && !currentDetail && !currentError;
  const activeVenue = currentDetail ?? venue;
  const tags = useMemo(() => mergeTags(currentDetail, venue), [currentDetail, venue]);
  const highlightTags = useMemo(() => {
    if (!currentDetail) return [];

    return Object.entries(currentDetail.osmTags)
      .filter(([key, value]) =>
        Boolean(
          value &&
            [
              "opening_hours",
              "phone",
              "contact:phone",
              "website",
              "contact:website",
              "wheelchair",
              "outdoor_seating",
            ].includes(key),
        ),
      )
      .slice(0, 8);
  }, [currentDetail]);

  if (!venue || !activeVenue) return null;

  async function handleTagClick(tag: string) {
    if (!venue) return;

    const updated = await upvoteVenueTag({ venueId: venue.id, tag });
    setDetail((current) => {
      if (!current) return current;
      const tags = current.tags.some((item) => item.tag === updated.tag)
        ? current.tags.map((item) => (item.tag === updated.tag ? updated : item))
        : [updated, ...current.tags];

      return { ...current, tags };
    });
  }

  const url = currentDetail ? osmUrl(currentDetail) : null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 transition-opacity md:absolute md:inset-auto md:bottom-4 md:left-4 md:right-4",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/30 md:hidden"
        aria-label="Close venue details"
        onClick={onClose}
      />

      <section
        className={cn(
          "absolute inset-x-0 bottom-0 max-h-[82dvh] rounded-t-2xl border border-border bg-background shadow-2xl transition-transform md:relative md:max-h-[430px] md:rounded-xl",
          open ? "translate-y-0" : "translate-y-full",
        )}
        onTouchStart={(event) => setDragStart(event.touches[0]?.clientY ?? null)}
        onTouchEnd={(event) => {
          if (dragStart === null) return;
          const end = event.changedTouches[0]?.clientY ?? dragStart;
          if (end - dragStart > 80) onClose();
          setDragStart(null);
        }}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/30 md:hidden" />
        <div className="max-h-[calc(82dvh-0.5rem)] overflow-y-auto p-4 md:max-h-[430px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-xs font-medium">
                <span>{activeVenue.category.emoji}</span>
                {activeVenue.category.label}
              </div>
              <h3 className="text-lg font-semibold tracking-tight">
                {activeVenue.name}
              </h3>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" />
                <span className="truncate">
                  {activeVenue.address ?? formatDistance(activeVenue.distanceMetres)}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-accent"
              aria-label="Close venue details"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500"
              style={{
                width: `${Math.max(6, Math.min(100, activeVenue.popularityScore * 10))}%`,
              }}
            />
          </div>

          {currentError && (
            <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {currentError}
            </p>
          )}

          <section className="mt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Vibe tags
            </h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.tag}
                  type="button"
                  onClick={() => handleTagClick(tag.tag)}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-primary/10"
                >
                  {tag.tag}
                  {tag.count > 0 && (
                    <span className="ml-1 text-muted-foreground">{tag.count}</span>
                  )}
                </button>
              ))}
            </div>
          </section>

          <section className="mt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Happening here
            </h4>
            <div className="mt-2 space-y-2">
              {loading && (
                <div className="h-10 animate-pulse rounded-lg bg-muted" />
              )}
              {!loading &&
                currentDetail?.activities.map((activity) => (
                  <Link
                    key={activity.id}
                    href={`/activity/${activity.id}`}
                    className="block rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:border-primary/40"
                  >
                    <span className="font-medium">{activity.title}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {activity.distanceMetres} m
                    </span>
                  </Link>
                ))}
              {!loading && currentDetail?.activities.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No active activities at this spot yet.
                </p>
              )}
            </div>
          </section>

          {highlightTags.length > 0 && (
            <section className="mt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                OSM details
              </h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {highlightTags.map(([key, value]) => (
                  <span
                    key={key}
                    className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    {readableTagKey(key)}: {value}
                  </span>
                ))}
              </div>
            </section>
          )}

          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Open in OpenStreetMap
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
