import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import {
    formatDelta,
    formatKpiValue,
    getStatusColor,
    isPositiveDelta,
} from "@/app/ceo-report/formatters";
import type { KpiData } from "@/app/ceo-report/_lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface KpiCardProps {
    kpi: KpiData;
    variant?: "vital" | "compact";
    className?: string;
}

export function KpiCard({ kpi, variant = "compact", className }: KpiCardProps) {
    const hasDelta = kpi.delta !== undefined;
    const positive = isPositiveDelta(kpi);
    const statusColor = getStatusColor(kpi.status);
    const Icon = kpi.icon;

    const TrendIcon =
        !hasDelta || kpi.delta === 0
            ? Minus
            : kpi.delta! > 0
                ? ArrowUp
                : ArrowDown;

    const trendColor = !hasDelta
        ? "text-muted-foreground"
        : positive
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400";

    const isVital = variant === "vital";

    return (
        <Card
            className={cn(
                "group relative flex flex-col gap-0 border-border/60 bg-card transition-colors hover:border-border",
                isVital ? "p-1" : "p-0",
                className
            )}
        >
            <CardHeader
                className={cn(
                    "flex flex-row items-start justify-between gap-3 space-y-0",
                    isVital ? "p-5 pb-3" : "p-4 pb-2"
                )}
            >
                {/* Icône + Label */}
                <div className="flex min-w-0 flex-1 items-start gap-2.5">
                    {Icon && (
                        <div
                            className={cn(
                                "flex shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
                                isVital ? "size-9" : "size-7"
                            )}
                        >
                            <Icon className={isVital ? "size-4" : "size-3.5"} />
                        </div>
                    )}

                    <div className="min-w-0 flex-1">
                        {kpi.hint ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span
                                        className={cn(
                                            "block cursor-help truncate font-medium text-foreground",
                                            isVital ? "text-sm" : "text-xs"
                                        )}
                                    >
                                        {kpi.label}
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs text-xs">
                                    {kpi.hint}
                                </TooltipContent>
                            </Tooltip>
                        ) : (
                            <span
                                className={cn(
                                    "block truncate font-medium text-foreground",
                                    isVital ? "text-sm" : "text-xs"
                                )}
                            >
                                {kpi.label}
                            </span>
                        )}

                        {/* Hint visible en sous-titre (tronqué) */}
                        {kpi.hint && isVital && (
                            <span className="mt-0.5 block truncate text-[10px] font-light text-muted-foreground/70">
                                {kpi.hint}
                            </span>
                        )}
                    </div>
                </div>

                {/* Status dot */}
                {kpi.status && (
                    <span
                        className={cn(
                            "mt-1 inline-block size-2 shrink-0 rounded-full",
                            statusColor.replace("text-", "bg-")
                        )}
                        aria-label={`Statut ${kpi.status}`}
                    />
                )}
            </CardHeader>

            <CardContent className={cn(isVital ? "px-5 pb-5 pt-0" : "px-4 pb-4 pt-0")}>
                {/* Valeur principale */}
                <div
                    className={cn(
                        "font-semibold tracking-tight text-foreground tabular-nums",
                        isVital ? "text-3xl" : "text-xl"
                    )}
                >
                    {formatKpiValue(kpi)}
                </div>

                {/* Delta + label de comparaison */}
                {hasDelta && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs">
                        <TrendIcon className={cn("size-3.5 shrink-0", trendColor)} />
                        <span className={cn("font-medium tabular-nums", trendColor)}>
                            {formatDelta(kpi.delta)}
                        </span>
                        <span className="font-light text-muted-foreground/60">
                            {kpi.deltaLabel ?? "vs période préc."}
                        </span>
                    </div>
                )}

                {/* Info secondaire */}
                {kpi.secondary && (
                    <div className="mt-2.5 flex items-center justify-between border-t border-border/50 pt-2.5">
                        <span className="text-[10px] font-light uppercase tracking-wider text-muted-foreground/60">
                            {kpi.secondary.label}
                        </span>
                        <span className="text-xs font-medium tabular-nums text-foreground/80">
                            {kpi.secondary.value}
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}