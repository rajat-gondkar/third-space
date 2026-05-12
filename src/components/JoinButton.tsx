"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { JoinResult } from "@/lib/types";

type Props = {
  activityId: string;
  isFull: boolean;
  hasJoined: boolean;
  isPast: boolean;
};

export function JoinButton({ activityId, isFull, hasJoined, isPast }: Props) {
  const router = useRouter();
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

  async function join() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("join_activity", {
      p_activity: activityId,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const result = data as JoinResult;
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
    setLoading(false);
  }

  return (
    <Button onClick={join} disabled={loading} className="w-full">
      {loading ? "Joining…" : "Join activity"}
    </Button>
  );
}
