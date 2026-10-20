// app/settings/shops/shops-client.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Store, ChevronRight, Plus, Pencil } from "lucide-react";
import ReportPageHeader from "@/components/new-ui/layout/report-page-header";
import { ReportSection } from "@/components/new-ui/layout/report-section";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useShops, useDeleteShop } from "../_lib/hooks/use-settings";
import { CreateShopDialog } from "../_components/create-shop-dialog";
import { ShopWithStats } from "../_lib/types";
import { EditShopDialog } from "../_components/edit-shop-dialog";

const HEADER_BG = "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950";

export default function ShopsClient() {
    const router = useRouter();
    const { data, isLoading } = useShops();
    const deleteShop = useDeleteShop();
    const shops = data?.shops ?? [];
    const [createOpen, setCreateOpen] = useState(false);
    const [editShop, setEditShop] = useState<ShopWithStats | null>(null);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Supprimer la boutique "${name}" ? Toutes ses locations seront supprimées.`)) return;
        try {
            await deleteShop.mutateAsync(id);
            toast.success(`Boutique ${name} supprimée`);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Échec");
        }
    };

    return (
        <div>
            <ReportPageHeader
                title="Boutiques"
                subtitle="Configuration des shops et de leurs emplacements Odoo"
                badge={{ label: "Admin", tone: "violet" }}
                extraActions={
                    <Button
                        size="sm"
                        onClick={() => setCreateOpen(true)}
                        className="h-7 px-2.5 text-[11px] gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
                    >
                        <Plus className="w-3 h-3" />
                        Nouvelle boutique
                    </Button>
                }
                isLoading={isLoading}
            />

            <div className="p-4 sm:p-5 space-y-4">
                <ReportSection index={1} title={`${shops.length} boutique${shops.length > 1 ? "s" : ""}`}>
                    {isLoading ? (
                        <div className="rounded-lg border border-border/60 bg-card p-8 text-center">
                            <p className="text-[11px] text-muted-foreground/60 italic animate-pulse">
                                Chargement…
                            </p>
                        </div>
                    ) : shops.length === 0 ? (
                        <div className="rounded-lg border border-border/60 border-dashed bg-card p-8 text-center">
                            <Store className="mx-auto w-6 h-6 text-muted-foreground/40" />
                            <h3 className="text-[12px] font-semibold text-foreground mt-2">
                                Aucune boutique
                            </h3>
                            <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                                Créez votre première boutique pour commencer.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table className="w-full text-[11px]">
                                    <TableHeader className={HEADER_BG}>
                                        <TableRow className={cn("border-none", HEADER_BG)}>
                                            <TableHead className="py-2 px-3 text-left text-[10px] font-semibold text-white uppercase tracking-wider min-w-[200px]">
                                                Boutique
                                            </TableHead>
                                            <TableHead className="py-2 px-3 text-center text-[10px] font-semibold text-white uppercase tracking-wider min-w-[100px]">
                                                Company Odoo
                                            </TableHead>
                                            <TableHead className="py-2 px-3 text-center text-[10px] font-semibold text-white uppercase tracking-wider min-w-[130px]">
                                                Emplacements
                                            </TableHead>
                                            <TableHead className="py-2 px-3 text-right text-[10px] font-semibold text-white uppercase tracking-wider min-w-[140px]">
                                                Actions
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y divide-border/40">
                                        {shops.map((s) => (
                                            <TableRow key={s.id} className="hover:bg-accent/30 transition-colors border-b border-border/40">
                                                <TableCell className="py-1.5 px-3 text-left">
                                                    <div className="flex items-center gap-2">
                                                        <Store className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                                                        <span className="font-medium text-foreground">{s.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-1.5 px-3 text-center">
                                                    {s.odoo_company_id ? (
                                                        <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-mono">
                                                            {s.odoo_company_id}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground/40">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-1.5 px-3 text-center text-[11px]">
                                                    <span className="font-mono tabular-nums">
                                                        {s.active_locations_count} / {s.locations_count}
                                                    </span>
                                                    {s.locations_count === 0 && (
                                                        <Badge variant="outline" className="ml-1 h-4 px-1 text-[9px] text-amber-700 border-amber-200">
                                                            à config
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-1.5 px-3">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setEditShop(s)}
                                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-accent/60"
                                                            title="Modifier"
                                                        >
                                                            <Pencil className="w-3 h-3" />
                                                        </Button>
                                                        <Link href={`/settings/shops/${s.id}`}>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-6 px-2 text-[10px] gap-1 border-border/80 hover:bg-accent/60"
                                                            >
                                                                Configurer
                                                                <ChevronRight className="w-3 h-3" />
                                                            </Button>
                                                        </Link>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDelete(s.id, s.name)}
                                                            className="h-6 px-2 text-[10px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                        >
                                                            Supprimer
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

            <CreateShopDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                onCreated={() => router.refresh()}
            />
            {editShop && (
                <EditShopDialog
                    open={!!editShop}
                    onOpenChange={(open) => !open && setEditShop(null)}
                    shop={editShop}
                />
            )}
        </div>
    );
}