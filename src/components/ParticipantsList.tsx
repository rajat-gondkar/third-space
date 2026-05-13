"use client";

import { useState } from "react";
import Avatar from "boring-avatars";
import { ChevronDown, Crown, Users } from "lucide-react";

import { cn } from "@/lib/utils";

type Person = {
  userId: string;
  displayName: string;
  email: string | null;
  isHost: boolean;
};

type Props = {
  people: Person[];
  total: number;
};

// Brand palette — reuses the indigo/purple/pink/amber/emerald set used by the
// confetti modal and OG image so avatars feel native to the app.
const AVATAR_COLORS = [
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#f59e0b",
  "#10b981",
];

export function ParticipantsList({ people, total }: Props) {
  // Default open if there's already someone meaningful to show (besides "just me").
  const [open, setOpen] = useState(people.length > 0);

  if (people.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-background/40 p-3 text-center text-xs text-muted-foreground">
        No one has joined yet — be the first.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-background/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="participants-panel"
        className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="inline-flex items-center gap-2 text-sm font-medium">
          <Users className="size-4 text-muted-foreground" />
          <span>
            People joined{" "}
            <span className="text-muted-foreground">({people.length})</span>
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <ul
          id="participants-panel"
          className="animate-fade-up space-y-1.5 border-t border-border px-2 py-2"
        >
          {people.map((p) => (
            <li
              key={p.userId}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/40"
            >
              <span className="relative shrink-0">
                <Avatar
                  size={36}
                  name={p.userId}
                  variant="beam"
                  colors={AVATAR_COLORS}
                />
                {p.isHost && (
                  <span
                    aria-label="Host"
                    title="Host"
                    className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow ring-2 ring-card"
                  >
                    <Crown className="size-2.5" strokeWidth={2.5} />
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-sm font-medium">
                    {p.displayName}
                  </span>
                  {p.isHost && (
                    <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      Host
                    </span>
                  )}
                </div>
                {p.email && (
                  <a
                    href={`mailto:${p.email}`}
                    className="truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {p.email}
                  </a>
                )}
              </div>
            </li>
          ))}
          {people.length < total && (
            <li className="px-2 pt-1 text-center text-[11px] text-muted-foreground">
              {total - people.length} more not loaded
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
