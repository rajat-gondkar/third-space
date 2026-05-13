"use client";

import type { VenueCategorySlug, VenueSortMode } from "@/lib/venues/types";
import { cn } from "@/lib/utils";

const categories: Array<{
  value: VenueCategorySlug | null;
  label: string;
}> = [
  { value: null, label: "All" },
  { value: "cafe", label: "☕ Cafe" },
  { value: "park", label: "🌳 Park" },
  { value: "sports", label: "⚽ Sports" },
  { value: "hobby", label: "🎨 Hobby" },
];

const radii = [
  { value: 500, label: "500 m" },
  { value: 1000, label: "1 km" },
  { value: 2000, label: "2 km" },
  { value: 5000, label: "5 km" },
];

export function SpacesFiltersBar({
  category,
  radius,
  sort,
  onCategoryChange,
  onRadiusChange,
  onSortChange,
}: {
  category: VenueCategorySlug | null;
  radius: number;
  sort: VenueSortMode;
  onCategoryChange: (category: VenueCategorySlug | null) => void;
  onRadiusChange: (radius: number) => void;
  onSortChange: (sort: VenueSortMode) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {categories.map((item) => {
          const active = item.value === category;

          return (
            <button
              key={item.value ?? "all"}
              type="button"
              onClick={() => onCategoryChange(item.value)}
              className={cn(
                "h-8 shrink-0 rounded-full border px-3 text-xs font-medium shadow-sm transition-colors",
                active
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/40 hover:bg-accent/60",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-4 rounded-full border border-border bg-card p-1 shadow-sm">
        {radii.map((item) => {
          const active = item.value === radius;

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onRadiusChange(item.value)}
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

      <div className="grid grid-cols-2 rounded-full border border-border bg-card p-1 shadow-sm">
        {(["nearest", "popular"] as const).map((mode) => {
          const active = sort === mode;

          return (
            <button
              key={mode}
              type="button"
              onClick={() => onSortChange(mode)}
              className={cn(
                "h-8 rounded-full text-xs font-semibold capitalize transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {mode}
            </button>
          );
        })}
      </div>
    </div>
  );
}
