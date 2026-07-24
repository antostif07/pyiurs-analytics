import { Skeleton } from "@/components/ui/skeleton";

export default function ARPULoading() {
    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* En-tête ARPU Skeleton */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border pb-6">
                <div className="space-y-2">
                    <Skeleton className="h-7 w-56 rounded-lg" />
                    <Skeleton className="h-3.5 w-80 rounded-md" />
                </div>
                <Skeleton className="h-9 w-32 rounded-xl" />
            </div>

            {/* Cartes Métriques ARPU Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-5 rounded-2xl border border-border bg-card space-y-3 shadow-xs">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-7 w-36" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                ))}
            </div>

            {/* Tableau ou Graphique ARPU Skeleton */}
            <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-xs">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-64 w-full rounded-xl" />
            </div>
        </div>
    );
}