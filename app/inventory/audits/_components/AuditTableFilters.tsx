"use client";

import React from "react";
import { Search, X, Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StatusFilter, StockAuditItem, getSoldLocations } from "../_lib/types";

export interface ExtendedAuditFilters {
    searchQuery: string;
    statusFilter: StatusFilter;
    brandFilter: string;
    colorFilter: string;
    theoreticalStockFilter: "all" | "zero" | "one" | "greater_than_one" | "negative";
    soldElsewhereFilter: "all" | "yes" | "no";
    specificSoldLocationFilter: string; // Filtre par emplacement de vente spécifique (-1)
}

interface AuditTableFiltersProps {
    filters: ExtendedAuditFilters;
    onFilterChange: (updater: (prev: ExtendedAuditFilters) => ExtendedAuditFilters) => void;
    onResetFilters: () => void;
    items: StockAuditItem[];
    counts: {
        all: number;
        scanned: number;
        remaining: number;
        sold_elsewhere: number;
    };
}

export function AuditTableFilters({
    filters,
    onFilterChange,
    onResetFilters,
    items,
    counts,
}: AuditTableFiltersProps) {
    // Extraction dynamique des marques uniques
    const availableBrands = React.useMemo(() => {
        const brands = new Set<string>();
        items.forEach((i) => {
            const b = (i as any).brand;
            if (b && b !== "N/A") brands.add(b);
        });
        return Array.from(brands).sort();
    }, [items]);

    // Extraction dynamique des couleurs uniques
    const availableColors = React.useMemo(() => {
        const colors = new Set<string>();
        items.forEach((i) => {
            const c = (i as any).color;
            if (c && c !== "N/A") colors.add(c);
        });
        return Array.from(colors).sort();
    }, [items]);

    // Extraction dynamique des emplacements de vente uniques (-1)
    const availableSoldLocations = React.useMemo(() => {
        const locsMap = new Map<string, { id: number | string; name: string }>();
        items.forEach((i) => {
            const list = getSoldLocations(i);
            list.forEach((l) => {
                if (l.id && l.name) {
                    const key = String(l.id);
                    if (!locsMap.has(key)) {
                        locsMap.set(key, { id: l.id, name: l.name });
                    }
                }
            });
        });
        return Array.from(locsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [items]);

    const hasActiveFilters =
        filters.searchQuery !== "" ||
        filters.statusFilter !== "all" ||
        filters.brandFilter !== "all" ||
        filters.colorFilter !== "all" ||
        filters.theoreticalStockFilter !== "all" ||
        filters.soldElsewhereFilter !== "all" ||
        filters.specificSoldLocationFilter !== "all";

    return (
        <div className="space-y-3 print:hidden">
            {/* 1. ONGLETS DE STATUTS PRINCIPAUX */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border pb-3">
                <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-xl border border-border flex-wrap">
                    {([
                        { key: "all" as const, label: "Tous", count: counts.all, color: "text-foreground" },
                        { key: "scanned" as const, label: "Scannés", count: counts.scanned, color: "text-emerald-600" },
                        { key: "remaining" as const, label: "Reste à Scanner", count: counts.remaining, color: "text-amber-600" },
                        { key: "sold_elsewhere" as const, label: "Vendus Ailleurs (-1)", count: counts.sold_elsewhere, color: "text-rose-600" },
                    ] as const).map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() =>
                                onFilterChange((prev) => ({ ...prev, statusFilter: tab.key }))
                            }
                            className={cn(
                                "px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                                filters.statusFilter === tab.key
                                    ? "bg-card shadow-xs text-foreground"
                                    : "text-muted-foreground hover:text-foreground",
                                filters.statusFilter === tab.key && tab.color
                            )}
                        >
                            {tab.label} ({tab.count})
                        </button>
                    ))}
                </div>

                {/* BARRE DE RECHERCHE GLOBALE */}
                <div className="relative w-full lg:w-80">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground/60" />
                    <input
                        type="text"
                        placeholder="Chercher code, produit, marque, couleur..."
                        value={filters.searchQuery}
                        onChange={(e) =>
                            onFilterChange((prev) => ({ ...prev, searchQuery: e.target.value }))
                        }
                        className="w-full bg-muted/20 border border-input rounded-xl pl-9 pr-8 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                    />
                    {filters.searchQuery && (
                        <button
                            onClick={() => onFilterChange((prev) => ({ ...prev, searchQuery: "" }))}
                            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* 2. FILTRES FACETTES MULTI-CRITÈRES */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase mr-1">
                    <Filter className="w-3.5 h-3.5 text-primary" />
                    <span>Filtres :</span>
                </div>

                {/* Filtre Marque */}
                <select
                    value={filters.brandFilter}
                    onChange={(e) =>
                        onFilterChange((prev) => ({ ...prev, brandFilter: e.target.value }))
                    }
                    className="bg-card border border-input rounded-xl px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                    <option value="all">Toutes les Marques ({availableBrands.length})</option>
                    {availableBrands.map((b) => (
                        <option key={b} value={b}>
                            {b}
                        </option>
                    ))}
                </select>

                {/* Filtre Couleur */}
                <select
                    value={filters.colorFilter}
                    onChange={(e) =>
                        onFilterChange((prev) => ({ ...prev, colorFilter: e.target.value }))
                    }
                    className="bg-card border border-input rounded-xl px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                    <option value="all">Toutes les Couleurs ({availableColors.length})</option>
                    {availableColors.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>

                {/* Filtre Emplacement de Vente Spécifique (-1) */}
                <select
                    value={filters.specificSoldLocationFilter}
                    onChange={(e) =>
                        onFilterChange((prev) => ({ ...prev, specificSoldLocationFilter: e.target.value }))
                    }
                    className="bg-card border border-input rounded-xl px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer border-rose-500/30 text-rose-600 font-medium"
                >
                    <option value="all">Tous les Emplacements de Vente (-1)</option>
                    {availableSoldLocations.map((loc) => (
                        <option key={String(loc.id)} value={String(loc.id)}>
                            [{loc.id}] {loc.name}
                        </option>
                    ))}
                </select>

                {/* Filtre Stock Théorique */}
                <select
                    value={filters.theoreticalStockFilter}
                    onChange={(e) =>
                        onFilterChange((prev) => ({ ...prev, theoreticalStockFilter: e.target.value as any }))
                    }
                    className="bg-card border border-input rounded-xl px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                    <option value="all">Tous les Stocks Théoriques</option>
                    <option value="one">Stock = 1 (Normal)</option>
                    <option value="zero">Stock = 0 (Hors Périmètre / Épuisé)</option>
                    <option value="greater_than_one">Surstock (&gt; 1)</option>
                    <option value="negative">Stock Négatif (&lt; 0)</option>
                </select>

                {/* Bouton Réinitialisation */}
                {hasActiveFilters && (
                    <Button
                        onClick={onResetFilters}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 gap-1 rounded-lg cursor-pointer transition-all"
                    >
                        <RotateCcw className="w-3 h-3" />
                        <span>Réinitialiser</span>
                    </Button>
                )}
            </div>
        </div>
    );
}