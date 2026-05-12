"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";

type Props = {
  activityId: string;
  activityTitle: string;
};

export function DeleteActivityButton({ activityId, activityTitle }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("activities")
      .delete()
      .eq("id", activityId);

    if (error) {
      toast.error(error.message);
      setDeleting(false);
      return;
    }

    toast.success("Activity deleted");
    setOpen(false);
    setDeleting(false);
    router.push("/map");
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 />
        Delete activity
      </Button>

      <ConfirmDialog
        open={open}
        onCancel={() => {
          if (!deleting) setOpen(false);
        }}
        onConfirm={handleDelete}
        loading={deleting}
        destructive
        title="Delete this activity?"
        description={`“${activityTitle}” will be removed for everyone, along with all participants. This can't be undone.`}
        confirmLabel="Delete"
      />
    </>
  );
}
