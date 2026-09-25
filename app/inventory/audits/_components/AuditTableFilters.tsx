"use client";

import React, { useMemo, useState } from "react";
import { Search, X, Filter, RotateCcw, SlidersHorizontal, Tag, Building2, Package, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ExtendedAuditFilters, StockAuditItem } from "../_lib/types";
import { getPosCategoryIds, getPosCategoryNames, getSoldLocations } from "../_lib/helpers";
import { PosCategoryFilter, PosCategoryOption } from "./PosCategoryFilter";

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
    auditDepartment: string | null;
}

/* ═══════════════════════════════════════════════════════════════════ */
/* CHIP — une puce compacte pour un filtre actif                      */
/* ═══════════════════════════════════════════════════════════════════ */
function FilterChip({
    label,
    tone = "neutral",
    onRemove,
}: {
    label: string;
    tone?: "neutral" | "rose" | "sky" | "pink" | "amber" | "emerald";
    onRemove: () => void;
}) {
    const toneClasses = {
        neutral: "bg-muted/60 border-border text-foreground",
        rose: "bg-rose-500/10 border-rose-500/30 text-rose-700",
        sky: "bg-sky-500/10 border-sky-500/30 text-sky-700",
        pink: "bg-pink-500/10 border-pink-500/30 text-pink-700",
        amber: "bg-amber-500/10 border-amber-500/30 text-amber-700",
        emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700",
    };
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium",
                toneClasses[tone]
            )}
        >
            <span className="truncate max-w-[160px]">{label}</span>
            <button
                type="button"
                onClick={onRemove}
                className="hover:opacity-70 transition-opacity cursor-pointer shrink-0"
            >
                <X className="w-2.5 h-2.5" />
            </button>
        </span>
    );
}

