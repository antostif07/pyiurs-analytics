"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Store, Layers, Loader2 } from "lucide-react";
import { deleteBudgetAction } from "./budget-actions";
import { toast } from "sonner";

interface BudgetTableProps {
    budgets: any[];
    daysInMonth: number;
}

const formatUSD = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(amount);
};

export function BudgetTable({ budgets, daysInMonth }: BudgetTableProps) {
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        const result = await deleteBudgetAction(id);
        setDeletingId(null);

        if (result.success) {
            toast.success("Budget supprimé.");
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
                        <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider">Cible / Entité</TableHead>
                        <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider text-right">Budget Mensuel</TableHead>
                        <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider text-right">Cible Jour ({daysInMonth}j)</TableHead>
                        <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider text-right">Cible Hebdo (7j)</TableHead>
                        <TableHead className="py-3 px-4 text-right w-16"></TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-border/40 font-mono">
                    {budgets.map((b) => {
                        const isShop = !!b.shop_id;
                        const targetName = isShop ? b.shops?.name || "Boutique" : `Segment ${b.segment}`;
                        const targetAmount = Number(b.target_amount) || 0;

                        const dailyTarget = Math.round(targetAmount / daysInMonth);
                        const weeklyTarget = Math.round((targetAmount / daysInMonth) * 7);

                        return (
                            <TableRow key={b.id} className="hover:bg-muted/30 transition-colors">
                                {/* Libellé de l'entité */}
                                <TableCell className="py-3 px-4 font-sans font-semibold text-foreground">
                                    <div className="flex items-center gap-2">
                                        {isShop ? (
                                            <Store className="w-3.5 h-3.5 text-primary shrink-0" />
                                        ) : (
                                            <Layers className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                        )}
                                        <span>{targetName}</span>
                                        <Badge variant="outline" className="text-[8px] uppercase tracking-wider font-mono">
                                            {isShop ? "Boutique" : "Segment"}
                                        </Badge>
                                    </div>
                                </TableCell>

                                {/* Budget Mensuel */}
                                <TableCell className="py-3 px-4 text-right font-bold text-foreground">
                                    {formatUSD(targetAmount)}
                                </TableCell>

                                {/* Cible Jour */}
                                <TableCell className="py-3 px-4 text-right text-muted-foreground">
                                    {formatUSD(dailyTarget)}
                                </TableCell>

                                {/* Cible Hebdo */}
                                <TableCell className="py-3 px-4 text-right text-muted-foreground">
                                    {formatUSD(weeklyTarget)}
                                </TableCell>

                                {/* Action de suppression */}
                                <TableCell className="py-3 px-4 text-right">
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
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}