"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, MessageSquare, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { CreatePostModal } from "@/components/threads/CreatePostModal";
import { PostCard } from "@/components/threads/PostCard";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import type { Thread, ThreadPost } from "@/lib/types";

export function ThreadDetailShell({ thread }: { thread: Thread }) {
  const router = useRouter();
  const [posts, setPosts] = useState<ThreadPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  async function loadPosts() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/threads/${thread.id}/posts`);
      const payload = (await res.json()) as {
        posts?: ThreadPost[];
        error?: string;
      };
      if (!res.ok) throw new Error(payload.error ?? "Could not load posts.");
      setPosts(payload.posts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load posts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, [thread.id]);

  function handleNewPost(post: ThreadPost) {
    setPosts((prev) => [post, ...prev]);
  }

  function handleDeletePost(postId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  return (
    <div className="flex-1">
      <RealtimeRefresh channelName={`thread-${thread.id}`} tables={["thread_posts"]} />
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-screen-md items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => router.push("/threads")}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-accent"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold">{thread.name}</h1>
            {thread.location_name && (
              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                <MapPin className="size-3" />
                {thread.location_name}
              </p>
            )}
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="size-3.5" />
            {posts.length}
          </span>
        </div>
      </div>

      {/* Action bar — only when thread has posts */}
      {posts.length > 0 && (
        <div className="mx-auto max-w-screen-md px-4 py-4">
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="w-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md ring-1 ring-white/20 transition-transform hover:scale-[1.01] hover:opacity-95"
          >
            Post in this thread
          </Button>
        </div>
      )}

      {/* Posts */}
      <div className="mx-auto max-w-screen-md space-y-4 px-4 pb-24">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 rounded bg-muted" />
                    <div className="h-2 w-1/4 rounded bg-muted" />
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="h-3 w-full rounded bg-muted" />
                  <div className="h-3 w-5/6 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {!loading && posts.length === 0 && (
          <div className="animate-fade-up rounded-2xl border border-dashed border-border bg-gradient-to-br from-primary/5 via-transparent to-fuchsia-500/5 p-6 text-center">
            <MessageSquare className="mx-auto size-8 text-primary/60" />
            <p className="mt-2 font-medium">No posts yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Be the first to post something about {thread.name}.
            </p>
            <Button
              size="sm"
              className="mt-3 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white"
              onClick={() => setCreateModalOpen(true)}
            >
              Start the conversation
            </Button>
          </div>
        )}

        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onDelete={handleDeletePost}
          />
        ))}
      </div>

      <CreatePostModal
        open={createModalOpen}
        threadId={thread.id}
        onClose={() => setCreateModalOpen(false)}
        onPostCreated={handleNewPost}
      />
    </div>
  );
}
