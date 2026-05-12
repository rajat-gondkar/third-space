"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LocationPicker } from "@/components/LocationPicker";
import { ACTIVITY_CATEGORIES, CATEGORY_LABEL } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

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

export function PostForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);

  const defaultStart = useMemo(() => defaultStartLocalISO(), []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      category: "sport",
      location_name: "",
      start_time: defaultStart,
      max_participants: 6,
    },
  });

  async function onSubmit(values: FormValues) {
    if (!coords) {
      toast.error("Drop a pin on the map to set the location");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("activities")
      .insert({
        host_id: userId,
        title: values.title,
        description: values.description || null,
        category: values.category,
        location_name: values.location_name || null,
        lat: coords.lat,
        lng: coords.lng,
        start_time: new Date(values.start_time).toISOString(),
        max_participants: values.max_participants,
      })
      .select("id")
      .single();

    if (error || !data) {
      toast.error(error?.message ?? "Could not create activity");
      setSubmitting(false);
      return;
    }

    await supabase
      .from("participants")
      .insert({ activity_id: data.id, user_id: userId });

    toast.success("Activity posted");
    router.push(`/activity/${data.id}`);
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
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("category")}
          >
            {ACTIVITY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="location_name">Location name (optional)</Label>
          <Input
            id="location_name"
            placeholder="Cubbon Park, Gate 4"
            {...register("location_name")}
          />
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

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Posting…" : "Post activity"}
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Tap the map to drop a pin</Label>
        <div className="h-[360px] w-full overflow-hidden rounded-lg border border-border">
          <LocationPicker
            value={coords}
            defaultCenter={DEFAULT_CENTER}
            onChange={setCoords}
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
    </form>
  );
}
