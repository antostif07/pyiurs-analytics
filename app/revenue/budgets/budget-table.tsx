"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Pencil, Store, Layers, Loader2 } from "lucide-react";
import { deleteBudgetAction } from "./budget-actions";
import { BudgetFormDialog } from "./budget-form-dialog";
import { toast } from "sonner";

interface BudgetTableProps {
    budgets: any[];
    shops: { id: string; name: string }[];
    daysInMonth: number;
    currentMonth: number;
    currentYear: number;
}

const formatUSD = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(amount);
};

export function BudgetTable({
    budgets,
    shops,
    daysInMonth,
    currentMonth,
    currentYear
}: BudgetTableProps) {
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        if (!confirm("Voulez-vous vraiment supprimer ce budget ?")) return;

        setDeletingId(id);
        const result = await deleteBudgetAction(id);
        setDeletingId(null);

        if (result.success) {
            toast.success("Budget supprimé avec succès.");
        } else {
            toast.error(result.error || "Échec de la suppression.");
        }
    };

    if (!budgets || budgets.length === 0) {
        return (
            <div className="text-center py-16 bg-card border border-border border-dashed rounded-2xl">
                <p className="text-xs text-muted-foreground font-light">
                    Aucun budget configuré pour ce mois. Cliquez sur "Configurer un Budget" pour commencer.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
            <Table className="w-full text-xs">
                <TableHeader className="bg-muted/40">
                    <TableRow className="border-b border-border hover:bg-transparent">
                        <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider">Boutique Physique</TableHead>
                        <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider">Segment Produit</TableHead>
                        <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider text-right">Budget Mensuel</TableHead>
                        <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider text-right">Cible Jour ({daysInMonth}j)</TableHead>
                        <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider text-right">Cible Hebdo (7j)</TableHead>
                        <TableHead className="py-3 px-4 text-right w-24">Actions</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-border/40 font-mono">
                    {budgets.map((b) => {
                        const shopName = b.shops?.name || "Boutique";
                        const segmentName = b.segment || "Général";
                        const targetAmount = Number(b.target_amount) || 0;

                        const dailyTarget = Math.round(targetAmount / daysInMonth);
                        const weeklyTarget = Math.round((targetAmount / daysInMonth) * 7);

                        return (
                            <TableRow key={b.id} className="hover:bg-muted/30 transition-colors">
                                {/* 1. Nom de la Boutique */}
                                <TableCell className="py-3 px-4 font-sans font-semibold text-foreground">
                                    <div className="flex items-center gap-2">
                                        <Store className="w-3.5 h-3.5 text-primary shrink-0" />
                                        <span>{shopName}</span>
                                    </div>
                                </TableCell>

                                {/* 2. Nom du Segment avec Badge */}
                                <TableCell className="py-3 px-4 font-sans">
                                    <div className="flex items-center gap-1.5">
                                        <Layers className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                        <Badge variant="outline" className="text-[10px] font-medium border-border bg-muted/30">
                                            {segmentName}
                                        </Badge>
                                    </div>
                                </TableCell>

                                {/* 3. Budget Mensuel */}
                                <TableCell className="py-3 px-4 text-right font-bold text-foreground">
                                    {formatUSD(targetAmount)}
                                </TableCell>

                                {/* 4. Cible Jour */}
                                <TableCell className="py-3 px-4 text-right text-muted-foreground">
                                    {formatUSD(dailyTarget)}
                                </TableCell>

                                {/* 5. Cible Hebdo */}
                                <TableCell className="py-3 px-4 text-right text-muted-foreground">
                                    {formatUSD(weeklyTarget)}
                                </TableCell>

                                {/* 6. Boutons d'Action (Édition et Suppression) */}
                                <TableCell className="py-3 px-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        {/* Bouton d'édition (Crayon) */}
                                        <BudgetFormDialog
                                            currentMonth={currentMonth}
                                            currentYear={currentYear}
                                            shops={shops}
                                            initialData={{
                                                id: b.id,
                                                month: b.month,
                                                year: b.year,
                                                shop_id: b.shop_id,
                                                segment: b.segment,
                                                target_amount: targetAmount,
                                            }}
                                            trigger={
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg cursor-pointer"
                                                    title="Modifier ce budget"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </Button>
                                            }
                                        />

                                        {/* Bouton de suppression (Corbeille) */}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={deletingId === b.id}
                                            onClick={() => handleDelete(b.id)}
                                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                                            title="Supprimer ce budget"
                                        >
                                            {deletingId === b.id ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-3.5 h-3.5" />
                                            )}
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}