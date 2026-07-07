export default function Loading() {
  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800 sm:max-w-md" />
        <div className="h-10 w-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="h-[400px] w-full animate-pulse bg-slate-50 dark:bg-slate-900/50" />
      </div>
    </div>
  );
}
