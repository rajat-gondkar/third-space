"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  /** Name to prefill (e.g. their Google display_name). */
  defaultName: string;
  /** Activity title — shown for context. */
  activityTitle: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (displayName: string) => void;
};

export function JoinModal({
  open,
  defaultName,
  activityTitle,
  loading = false,
  onCancel,
  onConfirm,
}: Props) {
  const [name, setName] = useState(defaultName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset to prefill every time the modal re-opens.
  useEffect(() => {
    if (open) setName(defaultName);
  }, [open, defaultName]);

  // Lock scroll + autofocus when open.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => {
      document.body.style.overflow = original;
      window.clearTimeout(t);
    };
  }, [open]);

  // ESC closes (when not mid-submit).
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel, loading]);

  if (!open) return null;

  const trimmed = name.trim();
  const canSubmit = trimmed.length >= 2 && !loading;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onConfirm(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        disabled={loading}
        onClick={onCancel}
        className="absolute inset-0 cursor-default animate-fade-up bg-background/60 backdrop-blur-sm disabled:cursor-not-allowed"
      />
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-modal-title"
        className="relative w-full max-w-sm animate-pop-in space-y-4 rounded-3xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow ring-1 ring-white/30">
            <UserRound className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="join-modal-title"
              className="text-base font-semibold tracking-tight"
            >
              Before you join…
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              How should we show your name on{" "}
              <span className="font-medium text-foreground">
                “{activityTitle}”
              </span>
              ? Others joining can see it.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="join-display-name">Display name</Label>
          <Input
            id="join-display-name"
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sarvesh M"
            maxLength={60}
            autoComplete="name"
          />
          <p className="text-xs text-muted-foreground">
            Used only for this activity. Min. 2 characters.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!canSubmit}
            className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow ring-1 ring-white/20"
          >
            {loading ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="size-4 animate-spin" />
                Joining…
              </span>
            ) : (
              "Join activity"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
