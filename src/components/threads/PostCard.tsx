"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";
import type { ThreadPost } from "@/lib/types";

export function PostCard({
  post,
  onDelete,
}: {
  post: ThreadPost;
  onDelete?: (postId: string) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) setCurrentUserId(data.user.id);
    }
    getUser();
  }, []);

  const profile = post.profile;
  const displayName = profile?.display_name ?? "Anonymous";
  const avatarUrl = profile?.avatar_url;
  const isAuthor = currentUserId === post.user_id;

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/threads/${post.thread_id}/posts/${post.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        throw new Error(payload.error ?? "Could not delete post.");
      }
      toast.success("Post deleted.");
      onDelete?.(post.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete post.");
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <div className="group animate-fade-up rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/20">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-100 to-fuchsia-100 text-sm font-bold text-primary ring-1 ring-inset ring-white/40 dark:from-indigo-950/60 dark:to-fuchsia-950/60 dark:ring-white/5">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                width={40}
                height={40}
                className="object-cover"
              />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{displayName}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              {isAuthor && (
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  aria-label="Delete post"
                  title="Delete post"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>

            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
              {post.content}
            </p>

            {post.image_urls.length > 0 && (
              <div
                className={`mt-3 grid gap-2 ${
                  post.image_urls.length === 1
                    ? "grid-cols-1"
                    : "grid-cols-2"
                }`}
              >
                {post.image_urls.map((url, i) => (
                  <div
                    key={i}
                    className={`relative overflow-hidden rounded-xl ${
                      post.image_urls.length === 1 ? "aspect-[4/3]" : "aspect-video"
                    }`}
                  >
                    <Image
                      src={url}
                      alt={`Post image ${i + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete post?"
        description="This can't be undone."
        confirmLabel="Delete"
        destructive
        loading={deleting}
      />
    </>
  );
}
