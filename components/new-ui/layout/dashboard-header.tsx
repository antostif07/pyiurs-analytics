"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Download,
    RefreshCw,
    Clock,
    Calendar as CalendarIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
    format,
    subDays,
    startOfToday,
    startOfMonth,
    endOfMonth,
    parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type ExportFormat = "CSV" | "PDF" | "XLSX";

export interface DashboardHeaderProps {
    /** Titre principal de la vue */
    title: string;
    /** Sous-titre explicatif */
    subtitle?: string;
    /** Libellé du badge de statut (par défaut: "Live Odoo") */
    badgeLabel?: string;
    /** Heure de dernière mise à jour */
    lastUpdatedAt?: Date | null;
    /** Indicateur de chargement global de la page */
    isLoading?: boolean;
    /** Fonction de rafraîchissement des données Odoo */
    onRefresh?: () => Promise<void> | void;
    /** Callback d'export */
    onExport?: (format: ExportFormat) => void;
    /** Formats d'export autorisés */
    exportFormats?: ExportFormat[];
    /** Afficher ou masquer la barre de filtres temporels */
    showDateFilters?: boolean;
    /** Boutons ou éléments d'interface complémentaires */
    extraActions?: React.ReactNode;
    className?: string;
}

// Labels adaptés en version courte (mobile) et longue (desktop)
const DATE_PRESETS = [
    { label: "Aujourd'hui", shortLabel: "Auj", value: "today", days: 0 },
    { label: "7 Jours", shortLabel: "7J", value: "7d", days: 7 },
    { label: "Ce Mois", shortLabel: "Mois", value: "30d", days: -1 },
    { label: "90 Jours", shortLabel: "90J", value: "90d", days: 90 },
] as const;

