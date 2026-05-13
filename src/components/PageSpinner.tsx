import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  message?: string;
  className?: string;
  /**
   * When true, takes the full viewport height. Use for top-level route
   * `loading.tsx` files. Default `false` renders inline.
   */
  fullscreen?: boolean;
};

/**
 * Shared spinner card used by every `loading.tsx` and any in-page deferred
 * boundary. Matches the BlockingLoader aesthetic so route transitions feel
 * cohesive with the post-creation overlay.
 */
export function PageSpinner({
  message = "Loading…",
  className,
  fullscreen = false,
}: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center justify-center p-8",
        fullscreen && "min-h-[60vh] w-full",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-2.5 shadow-md ring-1 ring-white/30">
          <Loader2
            className="size-5 animate-spin text-white"
            strokeWidth={2.5}
          />
        </div>
        <p className="text-xs font-medium text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
