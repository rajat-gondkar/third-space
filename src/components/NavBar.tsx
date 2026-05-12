import Link from "next/link";

import { Logo } from "@/components/Logo";
import { ProfileMenu, type ProfileMenuUser } from "@/components/ProfileMenu";

type Props = {
  user: ProfileMenuUser;
  liveCount?: number;
};

export function NavBar({ user, liveCount }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between gap-3 px-4">
        <Link
          href="/"
          aria-label="Go to homepage"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-85"
        >
          <Logo size="sm" />
          <span className="hidden text-sm font-semibold tracking-tight sm:inline">
            Third Space
          </span>
        </Link>

        <Link
          href="/map"
          className="group flex min-w-0 items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-accent/50"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="truncate">Happening now</span>
          {typeof liveCount === "number" && (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold tabular-nums text-primary">
              {liveCount}
            </span>
          )}
        </Link>

        <ProfileMenu user={user} />
      </div>
    </header>
  );
}
