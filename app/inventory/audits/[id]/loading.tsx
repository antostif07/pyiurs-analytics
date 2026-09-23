export default function AuditLoading() {
    return (
        <div
            role="status"
            aria-busy="true"
            className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6"
        >
            <span className="sr-only">Chargement de l&apos;audit…</span>

            {/* En-tête : référence + boutique */}
            <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                    <div className="h-6 w-48 animate-pulse rounded-md bg-muted" />
                    <div className="h-4 w-32 animate-pulse rounded-md bg-muted" />
                </div>
                <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
            </div>

            {/* Indicateurs */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }, (_, i) => (
                    <div
                        key={i}
                        className="h-20 animate-pulse rounded-xl border border-border bg-card"
                    />
                ))}
            </div>

            {/* Champ de scan */}
            <div className="h-12 animate-pulse rounded-xl bg-muted" />

            {/* Liste d'articles */}
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="flex items-center gap-3 p-4">
                        <div className="size-10 animate-pulse rounded-lg bg-muted" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                        </div>
                        <div className="h-6 w-12 animate-pulse rounded-md bg-muted" />
                    </div>
                ))}
            </div>
        </div>
    );
}