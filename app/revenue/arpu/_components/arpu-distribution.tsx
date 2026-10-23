// app/revenue/arpu/_components/arpu-distribution.tsx
"use client";

interface Props {
    data: Record<string, { revenue: number; percent: number }>;
}

/**
 * Couleur sémantique par segment (palette du design system).
 */
const SEGMENT_COLORS: Record<string, string> = {
    Femme: "var(--chart-4)",   // violet
    Beauty: "var(--chart-1)",  // rose
    Enfant: "var(--chart-2)",  // vert
};

const fmtMoney = (n: number) =>
    n.toLocaleString("fr-FR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }) + " $";

export default function ArpuDistribution({ data }: Props) {
    const entries = Object.entries(data)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.revenue - a.revenue);

    if (entries.length === 0) {
        return (
            <p className="text-[11px] text-muted-foreground/60 italic text-center py-4">
                Aucune donnée de segment disponible sur cette période.
            </p>
        );
    }

    const totalRevenue = entries.reduce((s, e) => s + e.revenue, 0);

    return (
        <div className="space-y-2.5">
            {entries.map((entry) => {
                const color =
                    SEGMENT_COLORS[entry.name] ?? "var(--chart-5)";
                const width = Math.min(100, Math.max(0, entry.percent));

                return (
                    <div key={entry.name} className="space-y-1">
                        {/* Ligne titre + valeurs */}
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: color }}
                                />
                                <span className="font-semibold text-foreground truncate">
                                    {entry.name}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums">
                                <span className="text-foreground font-semibold">
                                    {fmtMoney(entry.revenue)}
                                </span>
                                <span className="text-muted-foreground/60 text-[10px]">
                                    {entry.percent.toFixed(1)}%
                                </span>
                            </div>
                        </div>

                        {/* Barre */}
                        <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-[width] duration-300"
                                style={{
                                    width: `${width}%`,
                                    backgroundColor: color,
                                }}
                            />
                        </div>
                    </div>
                );
            })}

            {/* Total */}
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-border/60 text-[11px]">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">
                    Total segments
                </span>
                <span className="font-mono tabular-nums font-semibold text-foreground">
                    {fmtMoney(totalRevenue)}
                </span>
            </div>
        </div>
    );
}