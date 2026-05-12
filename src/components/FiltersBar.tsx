"use client";

import { CalendarDays, MapPin, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type Filters = {
  mode: "all" | "today" | "date";
  date: string; // YYYY-MM-DD
  location: string;
};

export const EMPTY_FILTERS: Filters = {
  mode: "all",
  date: "",
  location: "",
};

export function isFilterActive(f: Filters) {
  return f.mode !== "all" || f.location.trim().length > 0;
}

export function FiltersBar({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  const active = isFilterActive(filters);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() =>
          onChange({
            ...filters,
            mode: filters.mode === "today" ? "all" : "today",
            date: "",
          })
        }
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium shadow-sm transition-all",
          filters.mode === "today"
            ? "border-transparent bg-gradient-to-r from-indigo-500 to-pink-500 text-white shadow"
            : "border-border bg-card hover:border-primary/40 hover:bg-accent/60",
        )}
      >
        <CalendarDays className="size-3.5" />
        Today
      </button>

      <label
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs shadow-sm transition-colors",
          filters.mode === "date"
            ? "border-primary/60 bg-primary/10"
            : "border-border bg-card hover:border-primary/40",
        )}
      >
        <CalendarDays className="size-3.5 text-muted-foreground" />
        <input
          type="date"
          value={filters.date}
          onChange={(e) =>
            onChange({
              ...filters,
              date: e.target.value,
              mode: e.target.value ? "date" : "all",
            })
          }
          className="bg-transparent text-xs outline-none [color-scheme:light] dark:[color-scheme:dark]"
          aria-label="Filter by date"
        />
      </label>

      <label className="flex h-8 min-w-[160px] flex-1 items-center gap-1.5 rounded-full border border-border bg-card px-3 shadow-sm transition-colors focus-within:border-primary/60 focus-within:bg-primary/5">
        <MapPin className="size-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Filter by area (e.g. korm, indira)"
          value={filters.location}
          onChange={(e) => onChange({ ...filters, location: e.target.value })}
          className="h-full w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          aria-label="Filter by location"
        />
      </label>

      {active && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="inline-flex h-8 items-center gap-1 rounded-full px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Clear filters"
        >
          <X className="size-3.5" />
          Clear
        </button>
      )}
    </div>
  );
}
