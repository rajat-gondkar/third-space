"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, MessageSquare } from "lucide-react";

import { ThreadCard } from "@/components/threads/ThreadCard";
import type { Thread } from "@/lib/types";

type ThreadWithDistance = Thread & { distanceMetres?: number };

export function ThreadsShell() {
  const [threads, setThreads] = useState<ThreadWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        // Fallback to default location (Bangalore)
        setUserLocation({ lat: 12.9716, lng: 77.5946 });
      },
      { timeout: 5000, maximumAge: 60_000 },
    );
  }, []);

  useEffect(() => {
    if (!userLocation) return;

    let cancelled = false;

    async function loadThreads() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          lat: String(userLocation!.lat),
          lng: String(userLocation!.lng),
        });
        const res = await fetch(`/api/threads?${params.toString()}`);
        const payload = (await res.json()) as {
          threads?: Thread[];
          error?: string;
        };
        if (!res.ok) throw new Error(payload.error ?? "Could not load threads.");

        // Compute rough distance for display (threads don't have distance from API directly,
        // but we can estimate from lat/lng if available)
        const threadsWithDist = (payload.threads ?? [])
          .filter((t) => (t.post_count ?? 0) > 0)
          .map((t) => {
            let distanceMetres: number | undefined;
            if (t.lat != null && t.lng != null) {
              distanceMetres = haversine(
                userLocation!.lat,
                userLocation!.lng,
                t.lat,
                t.lng,
              );
            }
            return { ...t, distanceMetres };
          });

        if (!cancelled) setThreads(threadsWithDist);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load threads.");
          setThreads([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadThreads();

    return () => {
      cancelled = true;
    };
  }, [userLocation]);

  return (
    <div className="flex-1 p-4 pb-24">
      <div className="mx-auto max-w-screen-md">
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight">Threads</h2>
          <p className="text-xs text-muted-foreground">
            Discussions about spaces near you
          </p>
        </div>

        {error && (
          <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/2 rounded bg-muted" />
                    <div className="h-2 w-1/3 rounded bg-muted" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && threads.length === 0 && (
          <div className="animate-fade-up rounded-2xl border border-dashed border-border bg-gradient-to-br from-primary/5 via-transparent to-fuchsia-500/5 p-6 text-center">
            <MessageSquare className="mx-auto size-8 text-primary/60" />
            <p className="mt-2 font-medium">No conversations yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start a conversation from a space on the map.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {threads.map((thread, i) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              index={i}
              distanceMetres={thread.distanceMetres}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
