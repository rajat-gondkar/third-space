"use client";

import { CalendarDays, MapPin, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type Filters = {
  mode: "all" | "today" | "date";
  date: string; // YYYY-MM-DD
  location: string;
  category: "all" | "sports" | "study" | "hobby" | "food and coffee" | "other"; // Add this
  radius: number; // Add this
};

export const EMPTY_FILTERS: Filters = {
  mode: "all",
  date: "",
  location: "",
  category: "all",
  radius: 1000, // Set a default (e.g., 1km)
};

export function isFilterActive(f: Filters) {
  return f.mode !== "all" || f.location.trim().length > 0 || f.category !== "all" || f.radius !== 1000;
}

const CATEGORIES: Array<{ value: Filters["category"]; label: string }> = [
  { value: "all", label: "All" },
  { value: "sports", label: "Sports" },
  { value: "study", label: "Study" },
  { value: "hobby", label: "Hobby" },
  { value: "food and coffee", label: "Food and Coffee" },
  { value: "other", label: "Other" },
];

const RADIUS_OPTIONS = [
  { value: 500, label: "500 m" },
  { value: 1000, label: "1 km" },
  { value: 2000, label: "2 km" },
  { value: 5000, label: "5 km" },
];

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

      {/* Category Filter Pills */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {CATEGORIES.map((cat) => {
          const active = filters.category === cat.value;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => onChange({ ...filters, category: cat.value })}
              className={cn(
                "h-8 rounded-full border px-3 text-xs font-medium transition-colors",
                active
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/40 hover:bg-accent/60"
              )}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

        {RADIUS_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange({ ...filters, radius: opt.value })}
          className={cn(
            "h-7 px-3 rounded-full text-[11px] font-semibold transition-colors",
            filters.radius === opt.value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}

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
          "relative flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs shadow-sm transition-colors",
          filters.mode === "date"
            ? "border-primary/60 bg-primary/10"
            : "border-border bg-card hover:border-primary/40",
        )}
      >
        <CalendarDays className="size-3.5 text-muted-foreground" />
        {/* Native <input type="date"> ignores the `placeholder` attribute on
            every browser, so we layer a visible label underneath the input and
            hide it the moment a date is picked. */}
        {!filters.date && (
          <span
            aria-hidden
            className="pointer-events-none select-none text-muted-foreground"
          >
            Pick a date
          </span>
        )}
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
          className={cn(
            "bg-transparent text-xs outline-none [color-scheme:light] dark:[color-scheme:dark]",
            // When empty, the native picker still occupies space — we collapse
            // its rendered text to 0 width so only our placeholder is visible.
            !filters.date && "absolute inset-0 w-full opacity-0",
          )}
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
