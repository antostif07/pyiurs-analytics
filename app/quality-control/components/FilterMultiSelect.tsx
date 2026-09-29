"use client";

import { useState, useRef, useEffect, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Filter, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type FilterOption = {
    value: string;
    label: string;
    count: number;
};

type Props = {
    /** Options disponibles (déjà cross-filtrées côté serveur). */
    options: FilterOption[];
    /** Clé du param URL, ex: "hs_codes" | "suppliers". */
    paramKey: string;
    /** Icône à gauche du trigger. Défaut : Filter. */
    icon?: LucideIcon;
    /** Placeholder quand rien n'est sélectionné. */
    placeholder: string;
    /** Message d'état vide. */
    emptyMessage: string;
    /** Police monospace pour les valeurs (utile pour HS codes). */
    mono?: boolean;
};

export function FilterMultiSelect({
    options,
    paramKey,
    icon: Icon = Filter,
    placeholder,
    emptyMessage,
    mono = false,
}: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const paramValue = searchParams.get(paramKey);
    const [isPending, startTransition] = useTransition();

    // ── État local (draft) synchronisé avec l'URL ─────────────
    const [selected, setSelected] = useState<string[]>(
        paramValue ? paramValue.split(",").filter(Boolean) : [],
    );
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync quand l'URL change (navigation externe, SegmentTabs, etc.)
    useEffect(() => {
        setSelected(paramValue ? paramValue.split(",").filter(Boolean) : []);
    }, [paramValue]);

    // Fermeture au clic extérieur
    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    // ── Application à l'URL en préservant tous les autres params ──
    const applyFilters = (next: string[]) => {
        const params = new URLSearchParams(searchParams.toString());
        if (next.length) params.set(paramKey, next.join(","));
        else params.delete(paramKey);

        startTransition(() => {
            router.push(`?${params.toString()}`);
        });
    };

    const toggleOption = (value: string) => {
        setSelected((prev) =>
            prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
        );
    };

    // ── Fusionne options serveur + sélection courante ────────
    // Garantit que les valeurs sélectionnées restent visibles/décochables
    // même si le cross-filtering les a retirées de `options`.
    const displayedOptions = useMemo<FilterOption[]>(() => {
        const map = new Map(options.map((o) => [o.value, o]));
        for (const v of selected) {
            if (!map.has(v)) map.set(v, { value: v, label: v, count: 0 });
        }
        return Array.from(map.values());
    }, [options, selected]);

    const hasSelection = selected.length > 0;

    return (
        <div className="relative w-full sm:w-auto" ref={containerRef}>
            {/* ── Trigger ─────────────────────────────────────────── */}
            <button
                type="button"
                onClick={() => setIsOpen((o) => !o)}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                className={`w-full sm:w-64 flex items-center justify-between px-3 py-2 text-sm border rounded-lg shadow-sm transition-colors ${hasSelection
                    ? "bg-accent border-primary/30 text-accent-foreground font-medium"
                    : "bg-card border-border text-foreground hover:bg-secondary"
                    }`}
            >
                <div className="flex items-center gap-2 truncate">
                    <Icon className="w-4 h-4 shrink-0" />
                    {hasSelection ? (
                        <span className="truncate">
                            {selected.length} sélectionné{selected.length > 1 ? "s" : ""}
                        </span>
                    ) : (
                        <span className="truncate">{placeholder}</span>
                    )}
                </div>
                <ChevronDown
                    className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {/* ── Dropdown ────────────────────────────────────────── */}
            {isOpen && (
                <div
                    role="listbox"
                    className="absolute z-50 mt-2 w-full sm:w-80 bg-popover text-popover-foreground rounded-xl shadow-xl border border-border overflow-hidden animate-in fade-in zoom-in-95 origin-top-left"
                >
                    {/* Header */}
                    <div className="p-3 border-b border-border bg-secondary/50 flex justify-between items-center">
                        <span className="text-xs font-bold text-muted-foreground uppercase">
                            Disponibles ({options.length})
                        </span>
                        {hasSelection && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSelected([]);
                                    applyFilters([]);
                                }}
                                className="text-xs text-destructive hover:opacity-80 font-medium"
                            >
                                Tout effacer
                            </button>
                        )}
                    </div>

                    {/* Liste */}
                    <div className="max-h-60 overflow-y-auto p-1">
                        {displayedOptions.map((opt) => {
                            const isSelected = selected.includes(opt.value);
                            const isOrphan = opt.count === 0 && isSelected;
                            return (
                                <label
                                    key={opt.value}
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${isSelected
                                        ? "bg-accent text-accent-foreground"
                                        : "hover:bg-secondary text-foreground"
                                        }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div
                                            className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors ${isSelected
                                                ? "bg-primary border-primary"
                                                : "border-border bg-card"
                                                }`}
                                        >
                                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                                        </div>
                                        <span
                                            className={`truncate ${mono ? "font-mono" : ""} ${isOrphan ? "text-muted-foreground italic" : ""
                                                }`}
                                            title={opt.label}
                                        >
                                            {opt.label}
                                        </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground bg-card px-1.5 py-0.5 rounded border border-border shrink-0">
                                        {opt.count}
                                    </span>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={isSelected}
                                        onChange={() => toggleOption(opt.value)}
                                    />
                                </label>
                            );
                        })}

                        {displayedOptions.length === 0 && (
                            <div className="p-4 text-center text-xs text-muted-foreground">
                                {emptyMessage}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-2 border-t border-border bg-secondary/50">
                        <button
                            type="button"
                            onClick={() => {
                                applyFilters(selected);
                                setIsOpen(false);
                            }}
                            className="w-full py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:opacity-90 transition-opacity"
                        >
                            Appliquer le filtre
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}