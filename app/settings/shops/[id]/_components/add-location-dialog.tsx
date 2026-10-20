// app/settings/shops/[id]/_components/add-location-dialog.tsx
"use client";

import { useState, useMemo } from "react";
import { Loader2, MapPin, Search, Plus, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCreateLocation, useOdooLocations } from "../../../_lib/hooks/use-settings";
import type { Shop } from "../../../_lib/types";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shop: Shop;
    existingLocationIds: number[];
}

export function AddLocationDialog({
    open,
    onOpenChange,
    shop,
    existingLocationIds,
}: Props) {
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [includeAll, setIncludeAll] = useState(false);

    const { data, isLoading } = useOdooLocations(shop.odoo_company_id, {
        includeAll,
    });
    const create = useCreateLocation(shop.id);

    const existingSet = useMemo(
        () => new Set(existingLocationIds),
        [existingLocationIds],
    );

    const available = useMemo(() => {
        const all = data?.locations ?? [];
        const term = search.trim().toLowerCase();
        return all
            .filter((l) => !existingSet.has(l.id))
            .filter(
                (l) =>
                    term === "" ||
                    l.name.toLowerCase().includes(term) ||
                    (l.complete_name ?? "").toLowerCase().includes(term),
            );
    }, [data, existingSet, search]);

    const toggle = (id: number) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const reset = () => {
        setSearch("");
        setSelected(new Set());
        setIncludeAll(false);
    };

    const handleSubmit = async () => {
        if (selected.size === 0) {
            toast.error("Sélectionnez au moins un emplacement");
            return;
        }

        const all = data?.locations ?? [];
        const toAdd = all.filter((l) => selected.has(l.id));

        let successCount = 0;
        let failedCount = 0;

        for (const loc of toAdd) {
            try {
                await create.mutateAsync({
                    odoo_location_id: loc.id,
                    odoo_location_name: loc.name,
                    odoo_location_complete_name: loc.complete_name,
                    odoo_usage: loc.usage,
                    odoo_company_id: Array.isArray(loc.company_id)
                        ? loc.company_id[0]
                        : null,
                });
                successCount++;
            } catch {
                failedCount++;
            }
        }

        if (failedCount === 0) {
            toast.success(
                `${successCount} emplacement${successCount > 1 ? "s" : ""} ajouté${successCount > 1 ? "s" : ""}`,
            );
        } else {
            toast.warning(
                `${successCount} ajouté(s) · ${failedCount} échec(s)`,
            );
        }

        reset();
        onOpenChange(false);
    };

    const getLocationCompanyId = (loc: { company_id: [number, string] | false }) =>
        Array.isArray(loc.company_id) ? loc.company_id[0] : null;

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next && !create.isPending) reset();
                onOpenChange(next);
            }}
        >
            <DialogContent className="max-w-2xl rounded-xl border-border/60 bg-card p-0 shadow-2xl gap-0">
                <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
                    <DialogTitle className="text-[15px] font-semibold flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-sky-600" />
                        Ajouter des emplacements
                    </DialogTitle>
                    <DialogDescription className="text-[11px] text-muted-foreground/80">
                        Company Odoo #{shop.odoo_company_id} · sélectionnez les
                        emplacements à associer
                    </DialogDescription>
                </DialogHeader>

                <div className="px-5 py-3 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/60 pointer-events-none" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Rechercher un emplacement…"
                                className="h-8 pl-7 text-[11.5px]"
                                disabled={create.isPending}
                            />
                        </div>

                        <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer select-none whitespace-nowrap">
                            <input
                                type="checkbox"
                                checked={includeAll}
                                onChange={(e) => setIncludeAll(e.target.checked)}
                                disabled={create.isPending}
                                className="rounded border-border text-primary focus:ring-primary/40"
                            />
                            Toutes les companies
                        </label>
                    </div>

                    <div className="max-h-[350px] overflow-y-auto border border-border/60 rounded-lg bg-muted/10">
                        {isLoading ? (
                            <div className="p-4 text-center text-[11px] text-muted-foreground/60 italic">
                                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
                                Chargement des emplacements Odoo…
                            </div>
                        ) : available.length === 0 ? (
                            <div className="p-4 text-center text-[11px] text-muted-foreground/60 italic space-y-1">
                                <p>Aucun emplacement disponible</p>
                                <p className="text-[10px]">
                                    Essayez de cocher "Toutes les companies"
                                    ou de vérifier la configuration Odoo.
                                </p>
                            </div>
                        ) : (
                            <div className="p-1 space-y-0.5">
                                {available.map((loc) => {
                                    const checked = selected.has(loc.id);
                                    const locCompanyId = getLocationCompanyId(loc);
                                    const isShared = locCompanyId === null;
                                    const isMismatch =
                                        !isShared &&
                                        locCompanyId !== shop.odoo_company_id;

                                    return (
                                        <button
                                            key={loc.id}
                                            type="button"
                                            onClick={() => toggle(loc.id)}
                                            disabled={create.isPending}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors",
                                                checked
                                                    ? "bg-sky-50 dark:bg-sky-950/30"
                                                    : "hover:bg-accent/40",
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0",
                                                    checked
                                                        ? "bg-primary border-primary text-primary-foreground"
                                                        : "border-border",
                                                )}
                                            >
                                                {checked && (
                                                    <Check className="w-2.5 h-2.5" />
                                                )}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[11px] font-medium text-foreground truncate">
                                                    {loc.name}
                                                </div>
                                                {loc.complete_name && (
                                                    <div className="text-[10px] text-muted-foreground/60 truncate">
                                                        {loc.complete_name}
                                                    </div>
                                                )}
                                            </div>

                                            {isMismatch && (
                                                <Badge
                                                    variant="outline"
                                                    className="h-4 px-1 text-[9px] text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/60 shrink-0 gap-0.5"
                                                    title={`Location de company #${locCompanyId} — pas celle du shop (#${shop.odoo_company_id})`}
                                                >
                                                    <AlertTriangle className="w-2.5 h-2.5" />
                                                    #{locCompanyId}
                                                </Badge>
                                            )}
                                            {isShared && (
                                                <Badge
                                                    variant="outline"
                                                    className="h-4 px-1 text-[9px] text-muted-foreground shrink-0"
                                                    title="Emplacement partagé entre companies"
                                                >
                                                    shared
                                                </Badge>
                                            )}
                                            <Badge
                                                variant="outline"
                                                className="h-4 px-1 text-[9px] shrink-0"
                                            >
                                                #{loc.id}
                                            </Badge>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {selected.size > 0 && (
                        <p className="text-[10px] text-muted-foreground/70 italic">
                            {selected.size} emplacement
                            {selected.size > 1 ? "s" : ""} sélectionné
                            {selected.size > 1 ? "s" : ""}
                        </p>
                    )}
                </div>

                <DialogFooter className="px-5 py-3 border-t border-border/60 gap-2 sm:gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        disabled={create.isPending}
                        className="h-7 text-[11px]"
                    >
                        Annuler
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={create.isPending || selected.size === 0}
                        className="h-7 text-[11px] gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
                    >
                        {create.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                            <Plus className="w-3 h-3" />
                        )}
                        Ajouter ({selected.size})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}