"use client";

import { Pin } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

type Props = {
  pinned: boolean;
  onToggle: () => { ok: boolean; reason?: "max" };
};

export function PinButton({ pinned, onToggle }: Props) {
  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    const result = onToggle();
    if (!result.ok && result.reason === "max") {
      toast.error("Pin limit reached — you can pin up to 2 activities");
    } else if (result.ok && !pinned) {
      toast.success("Pinned");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={pinned ? "Unpin activity" : "Pin activity"}
      aria-pressed={pinned}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full border bg-card shadow-sm backdrop-blur transition-all",
        "hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        pinned
          ? "animate-pop-in border-amber-300 bg-amber-100/80 text-amber-600 dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-400"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      <Pin
        className={cn(
          "size-4 transition-transform",
          pinned ? "rotate-12 fill-current" : "rotate-45",
        )}
      />
    </button>
  );
}
