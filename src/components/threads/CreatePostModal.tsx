"use client";

import { useState } from "react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { ImageIcon, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { ThreadPost } from "@/lib/types";

export function CreatePostModal({
  open,
  threadId,
  onClose,
  onPostCreated,
}: {
  open: boolean;
  threadId: string;
  onClose: () => void;
  onPostCreated: (post: ThreadPost) => void;
}) {
  const [content, setContent] = useState("");
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  if (!open) return null;

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newImages].slice(0, 4));
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  }

  async function handleSubmit() {
    const trimmed = content.trim();
    if (!trimmed && images.length === 0) {
      toast.error("Write something or add an image.");
      return;
    }
    if (trimmed.length > 2000) {
      toast.error("Post must be under 2000 characters.");
      return;
    }

    setSubmitting(true);

    try {
      let imageUrls: string[] = [];

      if (images.length > 0) {
        setUploadingImages(true);
        const uploads = await Promise.all(
          images.map(async (img) => {
            const formData = new FormData();
            formData.append("file", img.file);
            const res = await fetch("/api/upload-post-image", {
              method: "POST",
              body: formData,
            });
            const payload = (await res.json()) as { url?: string; error?: string };
            if (!res.ok) throw new Error(payload.error ?? "Upload failed.");
            return payload.url!;
          }),
        );
        imageUrls = uploads;
        setUploadingImages(false);
      }

      const res = await fetch(`/api/threads/${threadId}/posts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: trimmed, image_urls: imageUrls }),
      });
      const payload = (await res.json()) as {
        post?: ThreadPost;
        error?: string;
      };

      if (!res.ok) throw new Error(payload.error ?? "Could not create post.");

      toast.success("Posted!");
      onPostCreated(payload.post!);
      setContent("");
      images.forEach((img) => URL.revokeObjectURL(img.preview));
      setImages([]);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create post.");
    } finally {
      setSubmitting(false);
      setUploadingImages(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-background/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-lg animate-pop-in rounded-t-3xl border border-border bg-card p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">New post</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        <Textarea
          placeholder="What's happening at this space?"
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="resize-none rounded-xl border-border bg-background text-sm"
          maxLength={2000}
        />
        <p className="mt-1 text-right text-[10px] text-muted-foreground">
          {content.length}/2000
        </p>

        {/* Image previews */}
        {images.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {images.map((img, i) => (
              <div key={i} className="relative aspect-video overflow-hidden rounded-xl">
                <Image
                  src={img.preview}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <ImageIcon className="size-4" />
            <span>Add image</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={handleImageSelect}
              disabled={submitting || images.length >= 4}
            />
          </label>

          <Button
            onClick={handleSubmit}
            disabled={submitting || (!content.trim() && images.length === 0)}
            className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md ring-1 ring-white/20 transition-transform hover:scale-[1.01] hover:opacity-95 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {uploadingImages ? "Uploading…" : "Posting…"}
              </>
            ) : (
              "Post"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
