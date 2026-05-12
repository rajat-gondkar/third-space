"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  message?: string;
  subMessage?: string;
};

export function BlockingLoader({
  open,
  message = "Sit tight…",
  subMessage,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/75 backdrop-blur-sm"
    >
      <div className="animate-pop-in flex flex-col items-center gap-4 rounded-3xl border border-border bg-card px-10 py-7 shadow-2xl">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-3 shadow-lg ring-1 ring-white/30">
          <Loader2 className="size-7 animate-spin text-white" strokeWidth={2.5} />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium">{message}</p>
          {subMessage && (
            <p className="text-xs text-muted-foreground">{subMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
