// app/ceo-report/_components/report-page-header.tsx
"use client";

import type { ReactNode } from "react";
import { Clock, Download, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ExportFormat = "CSV" | "XLSX" | "PDF";
type BadgeTone = "emerald" | "amber" | "rose" | "sky" | "violet" | "neutral";

const BADGE_TONES: Record<BadgeTone, string> = {
    emerald:
        "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/30",
    amber:
        "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/30",
    rose:
        "text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/30",
    sky:
        "text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800/60 bg-sky-50/50 dark:bg-sky-950/30",
    violet:
        "text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/60 bg-violet-50/50 dark:bg-violet-950/30",
    neutral: "text-muted-foreground border-border bg-muted/40",
};

const BADGE_DOTS: Record<BadgeTone, string> = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    sky: "bg-sky-500",
    violet: "bg-violet-500",
    neutral: "bg-muted-foreground",
};

interface ReportPageHeaderProps {
    title: string;
    subtitle?: string;
    /** Badge optionnel (ex: "Live Odoo", "Audit"). Le point pulse si isLoading=true. */
    badge?: { label: string; tone?: BadgeTone };
    /** Timestamp de dernière mise à jour */
    lastUpdatedAt?: Date | null;
    /** Bloque le refresh + affiche le spin */
    isLoading?: boolean;
    /** Callback de rafraîchissement (TanStack refetch, router.refresh, etc.) */
    onRefresh?: () => Promise<void> | void;
    /** Callback d'export — si absent, le bouton n'apparaît pas */
    onExport?: (format: ExportFormat) => void;
    /** Formats proposés dans le dropdown (par défaut : tous) */
    exportFormats?: ExportFormat[];
    /** Slot d'actions additionnelles (à côté du refresh/export) */
    extraActions?: ReactNode;
    /**
     * Slot principal à droite du header.
     * Typiquement : `<GlobalFilters filters={...} compact />`
     */
    children?: ReactNode;
    className?: string;
}

export default function ReportPageHeader({
    title,
    subtitle,
    badge,
    lastUpdatedAt,
    isLoading = false,
    onRefresh,
    onExport,
    exportFormats = ["XLSX", "CSV", "PDF"],
    extraActions,
    children,
    className,
}: ReportPageHeaderProps) {
    const tone: BadgeTone = badge?.tone ?? "emerald";

    return (
        <div
            className={cn("sticky top-0 z-20", className)}
        >
            <div className="border-b border-border bg-background">
                <div className="px-4 sm:px-6 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    {/* ─── LEFT : Title + Subtitle + Badge + UpdatedAt ─── */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-[15px] font-semibold text-foreground tracking-tight leading-tight">
                                {title}
                            </h1>
                            {badge && (
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "shrink-0 h-5 px-1.5 text-[10px] font-semibold flex items-center gap-1.5",
                                        BADGE_TONES[tone],
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "w-1.5 h-1.5 rounded-full shrink-0",
                                            BADGE_DOTS[tone],
                                            isLoading && "animate-ping",
                                        )}
                                    />
                                    {badge.label}
                                </Badge>
                            )}
                        </div>

                        {(subtitle || lastUpdatedAt) && (
                            <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground/70">
                                {subtitle && <span className="truncate">{subtitle}</span>}
                                {subtitle && lastUpdatedAt && (
                                    <span className="opacity-40">·</span>
                                )}
                                {lastUpdatedAt && (
                                    <span className="inline-flex items-center gap-1 shrink-0">
                                        <Clock className="w-3 h-3 opacity-60" />
                                        {lastUpdatedAt.toLocaleTimeString("fr-FR", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            second: "2-digit",
                                        })}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ─── RIGHT : Filtres + Refresh + Extras + Export ─── */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-center">
                        {children}

                        {onRefresh && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onRefresh}
                                disabled={isLoading}
                                className="h-7 px-2 text-[11px] gap-1.5 border-border/80 hover:bg-accent/60"
                                aria-label="Actualiser"
                            >
                                <RefreshCw
                                    className={cn("w-3 h-3", isLoading && "animate-spin")}
                                />
                                <span className="hidden sm:inline">Actualiser</span>
                            </Button>
                        )}

                        {extraActions}

                        {onExport && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        size="sm"
                                        className="h-7 px-2.5 text-[11px] gap-1.5 shadow-2xs"
                                    >
                                        <Download className="w-3 h-3" />
                                        <span className="hidden sm:inline">Exporter</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-44 p-1 rounded-lg shadow-xl"
                                >
                                    <DropdownMenuLabel className="text-[9px] font-semibold uppercase text-muted-foreground px-2 py-1 tracking-wider">
                                        Format
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {exportFormats.includes("XLSX") && (
                                        <DropdownMenuItem
                                            onClick={() => onExport("XLSX")}
                                            className="text-xs py-1.5 cursor-pointer"
                                        >
                                            Excel (.xlsx)
                                        </DropdownMenuItem>
                                    )}
                                    {exportFormats.includes("CSV") && (
                                        <DropdownMenuItem
                                            onClick={() => onExport("CSV")}
                                            className="text-xs py-1.5 cursor-pointer"
                                        >
                                            CSV (données brutes)
                                        </DropdownMenuItem>
                                    )}
                                    {exportFormats.includes("PDF") && (
                                        <DropdownMenuItem
                                            onClick={() => onExport("PDF")}
                                            className="text-xs py-1.5 cursor-pointer"
                                        >
                                            PDF (rapport)
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
            </div>

            <div className="h-2 bg-gradient-to-b from-background to-transparent pointer-events-none" />
        </div>
    );
}