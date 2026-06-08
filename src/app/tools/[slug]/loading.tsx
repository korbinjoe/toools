export default function ToolDetailLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 lg:px-8 py-8 sm:py-10 animate-pulse">
      <div className="h-4 w-56 rounded bg-muted mb-6" />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between mb-8">
        <div className="flex items-start gap-4 flex-1">
          <div className="h-14 w-14 rounded-xl bg-muted shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-7 w-48 rounded bg-muted" />
            <div className="h-4 w-full max-w-md rounded bg-muted" />
            <div className="flex gap-2">
              <div className="h-5 w-20 rounded-full bg-muted" />
              <div className="h-5 w-16 rounded-full bg-muted" />
            </div>
          </div>
        </div>
        <div className="h-9 w-32 rounded-lg bg-muted shrink-0" />
      </div>
      <div className="rounded-2xl border border-border/80 bg-muted/30 p-5 mb-8 space-y-3">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-5/6 rounded bg-muted" />
        <div className="h-4 w-2/3 rounded bg-muted" />
      </div>
      <div className="h-4 w-full max-w-2xl rounded bg-muted mb-8" />
      <div className="h-72 rounded-2xl bg-muted mb-14" />
    </div>
  );
}
