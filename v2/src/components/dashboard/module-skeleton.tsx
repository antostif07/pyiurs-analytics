export function ModuleGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-pulse">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="bg-card/30 border border-border/60 rounded-2xl p-6 h-[220px] space-y-6">
          <div className="flex justify-between items-start">
            <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-32 bg-slate-300 dark:bg-slate-700 rounded" />
            <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-3 w-4/5 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}