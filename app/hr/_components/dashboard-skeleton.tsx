// app/hr/_components/dashboard-skeleton.tsx
export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Grille de stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-slate-100 rounded-2xl border border-slate-200" />
        ))}
      </div>

      {/* Zone Graphique */}
      <div className="h-[400px] w-full bg-slate-50 rounded-2xl border border-slate-200 flex items-end p-8 space-x-4">
         {[...Array(12)].map((_, i) => (
            <div key={i} className="flex-1 bg-slate-200 rounded-t-lg" style={{ height: `${Math.random() * 100}%` }} />
         ))}
      </div>
    </div>
  );
}