// app/inventory/stock-femme/_components/stock-legend.tsx

const LEGEND = [
    { color: "bg-black", label: "Rupture" },
    { color: "bg-red-500", label: "Critique (≤ 5)" },
    { color: "bg-yellow-500", label: "Faible (6–11)" },
    { color: "bg-green-500", label: "Bon (≥ 12)" },
];

export default function StockLegend() {
    return (
        <div className="rounded-lg border border-border/60 bg-card shadow-2xs p-3">
            <div className="flex flex-wrap gap-3 text-[11px]">
                {LEGEND.map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5">
                        <span className={`w-3 h-3 rounded ${item.color}`} />
                        <span className="text-muted-foreground">
                            {item.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}