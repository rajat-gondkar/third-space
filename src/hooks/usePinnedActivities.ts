"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "thirdspace.pinned";
export const MAX_PINS = 2;

type ToggleResult = { ok: boolean; reason?: "max" };

const EMPTY: string[] = [];
const listeners = new Set<() => void>();

function readFromStorage(): string[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {
    // ignore corrupted storage
  }
  return EMPTY;
}

let snapshot: string[] = readFromStorage();

function commit(next: string[]) {
  snapshot = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // storage may be full or disabled
    }
  }
  listeners.forEach((fn) => fn());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  function onStorage(e: StorageEvent) {
    if (e.key === KEY) {
      snapshot = readFromStorage();
      callback();
    }
  }
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return EMPTY;
}

export function usePinnedActivities() {
  const pinned = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const isPinned = useCallback(
    (id: string) => pinned.includes(id),
    [pinned],
  );

  const togglePin = useCallback((id: string): ToggleResult => {
    const current = snapshot;
    if (current.includes(id)) {
      commit(current.filter((x) => x !== id));
      return { ok: true };
    }
    if (current.length >= MAX_PINS) {
      return { ok: false, reason: "max" };
    }
    commit([...current, id]);
    return { ok: true };
  }, []);

  return { pinned, isPinned, togglePin, max: MAX_PINS };
}
