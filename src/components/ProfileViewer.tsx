"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Phone, Mail, User, Calendar, Loader2, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export type ProfileData = {
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
  person: ProfileData;
  isSelf: boolean;
  activityId: string;
  open: boolean;
  onClose: () => void;
};

function maskPhone(phone: string | null): string {
  if (!phone) return "—";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 4) return phone;
  const first = cleaned.slice(0, 2);
  const last = cleaned.slice(-2);
  const masked = "x".repeat(cleaned.length - 4);
  return `${first}${masked}${last}`;
}

function maskEmail(email: string | null): string {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const first = local.charAt(0);
  return `${first}***@${domain}`;
}

function genderLabel(g: string | null): string {
  if (!g) return "—";
  const map: Record<string, string> = {
    male: "M",
    female: "F",
    "non-binary": "NB",
    other: "O",
  };
  return map[g] ?? g.charAt(0).toUpperCase() + g.slice(1);
}

export function ProfileViewer({
  person,
  isSelf,
  activityId,
  open,
  onClose,
}: Props) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  if (!open) return null;

  async function handleLeave() {
    setLeaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("participants")
      .delete()
      .eq("activity_id", activityId)
      .eq("user_id", person.userId);

    if (error) {
      toast.error(error.message);
      setLeaving(false);
      return;
    }

    toast.success("You left the activity");
    setLeaving(false);
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-100 to-fuchsia-100 text-2xl ring-1 ring-white/40 dark:from-indigo-950/60 dark:to-fuchsia-950/60">
              {person.avatarUrl ? (
                <img
                  src={person.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{person.displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                {person.displayName}
              </h2>
              {person.isHost && (
                <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Host
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Details grid */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-3 py-2.5">
            <User className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Age & Gender
              </p>
              <p className="text-sm font-medium">
                {person.age ?? "—"} · {genderLabel(person.gender)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-3 py-2.5">
            <Phone className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Phone
              </p>
              <p className="text-sm font-medium">
                {isSelf ? (person.phone ?? "—") : maskPhone(person.phone)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-3 py-2.5">
            <Mail className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Email
              </p>
              <p className="text-sm font-medium">
                {isSelf ? (person.email ?? "—") : maskEmail(person.email)}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        {isSelf && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleLeave}
            disabled={leaving}
            className="w-full"
          >
            {leaving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 size-4" />
            )}
            Leave activity
          </Button>
        )}
      </div>
    </div>
  );
}
