// app/ceo-report/_components/ceo-kpi-card.tsx
"use client";

import React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CeoKpiCardProps {
    label: string;
    value: string | number;
    subtitle?: React.ReactNode;
    icon: React.ReactNode;
    iconColor?: string;
    iconBg?: string;
    valueColor?: string;
    /**
     * Delta vs période de référence (N-1).
     * Positif → flèche ↑, négatif → flèche ↓.
     * `isPositiveUp` = false pour inverser le sens sémantique (ex: démarque).
     */
    delta?: {
        /** Valeur signée (ex: +2.4 ou -1.2) */
        value: number;
        /** Format d'affichage : "percent" (% par défaut), "number", "currency" */
        format?: "percent" | "number" | "currency";
        /** true par défaut : une hausse est bonne (émeraude). false : une hausse est mauvaise (rose). */
        isPositiveUp?: boolean;
        /** Période de référence affichée (ex: "vs mois dernier") */
        label?: string;
    };
    isLoading?: boolean;
    className?: string;
}

/** Formate le delta selon le format demandé */
function formatDelta(value: number, format: "percent" | "number" | "currency"): string {
    const abs = Math.abs(value);
    if (format === "percent") {
        return `${abs.toFixed(1)}%`;
    }
    if (format === "currency") {
        return `${abs.toLocaleString("fr-FR")} $`;
    }
    return abs.toLocaleString("fr-FR");
}

export default function CeoKpiCard({
    label,
    value,
    subtitle,
    icon,
    iconColor = "text-sky-600",
    iconBg = "bg-sky-50 dark:bg-sky-950/50",
    valueColor = "text-foreground",
    delta,
    isLoading = false,
    className,
}: CeoKpiCardProps) {
    // Calcul du ton du delta selon le sens sémantique
    const deltaTone = (() => {
        if (!delta || delta.value === 0) return "neutral" as const;
        const isUp = delta.value > 0;
        const isPositiveUp = delta.isPositiveUp ?? true;
        const isGood = isPositiveUp ? isUp : !isUp;
        return isGood ? ("positive" as const) : ("negative" as const);
    })();

    const deltaToneClass =
        deltaTone === "positive"
            ? "text-emerald-600 dark:text-emerald-400"
            : deltaTone === "negative"
                ? "text-rose-600 dark:text-rose-400"
                : "text-muted-foreground/60";

    const DeltaIcon =
        !delta || delta.value === 0
            ? Minus
            : delta.value > 0
                ? ArrowUpRight
                : ArrowDownRight;

    return (
        <div
            className={cn(
                "rounded-lg border border-border/60 bg-card p-3 shadow-2xs transition-colors hover:bg-accent/30",
                className,
            )}
        >
            <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 truncate">
                    {label}
                </span>
                <div className={cn("p-1 rounded-md shrink-0", iconBg, iconColor)}>
                    {icon}
                </div>
            </div>

            <div className="mt-1.5 min-h-[26px] flex items-center">
                {isLoading ? (
                    <div className="h-6 w-24 bg-muted rounded animate-pulse" />
                ) : (
                    <div
                        className={cn(
                            "text-lg font-bold font-mono tracking-tight tabular-nums",
                            valueColor,
                        )}
                    >
                        {value}
                    </div>
                )}
            </div>

            {/* Ligne subtitle + delta */}
            <div className="mt-0.5 min-h-[16px] flex items-center gap-2">
                {isLoading ? (
                    <div className="h-3 w-36 bg-muted/60 rounded animate-pulse" />
                ) : (
                    <>
                        {delta && !isLoading && (
                            <span
                                className={cn(
                                    "inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums shrink-0",
                                    deltaToneClass,
                                )}
                            >
                                <DeltaIcon className="w-3 h-3" />
                                {formatDelta(delta.value, delta.format ?? "percent")}
                            </span>
                        )}
                        {subtitle && (
                            <span className="text-[10px] text-muted-foreground/70 truncate">
                                {subtitle}
                            </span>
                        )}
                        {delta?.label && (
                            <span className="text-[9px] text-muted-foreground/50 truncate">
                                {delta.label}
                            </span>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}