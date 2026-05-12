import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

const SIZES = { sm: 28, md: 44, lg: 88 };

export function Logo({ className, size = "md" }: LogoProps) {
  const dim = SIZES[size];
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md ring-1 ring-white/30",
        size === "lg" && "rounded-[28px]",
        className,
      )}
      style={{ width: dim, height: dim }}
      aria-hidden="true"
    >
      <span
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 22% 22%, rgba(255,255,255,0.65), transparent 60%)",
        }}
      />
      <svg
        width={dim * 0.58}
        height={dim * 0.58}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
      >
        <path
          d="M12 2c-4.4 0-8 3.4-8 7.7 0 5.5 6.7 11.4 7.4 12 .3.3.9.3 1.2 0 .7-.6 7.4-6.5 7.4-12C20 5.4 16.4 2 12 2z"
          fill="currentColor"
          fillOpacity={0.15}
        />
        <circle cx="12" cy="10" r="3" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}
