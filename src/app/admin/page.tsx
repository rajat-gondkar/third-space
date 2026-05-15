"use client";

import { useEffect, useState } from "react";
import { Check, MapPin, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  approveSubmission,
  fetchPendingSubmissions,
  rejectSubmission,
  type VenueSubmission,
} from "@/lib/venues/client";

const CATEGORY_LABEL: Record<string, string> = {
  cafe: "Cafe",
  park: "Park",
  sports: "Sports Ground",
  hobby: "Hobby Hub",
};

export default function AdminPage() {
  const [submissions, setSubmissions] = useState<VenueSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchPendingSubmissions();
      setSubmissions(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleApprove(id: number) {
    setActionId(id);
    try {
      await approveSubmission(id);
      toast.success("Space approved and added to venues.");
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(id: number) {
    setActionId(id);
    try {
      await rejectSubmission(id);
      toast.success("Submission rejected.");
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rejection failed.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Venue submissions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review and approve new space suggestions.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="text-sm text-primary hover:underline"
        >
          Refresh
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading submissions…
        </div>
      )}

      {!loading && submissions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-gradient-to-br from-primary/5 via-transparent to-emerald-500/5 p-8 text-center">
          <MapPin className="mx-auto size-8 text-primary/60" />
          <p className="mt-2 font-medium">No pending submissions</p>
          <p className="text-sm text-muted-foreground">
            All caught up. New suggestions will appear here.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {submissions.map((s) => (
          <div
            key={s.id}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                    {CATEGORY_LABEL[s.categorySlug] ?? s.categorySlug}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    #{s.id}
                  </span>
                </div>
                <h3 className="text-base font-semibold">{s.name}</h3>
                {s.address && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {s.address}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.lat.toFixed(5)}, {s.lng.toFixed(5)}
                </p>
                {s.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {s.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {s.submittedByName && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Submitted by {s.submittedByName}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleApprove(s.id)}
                  disabled={actionId === s.id}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm transition-colors hover:bg-emerald-600 disabled:opacity-50"
                  title="Approve"
                >
                  {actionId === s.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(s.id)}
                  disabled={actionId === s.id}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-destructive text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50"
                  title="Reject"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
