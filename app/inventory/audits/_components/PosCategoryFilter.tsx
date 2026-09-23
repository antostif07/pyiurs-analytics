"use client";

import React, { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Tag, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface PosCategoryOption {
    id: number;
    name: string;
    count: number;
}

interface Props {
    /** Catégories uniques extraites des items (déjà dédupliquées côté parent) */
    categories: PosCategoryOption[];
    /** IDs actuellement sélectionnés ([] = tous) */
    selected: number[];
    /** Callback de changement — reçoit le nouveau tableau d'IDs */
    onChange: (ids: number[]) => void;
    /** Désactive le filtre (mode read-only, etc.) */
    disabled?: boolean;
    /** Libellé custom */
    label?: string;
}

export function PosCategoryFilter({
    categories,
    selected,
    onChange,
    disabled = false,
    label = "Catégories POS",
}: Props) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    /* Filtre interne sur la liste (utile si > 8 catégories) */
    const visibleCategories = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return categories;
        return categories.filter((c) => c.name.toLowerCase().includes(q));
    }, [categories, search]);

    const selectedSet = useMemo(() => new Set(selected), [selected]);

    const toggleOne = (id: number) => {
        if (selectedSet.has(id)) {
            onChange(selected.filter((x) => x !== id));
        } else {
            onChange([...selected, id]);
        }
    };

    const selectAll = () => onChange([]);                    // [] = tous
    const clearAll = () => onChange(categories.map((c) => c.id));

    const isAllSelected = selected.length === 0;
    const hasSelection = !isAllSelected;

    /* Label du bouton déclencheur */
    const triggerLabel = useMemo(() => {
        if (isAllSelected) return `${label} · Toutes`;
        if (selected.length === 1) {
            const cat = categories.find((c) => c.id === selected[0]);
            return cat ? `${label} · ${cat.name}` : `${label} · 1`;
        }
        return `${label} · ${selected.length} sélectionnées`;
    }, [isAllSelected, selected, categories, label]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled || categories.length === 0}
                    className={cn(
                        "h-9 rounded-xl gap-2 border-border/80 bg-background justify-between font-normal text-xs",
                        hasSelection && "border-primary/40 bg-primary/5 text-foreground"
                    )}
                >
                    <span className="flex items-center gap-1.5 truncate max-w-[220px]">
                        <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{triggerLabel}</span>
                    </span>
                    <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </Button>
            </PopoverTrigger>

            <PopoverContent
                align="start"
                className="w-[320px] p-0 rounded-xl overflow-hidden"
            >
                {/* Barre de recherche interne */}
                {categories.length > 6 && (
                    <div className="border-b border-border/60 p-2">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher une catégorie..."
                            className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground/60 px-1.5 py-1"
                        />
                    </div>
                )}

                {/* Actions rapides */}
                <div className="flex items-center justify-between gap-2 border-b border-border/60 px-2 py-1.5">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={selectAll}
                        className="h-7 text-[11px] font-medium"
                    >
                        Tout sélectionner
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAll}
                        className="h-7 text-[11px] font-medium text-muted-foreground"
                    >
                        <X className="w-3 h-3 mr-1" /> Effacer
                    </Button>
                </div>

                {/* Liste scrollable */}
                <div className="max-h-[280px] overflow-y-auto py-1">
                    {visibleCategories.length === 0 ? (
                        <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                            Aucune catégorie trouvée.
                        </p>
                    ) : (
                        visibleCategories.map((cat) => {
                            const isSelected = selectedSet.has(cat.id);
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => toggleOne(cat.id)}
                                    className={cn(
                                        "w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors",
                                        "hover:bg-muted/60 focus-visible:outline-none focus-visible:bg-muted"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "flex size-4 shrink-0 items-center justify-center rounded border",
                                            isSelected
                                                ? "bg-primary border-primary text-primary-foreground"
                                                : "border-border"
                                        )}
                                    >
                                        {isSelected && <Check className="w-3 h-3" />}
                                    </span>
                                    <span className="flex-1 truncate font-medium">
                                        {cat.name}
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className="text-[9px] font-mono border-border/60"
                                    >
                                        {cat.count}
                                    </Badge>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Résumé en pied */}
                {hasSelection && (
                    <div className="border-t border-border/60 px-3 py-2 text-[10px] text-muted-foreground">
                        {selected.length} catégorie{selected.length > 1 ? "s" : ""} sur{" "}
                        {categories.length} · {selected.reduce((acc, id) => {
                            const c = categories.find((x) => x.id === id);
                            return acc + (c?.count ?? 0);
                        }, 0)}{" "}
                        articles
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}