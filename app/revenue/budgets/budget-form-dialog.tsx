"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription
} from "@/components/ui/dialog";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { upsertBudgetAction } from "./budget-actions";
import { toast } from "sonner";

interface BudgetFormDialogProps {
    currentMonth: number;
    currentYear: number;
    shops: { id: string; name: string }[];
    initialData?: {
        id: string;
        month: number;
        year: number;
        shop_id: string;
        segment: "Femme" | "Enfant" | "Beauty" | "Autres";
        target_amount: number;
    };
    trigger?: React.ReactNode;
}

const MONTHS_LIST = [
    { value: 1, label: "Janvier" },
    { value: 2, label: "Février" },
    { value: 3, label: "Mars" },
    { value: 4, label: "Avril" },
    { value: 5, label: "Mai" },
    { value: 6, label: "Juin" },
    { value: 7, label: "Juillet" },
    { value: 8, label: "Août" },
    { value: 9, label: "Septembre" },
    { value: 10, label: "Octobre" },
    { value: 11, label: "Novembre" },
    { value: 12, label: "Décembre" },
];

export function BudgetFormDialog({
    currentMonth,
    currentYear,
    shops,
    initialData,
    trigger
}: BudgetFormDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [selectedMonth, setSelectedMonth] = useState<number>(initialData?.month || currentMonth);
    const [selectedYear, setSelectedYear] = useState<number>(initialData?.year || currentYear);
    const [shopId, setShopId] = useState<string>(initialData?.shop_id || shops[0]?.id || "");
    const [segment, setSegment] = useState<"Femme" | "Enfant" | "Beauty" | "Autres">(
        initialData?.segment || "Femme"
    );
    const [targetAmount, setTargetAmount] = useState<string>(
        initialData ? String(initialData.target_amount) : ""
    );

    useEffect(() => {
        if (initialData) {
            setSelectedMonth(initialData.month);
            setSelectedYear(initialData.year);
            setShopId(initialData.shop_id);
            setSegment(initialData.segment);
            setTargetAmount(String(initialData.target_amount));
        }
    }, [initialData]);

    const isEditing = !!initialData?.id;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amountNum = parseFloat(targetAmount);

        if (!shopId) {
            toast.error("Veuillez sélectionner une boutique.");
            return;
        }

        if (isNaN(amountNum) || amountNum < 0) {
            toast.error("Veuillez saisir un montant cible valide.");
            return;
        }

        setLoading(true);

        const result = await upsertBudgetAction({
            id: initialData?.id,
            month: selectedMonth,
            year: selectedYear,
            shopId,
            segment,
            targetAmount: amountNum,
        });

        setLoading(false);

        if (result.success) {
            toast.success(isEditing ? "Budget mis à jour." : "Budget créé avec succès.");
            if (!isEditing) setTargetAmount("");
            setOpen(false);
        } else {
            toast.error(result.error || "Échec de l'enregistrement du budget.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? (
                    trigger
                ) : (
                    <Button className="h-9 px-4 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 gap-1.5 cursor-pointer">
                        <Plus className="w-4 h-4" /> Configurer un Budget
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="sm:max-w-md bg-card border-border text-card-foreground rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold">
                        {isEditing ? "Modifier le Budget" : "Allocation de Budget Mensuel"}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground font-light">
                        Définissez l'objectif financier USD par boutique et par segment.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-2">

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Mois Cible</Label>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="w-full h-10 px-3 rounded-xl border border-input bg-muted/20 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                            >
                                {MONTHS_LIST.map((m) => (
                                    <option key={m.value} value={m.value}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Année Cible</Label>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="w-full h-10 px-3 rounded-xl border border-input bg-muted/20 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary cursor-pointer font-mono"
                            >
                                {[2025, 2026, 2027, 2028].map((y) => (
                                    <option key={y} value={y}>
                                        {y}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Boutique Physique</Label>
                        <select
                            value={shopId}
                            onChange={(e) => setShopId(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl border border-input bg-muted/20 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
                        >
                            {shops.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Segment Produit</Label>
                        <select
                            value={segment}
                            onChange={(e) => setSegment(e.target.value as any)}
                            className="w-full h-10 px-3 rounded-xl border border-input bg-muted/20 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
                        >
                            <option value="Femme">Mode Femme</option>
                            <option value="Enfant">Mode Enfant</option>
                            <option value="Beauty">Beauté & Cosmétiques</option>
                            <option value="Autres">Autres</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Montant Cible ($ USD)</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-xs font-mono text-muted-foreground">$</span>
                            <Input
                                type="number"
                                placeholder="15000"
                                value={targetAmount}
                                onChange={(e) => setTargetAmount(e.target.value)}
                                className="pl-7 h-10 rounded-xl bg-muted/20 border-input font-mono text-xs text-foreground font-bold"
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            className="h-9 px-4 rounded-xl text-xs cursor-pointer"
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-9 px-4 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                    Enregistrement...
                                </>
                            ) : (
                                isEditing ? "Mettre à jour" : "Enregistrer le budget"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}