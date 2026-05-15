"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, MapPin, Sparkles } from "lucide-react";

import type { Thread } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatDistance(distanceMetres: number) {
  return distanceMetres < 1000
    ? `${distanceMetres} m`
    : `${(distanceMetres / 1000).toFixed(1)} km`;
}

export function ThreadCard({
  thread,
  index = 0,
  distanceMetres,
}: {
  thread: Thread;
  index?: number;
  distanceMetres?: number;
}) {
  return (
    <Link href={`/threads/${thread.id}`}>
      <div
        className={cn(
          "group animate-fade-up rounded-2xl border bg-card p-4 shadow-sm transition-all duration-200",
          "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md",
          "border-border",
        )}
        style={{ animationDelay: `${Math.min(index * 45, 360)}ms` }}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-fuchsia-100 text-xl ring-1 ring-inset ring-white/40 dark:from-indigo-950/60 dark:to-fuchsia-950/60 dark:ring-white/5">
            {thread.category_emoji ?? "📍"}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium leading-tight">
              {thread.name}
            </h3>
            {thread.location_name && (
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                <MapPin className="size-3 shrink-0" />
                {thread.location_name}
              </p>
            )}
            <div className="mt-2 flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="size-3.5" />
                {thread.post_count ?? 0} posts
              </span>
              {typeof distanceMetres === "number" && (
                <span className="text-xs text-muted-foreground">
                  {formatDistance(distanceMetres)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
