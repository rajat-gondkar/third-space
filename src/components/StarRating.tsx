"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { rateVenue } from "@/lib/venues/client";

function Star({
  filled,
  half,
  onClick,
  onMouseEnter,
}: {
  filled: boolean;
  half?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className="relative size-8 transition-transform hover:scale-110 focus:outline-none"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-8"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
        />
      </svg>
      {/* Fill layer */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: half ? "50%" : filled ? "100%" : "0%" }}
      >
        <svg
          viewBox="0 0 24 24"
          className="size-8 text-amber-400"
          fill="currentColor"
          stroke="none"
        >
          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      </div>
    </button>
  );
}

export function StarRating({
  value,
  onChange,
  size = "md",
  interactive = true,
}: {
  value: number;
  onChange?: (rating: number) => void;
  size?: "sm" | "md";
  interactive?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const display = interactive && hover > 0 ? hover : value;
  const s = size === "sm" ? "size-5" : "size-8";

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = display >= n;
        const half = !filled && display >= n - 0.5;

        if (!interactive) {
          return (
            <div key={n} className={`relative ${s}`}>
              <svg
                viewBox="0 0 24 24"
                className={`${s} text-muted-foreground/30`}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: half ? "50%" : filled ? "100%" : "0%" }}
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`${s} text-amber-400`}
                  fill="currentColor"
                >
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
            </div>
          );
        }

        return (
          <Star
            key={n}
            filled={filled}
            half={half}
            onClick={() => onChange?.(n)}
            onMouseEnter={() => setHover(n)}
          />
        );
      })}
    </div>
  );
}

type RatingModalProps = {
  venueName: string;
  currentRating: number;
  open: boolean;
  onClose: () => void;
  onRate: (rating: number) => Promise<void>;
};

export function RatingModal({
  venueName,
  currentRating,
  open,
  onClose,
  onRate,
}: RatingModalProps) {
  const [selected, setSelected] = useState(currentRating || 0);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit() {
    if (!selected) {
      toast.error("Please select a rating.");
      return;
    }
    setSubmitting(true);
    try {
      await onRate(selected);
      toast.success("Rating saved!");
      onClose();
    } catch {
      toast.error("Could not save rating.");
    } finally {
      setSubmitting(false);
    }
  }

  const labels = ["", "Terrible", "Poor", "Average", "Good", "Excellent"];

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
        className="relative w-full max-w-sm animate-pop-in space-y-5 rounded-3xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold tracking-tight">
              Rate this place
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{venueName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-2 py-2">
          <StarRating
            value={selected}
            onChange={setSelected}
            size="md"
            interactive
          />
          <span className="text-sm font-medium text-amber-600">
            {labels[selected] || "Tap a star"}
          </span>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !selected}
          className="flex h-10 w-full items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-sm font-semibold text-white shadow-md ring-1 ring-white/20 transition-transform hover:scale-[1.02] disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : null}
          Submit rating
        </button>
      </div>
    </div>
  );
}
