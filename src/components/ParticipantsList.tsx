"use client";

import { useState } from "react";
import Avatar from "boring-avatars";
import { ChevronDown, Crown, Users } from "lucide-react";

import { ProfileViewer, type ProfileData } from "@/components/ProfileViewer";
import { cn } from "@/lib/utils";

type Person = {
  userId: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  age: number | null;
  gender: string | null;
  phone: string | null;
  isHost: boolean;
};

type Props = {
  people: Person[];
  total: number;
  activityId: string;
  currentUserId: string;
};

const AVATAR_COLORS = [
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#f59e0b",
  "#10b981",
];

function genderBadge(g: string | null): string {
  if (!g) return "";
  const map: Record<string, string> = {
    male: "M",
    female: "F",
    "non-binary": "NB",
    other: "O",
  };
  return map[g] ?? "";
}

export function ParticipantsList({
  people,
  total,
  activityId,
  currentUserId,
}: Props) {
  const [open, setOpen] = useState(people.length > 0);
  const [viewerPerson, setViewerPerson] = useState<Person | null>(null);

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
          {people.map((p) => {
            const badge = genderBadge(p.gender);
            const ageLabel = p.age != null ? `${p.age}` : "";
            const meta = [badge, ageLabel].filter(Boolean).join(" | ");

            return (
              <li key={p.userId}>
                <button
                  type="button"
                  onClick={() => setViewerPerson(p)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent/40"
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
                    {meta && (
                      <span className="text-xs text-muted-foreground">
                        {meta}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
          {people.length < total && (
            <li className="px-2 pt-1 text-center text-[11px] text-muted-foreground">
              {total - people.length} more not loaded
            </li>
          )}
        </ul>
      )}

      {viewerPerson && (
        <ProfileViewer
          person={{
            userId: viewerPerson.userId,
            displayName: viewerPerson.displayName,
            email: viewerPerson.email,
            avatarUrl: viewerPerson.avatarUrl,
            age: viewerPerson.age,
            gender: viewerPerson.gender,
            phone: viewerPerson.phone,
            isHost: viewerPerson.isHost,
          }}
          isSelf={viewerPerson.userId === currentUserId}
          activityId={activityId}
          open={!!viewerPerson}
          onClose={() => setViewerPerson(null)}
        />
      )}
    </div>
  );
}
