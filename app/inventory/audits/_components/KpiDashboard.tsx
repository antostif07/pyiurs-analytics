"use client";

import React from "react";
import {
    CheckCircle2,
    Package,
    AlertTriangle,
    TrendingDown,
    DollarSign,
    Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";

const formatUSD = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(amount);
};

interface Props {
    scanned: number;
    total: number;
    remaining: number;
    soldElsewhere: number;
    totalDiffValue: number;
    scannedValuation?: number; // Valeur des produits trouvés/scannés ($)
    totalValuation?: number;   // Valeur totale théorique du stock ($)
    progressPercent: number;
}

export function KpiDashboard({
    scanned,
    total,
    remaining,
    soldElsewhere,
    totalDiffValue,
    scannedValuation = 0,
    totalValuation = 0,
    progressPercent,
}: Props) {
    return (
        <div className="space-y-3">
            {/* GRILLE KPIS 6 CARTES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
                {/* 1. ARTICLES SCANNÉS */}
                <div className="p-3.5 bg-card border border-border rounded-2xl flex items-center gap-3 shadow-xs">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
                        <CheckCircle2 className="w-4 h-4 stroke-[2]" />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider block truncate">
                            Scannés (1/1)
                        </span>
                        <div className="text-base font-bold font-mono text-emerald-600">
                            {scanned} <span className="text-xs font-normal text-muted-foreground">/ {total}</span>
                        </div>
                    </div>
                </div>

                {/* 2. RESTE À SCANNER */}
                <div className="p-3.5 bg-card border border-border rounded-2xl flex items-center gap-3 shadow-xs">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 shrink-0">
                        <Package className="w-4 h-4 stroke-[2]" />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider block truncate">
                            Reste à Scanner
                        </span>
                        <div className="text-base font-bold font-mono text-amber-600">{remaining}</div>
                    </div>
                </div>

                {/* 3. VENDUS AILLEURS (-1) */}
                <div className="p-3.5 bg-card border border-border rounded-2xl flex items-center gap-3 shadow-xs">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 shrink-0">
                        <AlertTriangle className="w-4 h-4 stroke-[2]" />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider block truncate">
                            Vendus Ailleurs (-1)
                        </span>
                        <div className="text-base font-bold font-mono text-purple-600">{soldElsewhere}</div>
                    </div>
                </div>

                {/* 4. VALEUR DES PRODUITS TROUVÉS / SCANNÉS ($) */}
                <div className="p-3.5 bg-card border border-border rounded-2xl flex items-center gap-3 shadow-xs">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 shrink-0">
                        <DollarSign className="w-4 h-4 stroke-[2]" />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider block truncate">
                            Valeur Trouvée ($)
                        </span>
                        <div className="text-base font-bold font-mono text-blue-600">
                            {formatUSD(scannedValuation)}
                        </div>
                    </div>
                </div>

                {/* 5. VALEUR TOTALE DU PÉRIMÈTRE ($) */}
                <div className="p-3.5 bg-card border border-border rounded-2xl flex items-center gap-3 shadow-xs">
                    <div className="p-2 rounded-xl bg-muted text-foreground shrink-0">
                        <Boxes className="w-4 h-4 stroke-[2]" />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider block truncate">
                            Valeur Totale ($)
                        </span>
                        <div className="text-base font-bold font-mono text-foreground">
                            {formatUSD(totalValuation)}
                        </div>
                    </div>
                </div>

                {/* 6. DÉMARQUE / ÉCART VALEUR ($) */}
                <div className="p-3.5 bg-card border border-border rounded-2xl flex items-center gap-3 shadow-xs">
                    <div
                        className={cn(
                            "p-2 rounded-xl shrink-0",
                            totalDiffValue < 0 ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600"
                        )}
                    >
                        <TrendingDown className="w-4 h-4 stroke-[2]" />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider block truncate">
                            Démarque ($)
                        </span>
                        <div
                            className={cn(
                                "text-base font-bold font-mono",
                                totalDiffValue < 0 ? "text-rose-600" : "text-emerald-600"
                            )}
                        >
                            {formatUSD(totalDiffValue)}
                        </div>
                    </div>
                </div>
            </div>

            {/* BARRE DE PROGRESSION */}
            <div className="w-full bg-muted/30 h-2 rounded-full overflow-hidden border border-border/40">
                <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                />
            </div>
        </div>
    );
}