export function AuditTableFilters({
    filters,
    onFilterChange,
    onResetFilters,
    items,
    counts,
    auditDepartment,
}: AuditTableFiltersProps) {
    const [filterPanelOpen, setFilterPanelOpen] = useState(false);
    const isBeautyPerimeter = (auditDepartment ?? "").includes("Beauty");

    /* ─── Extraction dynamique ─── */
    const availableBrands = useMemo(() => {
        const brands = new Set<string>();
        items.forEach((i) => {
            const b = (i as any).brand;
            if (b && b !== "N/A") brands.add(b);
        });
        return Array.from(brands).sort();
    }, [items]);

    const availableColors = useMemo(() => {
        const colors = new Set<string>();
        items.forEach((i) => {
            const c = (i as any).color;
            if (c && c !== "N/A") colors.add(c);
        });
        return Array.from(colors).sort();
    }, [items]);

    const availableSoldLocations = useMemo(() => {
        const locsMap = new Map<string, { id: number | string; name: string }>();
        items.forEach((i) => {
            const list = getSoldLocations(i);
            list.forEach((l) => {
                if (l.id && l.name) {
                    const key = String(l.id);
                    if (!locsMap.has(key)) locsMap.set(key, { id: l.id, name: l.name });
                }
            });
        });
        return Array.from(locsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [items]);

    const availablePosCategories = useMemo<PosCategoryOption[]>(() => {
        const map = new Map<number, PosCategoryOption>();
        for (const item of items) {
            const ids = getPosCategoryIds(item);
            const names = getPosCategoryNames(item);
            ids.forEach((id, idx) => {
                const entry = map.get(id) ?? { id, name: names[idx] ?? `#${id}`, count: 0 };
                entry.count++;
                map.set(id, entry);
            });
        }
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [items]);

    /* ─── Comptage des filtres actifs (hors recherche et statut) ─── */
    const activeFilterCount = useMemo(() => {
        let n = 0;
        if (filters.brandFilter !== "all") n++;
        if (filters.colorFilter !== "all") n++;
        if (filters.theoreticalStockFilter !== "all") n++;
        if (filters.soldElsewhereFilter !== "all") n++;
        if (filters.specificSoldLocationFilter !== "all") n++;
        if (filters.foundElsewhereFilter !== "all") n++;
        if (filters.cosmeticFilter !== "all") n++;
        if (filters.posCategoryFilter.length > 0) n++;
        return n;
    }, [filters]);

    const hasActiveFilters =
        filters.searchQuery !== "" ||
        filters.statusFilter !== "all" ||
        activeFilterCount > 0;

    /* ─── Helper de mise à jour partielle ─── */
    const updateFilter = <K extends keyof ExtendedAuditFilters>(
        key: K,
        value: ExtendedAuditFilters[K]
    ) => {
        onFilterChange((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <div className="space-y-3 print:hidden">
            {/* ═══════════════════════════════════════════════════════ */}
            {/* LIGNE 1 — Statuts + Recherche + Bouton Filtres         */}
            {/* ═══════════════════════════════════════════════════════ */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Tabs de statut */}
                <div className="flex items-center gap-0.5 bg-muted/20 p-0.5 rounded-lg border border-border flex-wrap">
                    {([
                        { key: "all" as const, label: "Tous", count: counts.all, color: "text-foreground" },
                        { key: "scanned" as const, label: "Scannés", count: counts.scanned, color: "text-emerald-600" },
                        { key: "remaining" as const, label: "Restants", count: counts.remaining, color: "text-amber-600" },
                        { key: "sold_elsewhere" as const, label: "Vendus (-1)", count: counts.sold_elsewhere, color: "text-rose-600" },
                    ] as const).map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => updateFilter("statusFilter", tab.key)}
                            className={cn(
                                "px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer",
                                filters.statusFilter === tab.key
                                    ? "bg-card shadow-xs text-foreground"
                                    : "text-muted-foreground hover:text-foreground",
                                filters.statusFilter === tab.key && tab.color
                            )}
                        >
                            {tab.label} <span className="opacity-60">({tab.count})</span>
                        </button>
                    ))}
                </div>

                {/* Recherche + Bouton Filtres */}
                <div className="flex items-center gap-2 flex-1 lg:flex-initial">
                    {/* Recherche */}
                    <div className="relative flex-1 lg:w-72">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={filters.searchQuery}
                            onChange={(e) => updateFilter("searchQuery", e.target.value)}
                            className="w-full bg-muted/20 border border-input rounded-lg pl-8 pr-7 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                        />
                        {filters.searchQuery && (
                            <button
                                onClick={() => updateFilter("searchQuery", "")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Bouton Filtres + Popover */}
                    <Popover open={filterPanelOpen} onOpenChange={setFilterPanelOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "h-8 px-3 rounded-lg text-[11px] font-semibold gap-1.5 cursor-pointer relative",
                                    activeFilterCount > 0 &&
                                    "border-primary/50 bg-primary/5 text-primary"
                                )}
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                <span>Filtres</span>
                                {activeFilterCount > 0 && (
                                    <Badge className="h-4 min-w-4 px-1 text-[9px] font-bold bg-primary text-white">
                                        {activeFilterCount}
                                    </Badge>
                                )}
                            </Button>
                        </PopoverTrigger>

                        <PopoverContent
                            align="end"
                            className="w-[380px] p-0 rounded-xl overflow-hidden"
                        >
                            {/* Header du popover */}
                            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/20">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-xs font-bold uppercase tracking-wider">
                                        Filtres
                                    </span>
                                    {activeFilterCount > 0 && (
                                        <Badge
                                            variant="outline"
                                            className="text-[9px] font-mono"
                                        >
                                            {activeFilterCount} actif{activeFilterCount > 1 ? "s" : ""}
                                        </Badge>
                                    )}
                                </div>
                                {hasActiveFilters && (
                                    <button
                                        onClick={onResetFilters}
                                        className="text-[10px] text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 px-2 py-0.5 rounded-md transition-colors font-medium flex items-center gap-1"
                                    >
                                        <RotateCcw className="w-2.5 h-2.5" />
                                        Tout effacer
                                    </button>
                                )}
                            </div>

                            {/* Corps scrollable */}
                            <div className="max-h-[420px] overflow-y-auto p-4 space-y-4">
                                {/* Catégories POS */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <Tag className="w-3 h-3 text-primary" />
                                        Catégories POS
                                    </label>
                                    <PosCategoryFilter
                                        categories={availablePosCategories}
                                        selected={filters.posCategoryFilter}
                                        onChange={(ids) =>
                                            updateFilter("posCategoryFilter", ids)
                                        }
                                        disabled={availablePosCategories.length === 0}
                                        label="Catégories POS"
                                    />
                                </div>

                                {/* Marque */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Marque
                                    </label>
                                    <Select
                                        value={filters.brandFilter}
                                        onValueChange={(v) => updateFilter("brandFilter", v)}
                                    >
                                        <SelectTrigger className="h-8 text-xs rounded-lg">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                Toutes les marques ({availableBrands.length})
                                            </SelectItem>
                                            {availableBrands.map((b) => (
                                                <SelectItem key={b} value={b}>
                                                    {b}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Couleur */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Couleur
                                    </label>
                                    <Select
                                        value={filters.colorFilter}
                                        onValueChange={(v) => updateFilter("colorFilter", v)}
                                    >
                                        <SelectTrigger className="h-8 text-xs rounded-lg">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                Toutes les couleurs ({availableColors.length})
                                            </SelectItem>
                                            {availableColors.map((c) => (
                                                <SelectItem key={c} value={c}>
                                                    {c}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Emplacement de vente (-1) */}
                                {availableSoldLocations.length > 0 && (
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                            <Building2 className="w-3 h-3 text-rose-500" />
                                            Vendu dans (-1)
                                        </label>
                                        <Select
                                            value={filters.specificSoldLocationFilter}
                                            onValueChange={(v) =>
                                                updateFilter("specificSoldLocationFilter", v)
                                            }
                                        >
                                            <SelectTrigger className="h-8 text-xs rounded-lg border-rose-500/30">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    Tous les emplacements
                                                </SelectItem>
                                                {availableSoldLocations.map((loc) => (
                                                    <SelectItem
                                                        key={String(loc.id)}
                                                        value={String(loc.id)}
                                                    >
                                                        [{loc.id}] {loc.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Vendus ailleurs oui/non */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Vendus ailleurs
                                    </label>
                                    <Select
                                        value={filters.soldElsewhereFilter}
                                        onValueChange={(v) =>
                                            updateFilter("soldElsewhereFilter", v as "all" | "yes" | "no")
                                        }
                                    >
                                        <SelectTrigger className="h-8 text-xs rounded-lg">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tous</SelectItem>
                                            <SelectItem value="yes">Oui (avec -1)</SelectItem>
                                            <SelectItem value="no">Non</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Trouvés ailleurs oui/non */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <Package className="w-3 h-3 text-sky-500" />
                                        Trouvés ailleurs (stock positif)
                                    </label>
                                    <Select
                                        value={filters.foundElsewhereFilter}
                                        onValueChange={(v) =>
                                            updateFilter("foundElsewhereFilter", v as "all" | "yes" | "no")
                                        }
                                    >
                                        <SelectTrigger className="h-8 text-xs rounded-lg border-sky-500/30">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tous</SelectItem>
                                            <SelectItem value="yes">Avec emplacement</SelectItem>
                                            <SelectItem value="no">Sans emplacement</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Cosmétiques / Génériques (Beauty only) */}
                                {isBeautyPerimeter && (
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                            Type de produit Beauty
                                        </label>
                                        <Select
                                            value={filters.cosmeticFilter}
                                            onValueChange={(v) =>
                                                updateFilter(
                                                    "cosmeticFilter",
                                                    v as "all" | "cosmetic" | "generic"
                                                )
                                            }
                                        >
                                            <SelectTrigger className="h-8 text-xs rounded-lg border-pink-500/30">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Tous</SelectItem>
                                                <SelectItem value="cosmetic">
                                                    Cosmétiques [COS]
                                                </SelectItem>
                                                <SelectItem value="generic">
                                                    Génériques (sans [COS])
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Stock théorique */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Stock théorique
                                    </label>
                                    <Select
                                        value={filters.theoreticalStockFilter}
                                        onValueChange={(v) =>
                                            updateFilter(
                                                "theoreticalStockFilter",
                                                v as
                                                | "all"
                                                | "one"
                                                | "zero"
                                                | "greater_than_one"
                                                | "negative"
                                            )
                                        }
                                    >
                                        <SelectTrigger className="h-8 text-xs rounded-lg">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tous</SelectItem>
                                            <SelectItem value="one">= 1 (Normal)</SelectItem>
                                            <SelectItem value="zero">
                                                = 0 (Hors périmètre)
                                            </SelectItem>
                                            <SelectItem value="greater_than_one">
                                                &gt; 1 (Surstock)
                                            </SelectItem>
                                            <SelectItem value="negative">
                                                &lt; 0 (Négatif)
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Footer du popover */}
                            <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/20">
                                <span className="text-[10px] text-muted-foreground">
                                    {activeFilterCount === 0
                                        ? "Aucun filtre actif"
                                        : `${activeFilterCount} filtre${activeFilterCount > 1 ? "s" : ""} appliqué${activeFilterCount > 1 ? "s" : ""}`}
                                </span>
                                <Button
                                    size="sm"
                                    onClick={() => setFilterPanelOpen(false)}
                                    className="h-7 px-3 text-[11px] rounded-lg"
                                >
                                    Fermer
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* LIGNE 2 — Chips des filtres actifs                     */}
            {/* ═══════════════════════════════════════════════════════ */}
            {activeFilterCount > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mr-1">
                        Actifs :
                    </span>

                    {/* Catégories POS */}
                    {filters.posCategoryFilter.length > 0 && (
                        <FilterChip
                            label={`POS: ${filters.posCategoryFilter
                                .map(
                                    (id) =>
                                        availablePosCategories.find((c) => c.id === id)?.name ??
                                        `#${id}`
                                )
                                .join(", ")}`}
                            tone="neutral"
                            onRemove={() => updateFilter("posCategoryFilter", [])}
                        />
                    )}

                    {filters.brandFilter !== "all" && (
                        <FilterChip
                            label={`Marque: ${filters.brandFilter}`}
                            tone="neutral"
                            onRemove={() => updateFilter("brandFilter", "all")}
                        />
                    )}

                    {filters.colorFilter !== "all" && (
                        <FilterChip
                            label={`Couleur: ${filters.colorFilter}`}
                            tone="neutral"
                            onRemove={() => updateFilter("colorFilter", "all")}
                        />
                    )}

                    {filters.specificSoldLocationFilter !== "all" && (
                        <FilterChip
                            label={`Empl. vendu: ${availableSoldLocations.find(
                                (l) =>
                                    String(l.id) ===
                                    filters.specificSoldLocationFilter
                            )?.name ?? filters.specificSoldLocationFilter
                                }`}
                            tone="rose"
                            onRemove={() =>
                                updateFilter("specificSoldLocationFilter", "all")
                            }
                        />
                    )}

                    {filters.soldElsewhereFilter !== "all" && (
                        <FilterChip
                            label={`Vendus ailleurs: ${filters.soldElsewhereFilter === "yes" ? "Oui" : "Non"
                                }`}
                            tone="rose"
                            onRemove={() => updateFilter("soldElsewhereFilter", "all")}
                        />
                    )}

                    {filters.foundElsewhereFilter !== "all" && (
                        <FilterChip
                            label={`Trouvés ailleurs: ${filters.foundElsewhereFilter === "yes" ? "Oui" : "Non"
                                }`}
                            tone="sky"
                            onRemove={() => updateFilter("foundElsewhereFilter", "all")}
                        />
                    )}

                    {filters.cosmeticFilter !== "all" && (
                        <FilterChip
                            label={`Type: ${filters.cosmeticFilter === "cosmetic"
                                    ? "Cosmétiques [COS]"
                                    : "Génériques"
                                }`}
                            tone="pink"
                            onRemove={() => updateFilter("cosmeticFilter", "all")}
                        />
                    )}

                    {filters.theoreticalStockFilter !== "all" && (
                        <FilterChip
                            label={`Stock ${{
                                    one: "= 1",
                                    zero: "= 0",
                                    greater_than_one: "> 1",
                                    negative: "< 0",
                                }[filters.theoreticalStockFilter] ?? ""
                                }`}
                            tone="amber"
                            onRemove={() =>
                                updateFilter("theoreticalStockFilter", "all")
                            }
                        />
                    )}

                    {activeFilterCount > 1 && (
                        <button
                            onClick={onResetFilters}
                            className="text-[10px] text-rose-600 hover:text-rose-700 font-semibold ml-1 px-1.5 py-0.5 rounded hover:bg-rose-500/10 transition-colors"
                        >
                            Effacer tout
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}