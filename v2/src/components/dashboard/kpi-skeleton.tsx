export function KPIStripSkeleton() {
  return (
    <div 
      className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse" 
      role="status" 
      aria-live="polite"
    >
      <span className="sr-only">Chargement des indicateurs Odoo en cours...</span>
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="bg-card/40 border border-border/80 rounded-xl p-4 h-[106px] space-y-3">
          <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded" aria-hidden="true" />
          <div className="h-7 w-20 bg-slate-300 dark:bg-slate-700 rounded" aria-hidden="true" />
          <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded" aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}