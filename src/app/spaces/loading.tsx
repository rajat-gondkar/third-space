export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="h-14 border-b border-border bg-background" />
      <div className="flex flex-1 flex-col md:grid md:grid-cols-[1fr_440px]">
        <div className="h-[55vh] animate-pulse bg-muted md:h-full" />
        <aside className="space-y-3 border-t border-border p-4 pb-24 md:border-l md:border-t-0 md:pb-4">
          <div className="h-7 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-xl border border-border bg-card"
            />
          ))}
        </aside>
      </div>
    </div>
  );
}