export default function DashboardHeader({
    title,
    subtitle,
    badgeLabel = "Live Odoo",
    lastUpdatedAt,
    isLoading = false,
    onRefresh,
    onExport,
    exportFormats = ["CSV", "PDF", "XLSX"],
    showDateFilters = true,
    extraActions,
    className,
}: DashboardHeaderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [isManualRefreshing, setIsManualRefreshing] = useState(false);

    // 1. Extraction sécurisée des dates depuis l'URL
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const currentPreset = searchParams.get("preset") || "30d";

    const dateRange: DateRange = {
        from: fromParam ? parseISO(fromParam) : startOfMonth(new Date()),
        to: toParam ? parseISO(toParam) : endOfMonth(new Date()),
    };

    // 2. Mise à jour de l'URL sans écraser les autres paramètres
    const updateUrl = (from: Date, to: Date, preset: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("from", format(from, "yyyy-MM-dd"));
        params.set("to", format(to, "yyyy-MM-dd"));
        params.set("preset", preset);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    // 3. Clic sur presets rapides
    const handlePresetClick = (p: (typeof DATE_PRESETS)[number]) => {
        let from: Date, to: Date;

        if (p.value === "30d") {
            from = startOfMonth(new Date());
            to = endOfMonth(new Date());
        } else {
            from = subDays(startOfToday(), p.days);
            to = new Date();
        }
        updateUrl(from, to, p.value);
    };

    // 4. Clic sur calendrier personnalisé
    const handleCustomDateSelect = (range: DateRange | undefined) => {
        if (range?.from && range?.to) {
            updateUrl(range.from, range.to, "custom");
        }
    };

    // 5. Rafraîchissement
    const handleRefreshClick = async () => {
        if (!onRefresh) return;
        setIsManualRefreshing(true);
        try {
            await onRefresh();
        } finally {
            setIsManualRefreshing(false);
        }
    };

    const isBusy = isLoading || isManualRefreshing;

    return (
        <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "flex flex-col gap-3 pb-4 border-b border-border/60 transition-all",
                className
            )}
        >
            {/* ── LIGNE PRINCIPALE : Titre et Bloc de Contrôle ── */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 min-w-0">

                {/* BLOC GAUCHE : Titre fluide (ne déborde plus) & Badge */}
                <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-foreground leading-snug break-words">
                            {title}
                        </h1>

                        <Badge
                            variant="outline"
                            className="shrink-0 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/30 flex items-center gap-1.5 px-2 py-0.5 text-[10.5px] font-semibold h-5"
                        >
                            <span
                                className={cn(
                                    "w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0",
                                    isBusy && "animate-ping"
                                )}
                            />
                            {badgeLabel}
                        </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        {subtitle && <span className="line-clamp-1 sm:line-clamp-none">{subtitle}</span>}
                        {subtitle && lastUpdatedAt && <span className="opacity-30">·</span>}
                        {lastUpdatedAt && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/80 shrink-0">
                                <Clock className="w-3 h-3 text-muted-foreground/60" />
                                Mis à jour à {format(lastUpdatedAt, "HH:mm:ss", { locale: fr })}
                            </span>
                        )}
                    </div>
                </div>

                {/* BLOC DROIT : Outils & Filtres bien ordonnés */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-center">

                    {/* SÉLECTEUR DE DATES COMPACT & RESPONSIVE */}
                    {showDateFilters && (
                        <div className="inline-flex items-center bg-muted/40 dark:bg-muted/20 border border-border/70 p-0.5 rounded-lg shadow-2xs">
                            {DATE_PRESETS.map((p) => (
                                <button
                                    key={p.value}
                                    type="button"
                                    onClick={() => handlePresetClick(p)}
                                    className={cn(
                                        "px-2 py-1 rounded-md text-[11px] font-semibold transition-all duration-150 select-none",
                                        currentPreset === p.value
                                            ? "bg-background text-primary shadow-2xs ring-1 ring-border/80 font-bold"
                                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                    )}
                                >
                                    <span className="sm:hidden">{p.shortLabel}</span>
                                    <span className="hidden sm:inline">{p.label}</span>
                                </button>
                            ))}

                            {/* Bouton Popover Calendrier */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className={cn(
                                            "px-2 py-1 rounded-md text-[11px] font-semibold transition-all duration-150 flex items-center gap-1 select-none",
                                            currentPreset === "custom"
                                                ? "bg-background text-primary shadow-2xs ring-1 ring-border/80 font-bold"
                                                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                        )}
                                    >
                                        <CalendarIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                                        <span className="hidden sm:inline">
                                            {currentPreset === "custom" ? "Personnalisé" : "Dates"}
                                        </span>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-auto p-0 rounded-xl shadow-2xl border-border"
                                    align="end"
                                >
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={dateRange.from}
                                        selected={dateRange}
                                        onSelect={handleCustomDateSelect}
                                        numberOfMonths={2}
                                        locale={fr}
                                        className="p-3"
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}

                    {/* GROUPE D'ACTIONS : Actualiser, Extras & Exporter */}
                    <div className="inline-flex items-center gap-1.5 shrink-0">
                        {onRefresh && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefreshClick}
                                disabled={isBusy}
                                className="h-7 px-2.5 text-[11px] gap-1.5 border-border/80 hover:bg-accent/60"
                                aria-label="Actualiser les données Odoo"
                            >
                                <RefreshCw className={cn("w-3 h-3", isBusy && "animate-spin")} />
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
                                <DropdownMenuContent align="end" className="w-40 p-1 rounded-xl shadow-xl">
                                    <DropdownMenuLabel className="text-[9px] font-bold uppercase text-muted-foreground px-2 py-1 tracking-wider">
                                        Format du rapport
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {exportFormats.includes("CSV") && (
                                        <DropdownMenuItem
                                            onClick={() => onExport("CSV")}
                                            className="rounded-md cursor-pointer text-xs py-1.5"
                                        >
                                            Données Brutes (CSV)
                                        </DropdownMenuItem>
                                    )}
                                    {exportFormats.includes("XLSX") && (
                                        <DropdownMenuItem
                                            onClick={() => onExport("XLSX")}
                                            className="rounded-md cursor-pointer text-xs py-1.5"
                                        >
                                            Classeur Excel (.xlsx)
                                        </DropdownMenuItem>
                                    )}
                                    {exportFormats.includes("PDF") && (
                                        <DropdownMenuItem
                                            onClick={() => onExport("PDF")}
                                            className="rounded-md cursor-pointer text-xs py-1.5"
                                        >
                                            Rapport Visuel (PDF)
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}