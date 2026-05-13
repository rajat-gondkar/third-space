"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { JoinModal } from "@/components/JoinModal";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { JoinResult } from "@/lib/types";

type Props = {
  activityId: string;
  activityTitle: string;
  isFull: boolean;
  hasJoined: boolean;
  isPast: boolean;
  /** Prefill value for the display-name input (usually profile display_name). */
  defaultDisplayName: string;
};

export function JoinButton({
  activityId,
  activityTitle,
  isFull,
  hasJoined,
  isPast,
  defaultDisplayName,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (isPast) {
    return (
      <Button disabled className="w-full" variant="secondary">
        Activity has started
      </Button>
    );
  }

  if (hasJoined) {
    return (
      <Button disabled className="w-full" variant="secondary">
        You’re in ✓
      </Button>
    );
  }

  if (isFull) {
    return (
      <Button disabled className="w-full" variant="secondary">
        Activity full
      </Button>
    );
  }

  async function performJoin(displayName: string) {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("join_activity", {
      p_activity: activityId,
      p_display_name: displayName,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const result = data as JoinResult;
    setLoading(false);
    setOpen(false);
    if (result === "ok") {
      toast.success("You’re in");
      router.refresh();
    } else if (result === "full") {
      toast.error("Activity is full");
      router.refresh();
    } else if (result === "not_found") {
      toast.error("Activity no longer exists");
      router.push("/map");
    } else if (result === "already_joined") {
      toast.message("You’ve already joined");
      router.refresh();
    }
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        disabled={loading}
        className="w-full"
      >
        {loading ? "Joining…" : "Join activity"}
      </Button>
      <JoinModal
        open={open}
        defaultName={defaultDisplayName}
        activityTitle={activityTitle}
        loading={loading}
        onCancel={() => {
          if (!loading) setOpen(false);
        }}
        onConfirm={performJoin}
      />
    </>
  );
}
