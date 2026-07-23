"use client";

import { useState } from "react";
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
import { Plus, Loader2 } from "lucide-react";
import { upsertBudgetAction } from "./budget-actions";
import { toast } from "sonner";

interface BudgetFormDialogProps {
    currentMonth: number;
    currentYear: number;
    shops: { id: string; name: string }[];
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

export function BudgetFormDialog({ currentMonth, currentYear, shops }: BudgetFormDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // ✅ Choix dynamique du Mois et de l'Année pour les prévisions futures
    const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
    const [selectedYear, setSelectedYear] = useState<number>(currentYear);
    const [shopId, setShopId] = useState<string>(shops[0]?.id || "");
    const [segment, setSegment] = useState<"Femme" | "Enfant" | "Beauty" | "Autres">("Femme");
    const [targetAmount, setTargetAmount] = useState<string>("");

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
            month: selectedMonth,
            year: selectedYear,
            shopId,
            segment,
            targetAmount: amountNum,
        });

        setLoading(false);

        if (result.success) {
            toast.success("Budget mensuel enregistré avec succès.");
            setTargetAmount("");
            setOpen(false);
        } else {
            toast.error(result.error || "Échec de l'enregistrement du budget.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="h-9 px-4 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 gap-1.5 cursor-pointer">
                    <Plus className="w-4 h-4" /> Configurer un Budget
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md bg-card border-border text-card-foreground rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold">Allocation de Budget Mensuel</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground font-light">
                        Définissez l'objectif financier USD par boutique et par segment.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-2">

                    {/* ✅ Sélecteur de Mois et d'Année (Pour planifier les mois futurs) */}
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

                    {/* Sélection de la Boutique Physique */}
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

                    {/* Sélection du Segment Produit */}
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

                    {/* Saisie du Montant Cible */}
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
                                "Enregistrer le budget"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}