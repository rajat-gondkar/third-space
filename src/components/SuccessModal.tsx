"use client";

import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";

import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onAction: () => void;
  actionLabel?: string;
  title?: string;
  description?: string;
};

const BRAND_COLORS = ["#6366f1", "#a855f7", "#ec4899", "#f59e0b", "#10b981"];

function fireConfettiCannons() {
  // Two side cannons arcing toward the center — classic celebration shape.
  confetti({
    particleCount: 90,
    angle: 60,
    spread: 60,
    startVelocity: 55,
    origin: { x: 0, y: 0.7 },
    colors: BRAND_COLORS,
    zIndex: 9999,
  });
  confetti({
    particleCount: 90,
    angle: 120,
    spread: 60,
    startVelocity: 55,
    origin: { x: 1, y: 0.7 },
    colors: BRAND_COLORS,
    zIndex: 9999,
  });
  // A small follow-up burst after a beat
  window.setTimeout(() => {
    confetti({
      particleCount: 40,
      spread: 100,
      origin: { y: 0.5 },
      colors: BRAND_COLORS,
      zIndex: 9999,
    });
  }, 200);
}

export function SuccessModal({
  open,
  onAction,
  actionLabel = "View activity →",
  title = "You're in the third space! 🎉",
  description = "Your activity is live. People nearby can see it now.",
}: Props) {
  useEffect(() => {
    if (!open) return;
    fireConfettiCannons();
    // Lock body scroll while open
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter") onAction();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onAction]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden
        className="absolute inset-0 animate-fade-up bg-background/60 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-modal-title"
        className="relative w-full max-w-sm animate-pop-in rounded-3xl border border-border bg-card p-8 text-center shadow-2xl"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg ring-1 ring-white/30">
          <CheckCircle2 className="size-9" strokeWidth={2.5} />
        </div>
        <h2
          id="success-modal-title"
          className="text-xl font-semibold tracking-tight"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <Button
          onClick={onAction}
          className="mt-6 w-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md ring-1 ring-white/20 transition-transform hover:scale-[1.02] hover:opacity-95"
        >
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
