// app/settings/shops/[id]/shop-detail-client.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Plus, Trash2, Store, Pencil } from "lucide-react";
import { toast } from "sonner";
import ReportPageHeader from "@/components/new-ui/layout/report-page-header";
import { ReportSection } from "@/components/new-ui/layout/report-section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
    useShop,
    useUpdateLocation,
    useDeleteLocation,
} from "../../_lib/hooks/use-settings";
import { AddLocationDialog } from "./_components/add-location-dialog";
import { ShopLocation } from "../../_lib/types";
import { EditLocationDialog } from "./_components/edit-location-dialog";

const HEADER_BG = "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950";

interface Props {
    shopId: string;
}

export default function ShopDetailClient({ shopId }: Props) {
    const { data, isLoading } = useShop(shopId);
    const updateLoc = useUpdateLocation(shopId);
    const deleteLoc = useDeleteLocation(shopId);
    const [addOpen, setAddOpen] = useState(false);
    const [editLocation, setEditLocation] = useState<ShopLocation | null>(null);

    const shop = data?.shop;
    const locations = data?.locations ?? [];

    const handleToggleActive = async (locId: string, current: boolean) => {
        try {
            await updateLoc.mutateAsync({
                locId,
                payload: { is_active: !current },
            });
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Échec");
        }
    };

    const handleDelete = async (locId: string, name: string) => {
        if (!confirm(`Retirer l'emplacement "${name}" de cette boutique ?`)) return;
        try {
            await deleteLoc.mutateAsync(locId);
            toast.success("Emplacement retiré");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Échec");
        }
    };

    return (
        <div>
            <ReportPageHeader
                title={shop?.name ?? "Chargement…"}
                subtitle={
                    shop?.odoo_company_id
                        ? `Company Odoo #${shop.odoo_company_id}`
                        : "Pas de company Odoo associée"
                }
                badge={{ label: "Admin", tone: "violet" }}
                extraActions={
                    <div className="flex items-center gap-1.5">
                        <Link href="/settings/shops">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-[11px] gap-1 border-border/80 hover:bg-accent/60"
                            >
                                <ArrowLeft className="w-3 h-3" />
                                Retour
                            </Button>
                        </Link>
                        <Button
                            size="sm"
                            onClick={() => setAddOpen(true)}
                            disabled={!shop?.odoo_company_id}
                            className="h-7 px-2.5 text-[11px] gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
                        >
                            <Plus className="w-3 h-3" />
                            Ajouter emplacement
                        </Button>
                    </div>
                }
                isLoading={isLoading}
            />

            <div className="p-4 sm:p-5 space-y-4">
                {!shop?.odoo_company_id && (
                    <div className="rounded-lg border border-amber-200/60 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 p-3 text-[11px] text-amber-700 dark:text-amber-400">
                        <strong>Company Odoo manquante</strong> — Modifiez la boutique pour ajouter un `odoo_company_id` avant de pouvoir ajouter des emplacements.
                    </div>
                )}

                <ReportSection
                    index={1}
                    title={`Emplacements Odoo (${locations.length})`}
                >
                    {locations.length === 0 ? (
                        <div className="rounded-lg border border-border/60 border-dashed bg-card p-8 text-center">
                            <MapPin className="mx-auto w-6 h-6 text-muted-foreground/40" />
                            <h3 className="text-[12px] font-semibold text-foreground mt-2">
                                Aucun emplacement configuré
                            </h3>
                            <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                                Ajoutez des emplacements Odoo pour utiliser cette boutique dans les rééquilibrages et transferts.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table className="w-full text-[11px]">
                                    <TableHeader className={HEADER_BG}>
                                        <TableRow className={cn("border-none", HEADER_BG)}>
                                            <TableHead className="py-2 px-3 text-left text-[10px] font-semibold text-white uppercase tracking-wider min-w-[200px]">
                                                Nom Odoo
                                            </TableHead>
                                            <TableHead className="py-2 px-3 text-center text-[10px] font-semibold text-white uppercase tracking-wider min-w-[80px]">
                                                Ordre
                                            </TableHead>
                                            <TableHead className="py-2 px-3 text-center text-[10px] font-semibold text-white uppercase tracking-wider min-w-[80px]">
                                                ID
                                            </TableHead>
                                            <TableHead className="py-2 px-3 text-center text-[10px] font-semibold text-white uppercase tracking-wider min-w-[100px]">
                                                Statut
                                            </TableHead>
                                            <TableHead className="py-2 px-3 text-right text-[10px] font-semibold text-white uppercase tracking-wider min-w-[100px]">
                                                Action
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y divide-border/40">
                                        {locations.map((loc) => (
                                            <TableRow
                                                key={loc.id}
                                                className="hover:bg-accent/30 transition-colors border-b border-border/40"
                                            >
                                                <TableCell className="py-1.5 px-3 text-left">
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                                                        <span className="font-medium text-foreground">
                                                            {loc.label ?? loc.odoo_location_name}
                                                        </span>
                                                        {loc.label && (
                                                            <span className="text-[10px] text-muted-foreground/60 italic">
                                                                ({loc.odoo_location_name})
                                                            </span>
                                                        )}
                                                    </div>
                                                    {loc.odoo_location_complete_name && (
                                                        <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                                                            {loc.odoo_location_complete_name}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-1.5 px-3 text-left text-[11px]">
                                                    {loc.label ?? (
                                                        <span className="text-muted-foreground/40 italic">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-1.5 px-3 text-center font-mono tabular-nums text-[11px]">
                                                    {loc.odoo_location_id}
                                                </TableCell>
                                                <TableCell className="py-1.5 px-3 text-center">
                                                    <button
                                                        onClick={() => handleToggleActive(loc.id, loc.is_active)}
                                                        className={cn(
                                                            "inline-flex items-center gap-1 h-5 px-1.5 rounded-md border text-[10px] font-semibold transition-colors",
                                                            loc.is_active
                                                                ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60"
                                                                : "text-muted-foreground bg-muted/40 border-border/60",
                                                        )}
                                                    >
                                                        {loc.is_active ? "Actif" : "Inactif"}
                                                    </button>
                                                </TableCell>
                                                <TableCell className="py-1.5 px-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setEditLocation(loc)}
                                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-accent/60"
                                                            title="Modifier"
                                                        >
                                                            <Pencil className="w-3 h-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDelete(loc.id, loc.odoo_location_name)}
                                                            className="h-6 w-6 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                            title="Retirer"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </ReportSection>
            </div>

            {shop && (
                <AddLocationDialog
                    open={addOpen}
                    onOpenChange={setAddOpen}
                    shop={shop}
                    existingLocationIds={locations.map((l) => l.odoo_location_id)}
                />
            )}
            {editLocation && (
                <EditLocationDialog
                    open={!!editLocation}
                    onOpenChange={(open) => !open && setEditLocation(null)}
                    shopId={shopId}
                    location={editLocation}
                />
            )}
        </div>
    );
}