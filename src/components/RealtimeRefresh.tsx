"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Table = "activities" | "participants";

type Props = {
  tables: Table[];
  channelName: string;
  // Safety-net polling interval (ms). Set to 0 to disable.
  // Defaults to 30s — paired with the push-based Realtime channel above, this
  // catches any updates that slip past a dropped WebSocket (cellular hand-off,
  // backgrounded tabs, paused projects, etc.). 30s keeps the perceived latency
  // low while avoiding the visible jank of a full server re-render every 15s.
  pollMs?: number;
};

export function RealtimeRefresh({
  tables,
  channelName,
  pollMs = 30_000,
}: Props) {
  const router = useRouter();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Stable dep key so we don't tear down the channel on every parent re-render
  // (the inline `tables={[...]}` array literal gets a new reference each render).
  const tablesKey = tables.join(",");

  useEffect(() => {
    const supabase = createClient();

    const debouncedRefresh = () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => router.refresh(), 300);
    };

    // ── 1. Push: Supabase Realtime over WebSocket ──────────────────────────
    const channel = supabase.channel(channelName);
    for (const table of tablesKey.split(",") as Table[]) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        debouncedRefresh,
      );
    }
    channel.subscribe();

    // ── 2. Pull: 15s safety-net poll, paused when tab is hidden ───────────
    function startPolling() {
      stopPolling();
      if (pollMs <= 0) return;
      pollTimer.current = setInterval(() => {
        if (document.visibilityState === "visible") {
          router.refresh();
        }
      }, pollMs);
    }
    function stopPolling() {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    }
    function onVisibility() {
      if (document.visibilityState === "visible") {
        // Tab just woke up — refresh immediately, then resume polling.
        router.refresh();
        startPolling();
      } else {
        stopPolling();
      }
    }

    document.addEventListener("visibilitychange", onVisibility);
    startPolling();

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibility);
      supabase.removeChannel(channel);
    };
  }, [router, channelName, tablesKey, pollMs]);

  return null;
}
