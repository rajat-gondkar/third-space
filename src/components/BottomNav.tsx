"use client";

import Link from "next/link";
import { Map, Route } from "lucide-react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const tabs = [
  { href: "/map", label: "Activities", icon: Route },
  { href: "/spaces", label: "Spaces", icon: Map },
];

const HIDDEN_PATHS = ["/", "/login", "/onboarding"];

export function BottomNav() {
  const pathname = usePathname();

  if (HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-sm grid-cols-2 gap-2">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
