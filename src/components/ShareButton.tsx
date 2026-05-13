"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Share2 } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  // Path relative to site origin, e.g. "/activity/abc"
  path: string;
  // Activity title — used as the Reddit post title and embedded in share text
  title: string;
  // Optional richer share text (used for WhatsApp + X). Falls back to title.
  text?: string;
  // Activity coordinates — used to build a Google Maps directions link
  // appended to the WhatsApp share message so the recipient can navigate.
  coords?: { lat: number; lng: number };
  // Optional human-readable place name (e.g. "Cubbon Park") used as a label
  // before the directions link in WhatsApp.
  locationName?: string | null;
};

type Platform = "whatsapp" | "reddit" | "x";

const MENU_WIDTH = 176;
const MENU_HEIGHT = 132; // approx — 3 items at 32px + padding
const MENU_GAP = 6;
const VIEWPORT_INSET = 8;

const PLATFORMS: {
  key: Platform;
  label: string;
  color: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    color: "text-[#25D366]",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path
          fill="currentColor"
          d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413"
        />
      </svg>
    ),
  },
  {
    key: "reddit",
    label: "Reddit",
    color: "text-[#FF4500]",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path
          fill="currentColor"
          d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"
        />
      </svg>
    ),
  },
  {
    key: "x",
    label: "Twitter",
    color: "text-foreground",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path
          fill="currentColor"
          d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
        />
      </svg>
    ),
  },
];

function directionsUrl(coords: { lat: number; lng: number }) {
  // Universal Google Maps directions deep link. Opens the Google Maps app on
  // mobile (iOS/Android) and the web client on desktop, with the destination
  // pre-filled and the origin asked from the user.
  return `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;
}

function shareUrlFor(
  platform: Platform,
  absUrl: string,
  title: string,
  text: string,
  coords?: { lat: number; lng: number },
  locationName?: string | null,
) {
  const encUrl = encodeURIComponent(absUrl);
  const encTitle = encodeURIComponent(title);
  const encText = encodeURIComponent(text);
  const maps = coords ? directionsUrl(coords) : null;
  switch (platform) {
    case "whatsapp": {
      // Activity URL is first so WhatsApp uses its OG card for the preview.
      // The directions link sits below, easy to tap from the chat thread.
      const parts = [text, absUrl];
      if (maps) {
        parts.push(`📍 Directions${locationName ? ` to ${locationName}` : ""}: ${maps}`);
      }
      return `https://wa.me/?text=${encodeURIComponent(parts.join("\n\n"))}`;
    }
    case "reddit":
      return `https://www.reddit.com/submit?url=${encUrl}&title=${encTitle}`;
    case "x":
      return `https://twitter.com/intent/tweet?text=${encText}&url=${encUrl}`;
  }
}

function computeMenuPosition(rect: DOMRect): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Right-align to trigger by default
  let left = rect.right - MENU_WIDTH;
  left = Math.max(
    VIEWPORT_INSET,
    Math.min(left, vw - MENU_WIDTH - VIEWPORT_INSET),
  );

  // Below trigger by default; flip up if it would overflow viewport bottom
  let top = rect.bottom + MENU_GAP;
  if (top + MENU_HEIGHT > vh - VIEWPORT_INSET) {
    top = Math.max(VIEWPORT_INSET, rect.top - MENU_HEIGHT - MENU_GAP);
  }

  return { top, left };
}

export function ShareButton({ path, title, text, coords, locationName }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Capture trigger position whenever the menu opens
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos(computeMenuPosition(rect));
  }, [open]);

  // Close on outside click (check both trigger and portal-rendered menu),
  // and on ESC / scroll / resize.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onScrollOrResize() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpen((v) => !v);
  }

  function handleShare(e: React.MouseEvent, platform: Platform) {
    e.preventDefault();
    e.stopPropagation();
    const absUrl =
      typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
    const msg = text ?? title;
    const url = shareUrlFor(platform, absUrl, title, msg, coords, locationName);
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  const menu = open && pos && (
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: MENU_WIDTH,
        zIndex: 100,
      }}
      className="animate-pop-in rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-2xl"
    >
      {PLATFORMS.map((p) => (
        <button
          key={p.key}
          type="button"
          role="menuitem"
          onClick={(e) => handleShare(e, p.key)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <span className={p.color}>{p.icon}</span>
          <span>{p.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-label="Share activity"
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm backdrop-blur transition-all",
          "hover:scale-110 hover:border-primary/40 hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open && "border-primary/40 text-foreground",
        )}
      >
        <Share2 className="size-4" />
      </button>
      {menu && typeof document !== "undefined"
        ? createPortal(menu, document.body)
        : null}
    </>
  );
}
