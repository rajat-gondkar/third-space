"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BlockingLoader } from "@/components/BlockingLoader";
import { LocationPicker } from "@/components/LocationPicker";
import { SuccessModal } from "@/components/SuccessModal";
import {
  ACTIVITY_CATEGORIES,
  CATEGORY_LABEL,
  type Activity,
} from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import {
  forwardGeocode,
  reverseGeocode,
  type GeocodeSuggestion,
} from "@/lib/geocoding";

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

const schema = z.object({
  title: z.string().min(3, "At least 3 characters").max(120),
  description: z.string().max(500).optional().or(z.literal("")),
  category: z.enum(ACTIVITY_CATEGORIES),
  location_name: z.string().max(120).optional().or(z.literal("")),
  start_time: z
    .string()
    .min(1, "Pick a start time")
    .refine(
      (v) => new Date(v).getTime() > Date.now() - 60_000,
      "Start time must be in the future",
    ),
  max_participants: z
    .number({ message: "Pick a number" })
    .int()
    .min(2, "At least 2")
    .max(50, "At most 50"),
});

type FormValues = z.infer<typeof schema>;

function defaultStartLocalISO() {
  const d = new Date(Date.now() + 60 * 60 * 1000); // +1h
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLocalDatetimeInput(iso: string) {
  // <input type="datetime-local"> expects "YYYY-MM-DDTHH:mm" in *local* time.
  // `new Date(iso)` parses the UTC ISO; we then format using the local TZ.
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type PostFormProps = {
  userId: string;
  /**
   * When provided, the form goes into edit mode: it pre-fills with the
   * activity, submits an UPDATE (not INSERT), and on success navigates back
   * to the detail page without confetti.
   */
  editing?: Activity;
};

export function PostForm({ userId, editing }: PostFormProps) {
  const router = useRouter();
  const isEdit = Boolean(editing);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    editing ? { lat: editing.lat, lng: editing.lng } : null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [postedId, setPostedId] = useState<string | null>(null);
  // When set, a full-screen loader is shown over the form / modal.
  // Used for both the DB-write phase and the post-modal navigation phase.
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  // Synchronous re-entry guard — protects against double-click races where the
  // button hasn't re-rendered as `disabled` yet between the two clicks.
  const submitLockRef = useRef(false);

  // Geocoding state
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  // In edit mode the field is prefilled — mark that as "system" so the
  // debounced forward-geocode effect treats it as already-resolved and
  // doesn't pop a suggestions dropdown on first paint.
  const sourceRef = useRef<"user" | "system">(editing ? "system" : "user");
  const fwdAbortRef = useRef<AbortController | null>(null);
  const revAbortRef = useRef<AbortController | null>(null);
  const locationFieldRef = useRef<HTMLDivElement>(null);

  const defaultStart = useMemo(() => defaultStartLocalISO(), []);

  // Edit-mode: when editing a past activity, we relax the "must be in the
  // future" constraint so the user can still save other field changes.
  const editingStartIsPast = useMemo(
    () => (editing ? new Date(editing.start_time).getTime() < Date.now() : false),
    [editing],
  );
  const effectiveSchema = useMemo(() => {
    if (editingStartIsPast) {
      return schema.extend({ start_time: z.string().min(1, "Pick a start time") });
    }
    return schema;
  }, [editingStartIsPast]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(effectiveSchema),
    defaultValues: editing
      ? {
          title: editing.title,
          description: editing.description ?? "",
          category: editing.category,
          location_name: editing.location_name ?? "",
          start_time: toLocalDatetimeInput(editing.start_time),
          max_participants: editing.max_participants,
        }
      : {
          title: "",
          description: "",
          category: "sport",
          location_name: "",
          start_time: defaultStart,
          max_participants: 6,
        },
  });

  const locationValue = watch("location_name") ?? "";

  // Map click (or suggestion-driven move) → reverse-geocode → set location label.
  function handleCoordsFromMap(c: { lat: number; lng: number }) {
    setCoords(c);
    setShowSuggestions(false);
    fwdAbortRef.current?.abort();
    revAbortRef.current?.abort();
    const controller = new AbortController();
    revAbortRef.current = controller;
    setGeocoding(true);
    reverseGeocode(c.lat, c.lng, { signal: controller.signal })
      .then((label) => {
        if (label && !controller.signal.aborted) {
          sourceRef.current = "system";
          setValue("location_name", label, { shouldDirty: true });
        }
      })
      .catch(() => {
        /* ignore */
      })
      .finally(() => {
        if (revAbortRef.current === controller) setGeocoding(false);
      });
  }

  // Forward-geocode (debounced) when the user types in the location field.
  useEffect(() => {
    if (sourceRef.current === "system") {
      sourceRef.current = "user";
      return;
    }
    const q = locationValue.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const handle = window.setTimeout(() => {
      fwdAbortRef.current?.abort();
      const controller = new AbortController();
      fwdAbortRef.current = controller;
      setGeocoding(true);
      forwardGeocode(q, { signal: controller.signal, countryCodes: "in" })
        .then((results) => {
          if (controller.signal.aborted) return;
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
        })
        .catch(() => {
          /* ignore */
        })
        .finally(() => {
          if (fwdAbortRef.current === controller) setGeocoding(false);
        });
    }, 400);
    return () => window.clearTimeout(handle);
  }, [locationValue]);

  function selectSuggestion(s: GeocodeSuggestion) {
    sourceRef.current = "system";
    setValue("location_name", s.label, { shouldDirty: true });
    setCoords({ lat: s.lat, lng: s.lng });
    setShowSuggestions(false);
    setSuggestions([]);
  }

  // Close suggestions on outside click / Escape.
  useEffect(() => {
    if (!showSuggestions) return;
    function onClickOutside(e: MouseEvent) {
      if (!locationFieldRef.current?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setShowSuggestions(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [showSuggestions]);

  async function onSubmit(values: FormValues) {
    if (submitLockRef.current) return;
    if (!coords) {
      toast.error("Drop a pin on the map or pick a location from suggestions");
      return;
    }
    submitLockRef.current = true;
    setSubmitting(true);
    setLoadingMessage(
      isEdit
        ? "Saving your changes…"
        : "Sit tight — we're creating your space!",
    );
    const supabase = createClient();

    const payload = {
      title: values.title,
      description: values.description || null,
      category: values.category,
      location_name: values.location_name || null,
      lat: coords.lat,
      lng: coords.lng,
      start_time: new Date(values.start_time).toISOString(),
      max_participants: values.max_participants,
    };

    if (isEdit && editing) {
      // RLS policy `activities update host` already restricts this to the host.
      const { error } = await supabase
        .from("activities")
        .update(payload)
        .eq("id", editing.id);

      if (error) {
        toast.error(error.message);
        submitLockRef.current = false;
        setSubmitting(false);
        setLoadingMessage(null);
        return;
      }

      toast.success("Activity updated");
      setLoadingMessage("Opening your activity…");
      router.push(`/activity/${editing.id}`);
      router.refresh();
      return;
    }

    const { data, error } = await supabase
      .from("activities")
      .insert({ host_id: userId, ...payload })
      .select("id")
      .single();

    if (error || !data) {
      toast.error(error?.message ?? "Could not create activity");
      submitLockRef.current = false;
      setSubmitting(false);
      setLoadingMessage(null);
      return;
    }

    // Host is auto-added as a participant by the `add_host_as_participant`
    // DB trigger (see supabase/migrations/0001_init.sql). No client insert
    // needed — keeps the call path single-shot and avoids a duplicate-PK race.

    setLoadingMessage(null);
    setPostedId(data.id);
    setSubmitting(false);
    // Intentionally leave submitLockRef = true: the SuccessModal routes the
    // user away, so further submissions are not expected. The component
    // unmounts and the ref is GC'd on navigation.
  }

  function viewPostedActivity() {
    if (!postedId) return;
    const id = postedId;
    setPostedId(null);
    setLoadingMessage("Opening your activity…");
    router.push(`/activity/${id}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-6 lg:grid-cols-[1fr_1fr]"
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Evening football at Cubbon"
            {...register("title")}
          />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("category")}
          >
            {ACTIVITY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>

        <div ref={locationFieldRef} className="space-y-1.5">
          <Label htmlFor="location_name">Location</Label>
          <div className="relative">
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="location_name"
                placeholder="Type an area (e.g. Koramangala) or tap the map"
                className="pl-9 pr-9"
                autoComplete="off"
                {...register("location_name")}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
              />
              {geocoding && (
                <Loader2 className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="animate-fade-up absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
                <ul className="max-h-64 overflow-y-auto py-1">
                  {suggestions.map((s, i) => (
                    <li key={`${s.lat},${s.lng}-${i}`}>
                      <button
                        type="button"
                        onClick={() => selectSuggestion(s)}
                        className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                      >
                        <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{s.label}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {s.fullName}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Type to search areas, or tap the map to drop a pin — they stay in
            sync.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="start_time">Start time</Label>
            <Input
              id="start_time"
              type="datetime-local"
              {...register("start_time")}
            />
            {errors.start_time && (
              <p className="text-xs text-destructive">
                {errors.start_time.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="max_participants">Max people</Label>
            <Input
              id="max_participants"
              type="number"
              min={2}
              max={50}
              {...register("max_participants", { valueAsNumber: true })}
            />
            {errors.max_participants && (
              <p className="text-xs text-destructive">
                {errors.max_participants.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            placeholder="Bring a ball. Beginners welcome."
            rows={4}
            {...register("description")}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          {isEdit && (
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={submitting}
              className="sm:w-32"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={submitting || (isEdit && !isDirty)}
            className="flex-1 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md ring-1 ring-white/20 transition-transform hover:scale-[1.01] hover:opacity-95"
          >
            {submitting
              ? isEdit
                ? "Saving…"
                : "Posting…"
              : isEdit
                ? "Save changes"
                : "Post activity"}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Pin on the map</Label>
        <div className="h-[360px] w-full overflow-hidden rounded-lg border border-border shadow-sm">
          <LocationPicker
            value={coords}
            defaultCenter={DEFAULT_CENTER}
            onChange={handleCoordsFromMap}
          />
        </div>
        {coords ? (
          <p className="text-xs text-muted-foreground">
            Pin: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">No location yet</p>
        )}
      </div>

      {/* Confetti modal is for the create flow only — edits go straight back. */}
      {!isEdit && (
        <SuccessModal open={!!postedId} onAction={viewPostedActivity} />
      )}
      <BlockingLoader
        open={!!loadingMessage}
        message={loadingMessage ?? ""}
        subMessage={
          submitting
            ? isEdit
              ? "Saving your changes…"
              : "Pinning it to the map…"
            : "Almost there."
        }
      />
    </form>
  );
}
