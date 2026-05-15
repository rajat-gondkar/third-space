"use client";

import { useEffect, useState } from "react";
import { X, Loader2, MapPin, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationPicker } from "@/components/LocationPicker";
import { submitVenue } from "@/lib/venues/client";

const CATEGORIES = [
  { slug: "cafe", label: "Cafe", emoji: "☕" },
  { slug: "park", label: "Park", emoji: "🌳" },
  { slug: "sports", label: "Sports Ground", emoji: "⚽" },
  { slug: "hobby", label: "Hobby Hub", emoji: "🎨" },
];

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

export function AddVenueModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("cafe");
  const [tagsInput, setTagsInput] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [submitting, setSubmitting] = useState(false);

  // Auto-fill current location on open
  useEffect(() => {
    if (!open) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCoords(c);
        setMapCenter(c);
      },
      () => {},
      { timeout: 5000, maximumAge: 60_000 },
    );
  }, [open]);

  async function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Space name is required.");
      return;
    }
    if (!coords) {
      toast.error("Please drop a pin on the map.");
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0)
      .slice(0, 8);

    setSubmitting(true);
    try {
      await submitVenue({
        name: trimmedName,
        category_slug: category,
        tags,
        lat: coords.lat,
        lng: coords.lng,
      });
      toast.success("Space submitted for review!");
      onClose();
      // Reset form
      setName("");
      setCategory("cafe");
      setTagsInput("");
      setCoords(null);
      setMapCenter(DEFAULT_CENTER);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default animate-fade-up bg-background/60 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex w-full max-w-2xl animate-pop-in flex-col gap-5 rounded-3xl border border-border bg-card p-6 shadow-2xl md:max-h-[85vh] md:overflow-hidden"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold tracking-tight">
              Suggest a space
            </h3>
            <p className="text-sm text-muted-foreground">
              Pin it on the map and we&apos;ll review it.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="venue-name">Space name *</Label>
              <Input
                id="venue-name"
                placeholder="e.g. Cubbon Park, Third Wave Coffee"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="venue-category">Category *</Label>
              <select
                id="venue-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="venue-tags">Vibe tags</Label>
              <Input
                id="venue-tags"
                placeholder="quiet, good wifi, outdoor seating"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Separate with commas. Max 8 tags.
              </p>
            </div>

            {coords && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
                <MapPin className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Pin on the map</Label>
            <div className="h-[260px] w-full overflow-hidden rounded-xl border border-border shadow-sm">
              <LocationPicker
                value={coords}
                defaultCenter={mapCenter}
                onChange={setCoords}
                onCenterChange={setMapCenter}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Tap the map to drop a pin. Auto-filled with your current location.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={submitting || !name.trim() || !coords}
            onClick={handleSubmit}
            className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md ring-1 ring-white/20"
          >
            {submitting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Plus className="mr-2 size-4" />
            )}
            Submit for review
          </Button>
        </div>
      </div>
    </div>
  );
}
