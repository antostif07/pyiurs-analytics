"use client";

import React, { useState, useMemo, useTransition, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
    BadgePercent,
    HandCoins,
    TrendingDown,
    Plus,
    Trash2,
    Receipt,
    Store,
    Calendar,
    Search,
    CheckCircle2,
    RotateCcw,
    Sparkles,
    DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import {
    BonusWithEmployee,
    DebtWithEmployee,
    createEmployeeBonus,
    deleteEmployeeBonus,
    createEmployeeDebt,
    recordManualDebtRepayment,
} from "./_actions";

// ✅ Composants Shadcn UI
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface BonusesClientProps {
    initialBonuses: BonusWithEmployee[];
    initialDebts: DebtWithEmployee[];
    currentMonth: string;
    currentYear: string;
    currentShop: string;
    shops: { id: string; name: string }[];
    employees: any[];
    userRole: string;
}

export default function BonusesClient({
    initialBonuses,
    initialDebts,
    currentMonth,
    currentYear,
    currentShop,
    shops,
    employees,
    userRole,
}: BonusesClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [activeTab, setActiveTab] = useState<"bonuses" | "debts">("bonuses");
    const [searchQuery, setSearchQuery] = useState("");

    // Modales
    const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
    const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
    const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
    const [selectedDebt, setSelectedDebt] = useState<DebtWithEmployee | null>(null);

    // Form States Modales
    const [targetEmployeeId, setTargetEmployeeId] = useState("");
    const [amountInput, setAmountInput] = useState("");
    const [reasonInput, setReasonInput] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Synchronisation des filtres d'URL
    const updateFilter = useCallback(
        (key: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value && value !== "all") {
                params.set(key, value);
            } else {
                params.delete(key);
            }
            startTransition(() => {
                router.replace(`${pathname}?${params.toString()}`, { scroll: false });
            });
        },
        [pathname, router, searchParams]
    );

    // 1. Calcul des Métriques Financières (KPIs)
    const kpis = useMemo(() => {
        const totalBonuses = initialBonuses.reduce((acc, b) => acc + Number(b.amount || 0), 0);
        const activeDebts = initialDebts.filter((d) => d.status === "active");
        const totalOutstandingDebt = activeDebts.reduce((acc, d) => acc + Number(d.remaining_amount || 0), 0);
        const totalInitialDebt = initialDebts.reduce((acc, d) => acc + Number(d.initial_amount || 0), 0);
        const totalRepaid = totalInitialDebt - totalOutstandingDebt;

        return {
            totalBonuses,
            bonusCount: initialBonuses.length,
            totalOutstandingDebt,
            indebtedEmployeesCount: new Set(activeDebts.map((d) => d.employee_id)).size,
            totalRepaid,
        };
    }, [initialBonuses, initialDebts]);

    // 2. Filtrage textuel local
    const filteredBonuses = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return initialBonuses;
        return initialBonuses.filter(
            (b) =>
                b.employees?.name.toLowerCase().includes(q) ||
                b.employees?.matricule?.toLowerCase().includes(q) ||
                b.reason.toLowerCase().includes(q)
        );
    }, [initialBonuses, searchQuery]);

    const filteredDebts = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return initialDebts;
        return initialDebts.filter(
            (d) =>
                d.employees?.name.toLowerCase().includes(q) ||
                d.employees?.matricule?.toLowerCase().includes(q) ||
                d.reason.toLowerCase().includes(q)
        );
    }, [initialDebts, searchQuery]);

    // Actions d'envoi
    const handleCreateBonus = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetEmployeeId || !amountInput || Number(amountInput) <= 0) {
            toast.error("Veuillez sélectionner un agent et indiquer un montant valide.");
            return;
        }

        try {
            setIsSubmitting(true);
            await createEmployeeBonus({
                employee_id: targetEmployeeId,
                month: parseInt(currentMonth, 10),
                year: parseInt(currentYear, 10),
                reason: reasonInput || "Prime de performance",
                amount: Number(amountInput),
            });

            toast.success("Prime accordée avec succès !");
            setIsBonusModalOpen(false);
            setTargetEmployeeId("");
            setAmountInput("");
            setReasonInput("");
        } catch (err: any) {
            toast.error(err.message || "Erreur lors de l'octroi de la prime.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteBonus = async (id: string) => {
        if (!confirm("Voulez-vous vraiment annuler cette prime ?")) return;
        try {
            await deleteEmployeeBonus(id);
            toast.success("Prime supprimée.");
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleCreateDebt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetEmployeeId || !amountInput || Number(amountInput) <= 0) {
            toast.error("Veuillez renseigner un agent et un montant.");
            return;
        }

        try {
            setIsSubmitting(true);
            await createEmployeeDebt({
                employee_id: targetEmployeeId,
                reason: reasonInput || "Avance sur salaire",
                initial_amount: Number(amountInput),
            });

            toast.success("Avance sur salaire enregistrée.");
            setIsDebtModalOpen(false);
            setTargetEmployeeId("");
            setAmountInput("");
            setReasonInput("");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRecordRepayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDebt || !amountInput || Number(amountInput) <= 0) return;

        try {
            setIsSubmitting(true);
            await recordManualDebtRepayment({
                debt_id: selectedDebt.id,
                amount: Number(amountInput),
                notes: reasonInput || "Remboursement direct en boutique",
            });

            toast.success("Remboursement comptabilisé !");
            setIsRepayModalOpen(false);
            setSelectedDebt(null);
            setAmountInput("");
            setReasonInput("");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 w-full">
            {/* 1. KPIS FINANCIERS HAUT DE GAMME */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 w-full">
                {/* Primes du Mois */}
                <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                                Primes Accordées ({currentMonth}/{currentYear})
                            </span>
                            <p className="text-2xl font-bold font-mono text-emerald-500">
                                ${kpis.totalBonuses.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="p-2 rounded-lg border bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shrink-0">
                            <BadgePercent className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-border/40 text-[11px] text-muted-foreground font-light">
                        Total de <span className="font-medium text-foreground">{kpis.bonusCount}</span> prime(s) ce mois
                    </div>
                </div>

                {/* Encours Total des Dettes */}
                <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                                Encours Dettes & Avances
                            </span>
                            <p className="text-2xl font-bold font-mono text-amber-500">
                                ${kpis.totalOutstandingDebt.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="p-2 rounded-lg border bg-amber-500/10 border-amber-500/20 text-amber-500 shrink-0">
                            <HandCoins className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-border/40 text-[11px] text-muted-foreground font-light">
                        Sur <span className="font-medium text-foreground">{kpis.indebtedEmployeesCount}</span> agent(s) concerné(s)
                    </div>
                </div>

                {/* Total Remboursé */}
                <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                                Total Déjà Remboursé
                            </span>
                            <p className="text-2xl font-bold font-mono text-primary">
                                ${kpis.totalRepaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="p-2 rounded-lg border bg-primary/10 border-primary/20 text-primary shrink-0">
                            <TrendingDown className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-border/40 text-[11px] text-muted-foreground font-light">
                        Amorti sur paie & versements directs
                    </div>
                </div>

                {/* Conformité / Plafond */}
                <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                                Règle de Prélèvement
                            </span>
                            <p className="text-sm font-semibold text-foreground mt-1">
                                Plafonné à 30% Net
                            </p>
                        </div>
                        <div className="p-2 rounded-lg border bg-muted text-muted-foreground shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-border/40 text-[11px] text-muted-foreground font-light">
                        Retenue automatique sur bulletin
                    </div>
                </div>
            </div>

            {/* 2. BARRE D'OUTILS & FILTRES */}
            <div className="bg-card border border-border/80 p-3.5 rounded-xl shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                    {/* Recherche */}
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
                        <Input
                            placeholder="Rechercher agent ou motif..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 text-xs h-9 bg-background"
                        />
                    </div>

                    {/* Boutique */}
                    <div className="w-full sm:w-52">
                        <Select value={currentShop} onValueChange={(val) => updateFilter("shopId", val)}>
                            <SelectTrigger className="h-9 text-xs bg-background">
                                <div className="flex items-center gap-2 truncate">
                                    <Store className="w-3.5 h-3.5 text-primary/80 shrink-0" />
                                    <SelectValue placeholder="Toutes les boutiques" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-xs">
                                    Toutes les boutiques
                                </SelectItem>
                                {shops.map((s) => (
                                    <SelectItem key={s.id} value={s.id} className="text-xs">
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator orientation="vertical" className="h-5 hidden sm:block mx-0.5" />

                    {/* Mois & Année (Pour les primes) */}
                    <div className="flex items-center gap-1.5">
                        <Select value={currentMonth} onValueChange={(val) => updateFilter("month", val)}>
                            <SelectTrigger className="h-9 text-xs bg-background w-32">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 12 }).map((_, i) => {
                                    const m = String(i + 1).padStart(2, "0");
                                    return (
                                        <SelectItem key={m} value={m} className="text-xs capitalize">
                                            {new Date(2000, i).toLocaleString("fr-FR", { month: "long" })}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>

                        <Select value={currentYear} onValueChange={(val) => updateFilter("year", val)}>
                            <SelectTrigger className="h-9 text-xs bg-background w-24 font-mono">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {["2024", "2025", "2026", "2027"].map((y) => (
                                    <SelectItem key={y} value={y} className="text-xs font-mono">
                                        {y}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Boutons d'Action Création */}
                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        size="sm"
                        onClick={() => setIsBonusModalOpen(true)}
                        className="h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Accorder une Prime</span>
                    </Button>

                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsDebtModalOpen(true)}
                        className="h-9 text-xs gap-1.5 border-border shadow-xs"
                    >
                        <Plus className="w-3.5 h-3.5 text-amber-500" />
                        <span>Nouvelle Avance</span>
                    </Button>
                </div>
            </div>

            {/* 3. TABS : PRIMES VS DETTES */}
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full space-y-4">
                <TabsList className="bg-muted/40 p-1 border border-border/60 rounded-xl">
                    <TabsTrigger value="bonuses" className="text-xs font-medium gap-2">
                        <BadgePercent className="w-3.5 h-3.5" />
                        <span>Primes du Mois ({filteredBonuses.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="debts" className="text-xs font-medium gap-2">
                        <HandCoins className="w-3.5 h-3.5" />
                        <span>Avances & Dettes Actives ({filteredDebts.length})</span>
                    </TabsTrigger>
                </TabsList>

                {/* ONGLET 1 : PRIMES */}
                <TabsContent value="bonuses">
                    <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="font-semibold text-xs text-foreground/80 pl-6">Conseiller de Vente</TableHead>
                                    <TableHead className="font-semibold text-xs text-foreground/80">Motif de la Prime</TableHead>
                                    <TableHead className="font-semibold text-xs text-foreground/80">Période Paie</TableHead>
                                    <TableHead className="font-semibold text-xs text-foreground/80">Date d'Octroi</TableHead>
                                    <TableHead className="font-semibold text-xs text-foreground/80 text-right">Montant Accordé</TableHead>
                                    <TableHead className="text-right font-semibold text-xs text-foreground/80 pr-6">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredBonuses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs">
                                            Aucune prime enregistrée pour ce mois.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredBonuses.map((bonus) => (
                                        <TableRow key={bonus.id} className="hover:bg-muted/20">
                                            <TableCell className="pl-6 py-3">
                                                <p className="text-xs font-semibold text-foreground">{bonus.employees?.name}</p>
                                                <p className="text-[10px] text-muted-foreground font-light">
                                                    {bonus.employees?.shops?.name || "Boutique"} • {bonus.employees?.matricule}
                                                </p>
                                            </TableCell>
                                            <TableCell className="text-xs text-foreground max-w-[200px] truncate">
                                                {bonus.reason}
                                            </TableCell>
                                            <TableCell className="text-xs font-mono">
                                                {String(bonus.month).padStart(2, "0")}/{bonus.year}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {bonus.created_at ? format(new Date(bonus.created_at), "dd MMM yyyy", { locale: fr }) : "—"}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-xs text-emerald-500">
                                                +${Number(bonus.amount).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right pr-6 py-2.5">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteBonus(bonus.id)}
                                                    className="h-7 w-7 text-muted-foreground hover:text-rose-500"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                {/* ONGLET 2 : DETTES & AVANCES */}
                <TabsContent value="debts">
                    <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="font-semibold text-xs text-foreground/80 pl-6">Conseiller de Vente</TableHead>
                                    <TableHead className="font-semibold text-xs text-foreground/80">Motif de l'Avance</TableHead>
                                    <TableHead className="font-semibold text-xs text-foreground/80">Date d'Émission</TableHead>
                                    <TableHead className="font-semibold text-xs text-foreground/80 text-right">Montant Initial</TableHead>
                                    <TableHead className="font-semibold text-xs text-foreground/80 text-right">Solde Restant</TableHead>
                                    <TableHead className="font-semibold text-xs text-foreground/80 text-center">Statut</TableHead>
                                    <TableHead className="text-right font-semibold text-xs text-foreground/80 pr-6">Gestion</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredDebts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-xs">
                                            Aucune avance ou dette enregistrée.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredDebts.map((debt) => (
                                        <TableRow key={debt.id} className="hover:bg-muted/20">
                                            <TableCell className="pl-6 py-3">
                                                <p className="text-xs font-semibold text-foreground">{debt.employees?.name}</p>
                                                <p className="text-[10px] text-muted-foreground font-light">
                                                    {debt.employees?.shops?.name || "Boutique"} • Salaire Base: ${debt.employees?.base_salary}
                                                </p>
                                            </TableCell>
                                            <TableCell className="text-xs text-foreground max-w-[200px] truncate">
                                                {debt.reason}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {debt.created_at ? format(new Date(debt.created_at), "dd MMM yyyy", { locale: fr }) : "—"}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                                ${Number(debt.initial_amount).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-xs text-amber-500">
                                                ${Number(debt.remaining_amount).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {debt.status === "active" ? (
                                                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">
                                                        En cours
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                                                        Soldée
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right pr-6 py-2.5">
                                                {debt.status === "active" && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSelectedDebt(debt);
                                                            setAmountInput(String(debt.remaining_amount));
                                                            setIsRepayModalOpen(true);
                                                        }}
                                                        className="h-7 text-[11px] gap-1 px-2 border-border shadow-xs hover:bg-muted"
                                                    >
                                                        <Receipt className="w-3 h-3 text-primary" />
                                                        <span>Rembourser</span>
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>

            {/* MODALE 1 : ACCORDER UNE PRIME */}
            <Dialog open={isBonusModalOpen} onOpenChange={setIsBonusModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold">Accorder une Prime Exceptionnelle</DialogTitle>
                        <DialogDescription className="text-xs">
                            Cette prime sera intégrée au brut du bulletin de paie du mois {currentMonth}/{currentYear}.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateBonus} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Bénéficiaire (Agent)</Label>
                            <Select value={targetEmployeeId} onValueChange={setTargetEmployeeId}>
                                <SelectTrigger className="text-xs h-9">
                                    <SelectValue placeholder="Sélectionner un agent..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-56">
                                    {employees.map((emp) => (
                                        <SelectItem key={emp.id} value={emp.id} className="text-xs">
                                            {emp.name} ({emp.shops?.name || "Boutique"})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Montant de la prime ($ USD)</Label>
                            <div className="relative">
                                <DollarSign className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="ex: 150.00"
                                    value={amountInput}
                                    onChange={(e) => setAmountInput(e.target.value)}
                                    className="pl-8 text-xs h-9 font-mono"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Motif / Justification</Label>
                            <Input
                                placeholder="ex: Record de vente perruques VIP"
                                value={reasonInput}
                                onChange={(e) => setReasonInput(e.target.value)}
                                className="text-xs h-9"
                                required
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setIsBonusModalOpen(false)}>
                                Annuler
                            </Button>
                            <Button type="submit" size="sm" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                                {isSubmitting ? "Enregistrement..." : "Accorder la prime"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODALE 2 : NOUVELLE AVANCE / DETTE */}
            <Dialog open={isDebtModalOpen} onOpenChange={setIsDebtModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold">Enregistrer une Avance sur Salaire</DialogTitle>
                        <DialogDescription className="text-xs">
                            Le remboursement sera automatiquement amorti lors des prochains cycles de paie.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateDebt} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Collaborateur</Label>
                            <Select value={targetEmployeeId} onValueChange={setTargetEmployeeId}>
                                <SelectTrigger className="text-xs h-9">
                                    <SelectValue placeholder="Sélectionner un collaborateur..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-56">
                                    {employees.map((emp) => (
                                        <SelectItem key={emp.id} value={emp.id} className="text-xs">
                                            {emp.name} — Salaire: ${emp.base_salary}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Montant de l'avance ($ USD)</Label>
                            <div className="relative">
                                <DollarSign className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="ex: 300.00"
                                    value={amountInput}
                                    onChange={(e) => setAmountInput(e.target.value)}
                                    className="pl-8 text-xs h-9 font-mono"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Motif de l'avance</Label>
                            <Input
                                placeholder="ex: Avance quinzaine / Frais d'urgence"
                                value={reasonInput}
                                onChange={(e) => setReasonInput(e.target.value)}
                                className="text-xs h-9"
                                required
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setIsDebtModalOpen(false)}>
                                Annuler
                            </Button>
                            <Button type="submit" size="sm" disabled={isSubmitting}>
                                {isSubmitting ? "Enregistrement..." : "Valider l'avance"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODALE 3 : REMBOURSEMENT MANUEL / DIRECT */}
            <Dialog open={isRepayModalOpen} onOpenChange={setIsRepayModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold">Enregistrer un Versement Comptant</DialogTitle>
                        <DialogDescription className="text-xs">
                            Agent : <strong className="text-foreground">{selectedDebt?.employees?.name}</strong> • Solde actuel :{" "}
                            <span className="font-mono text-amber-500 font-bold">${selectedDebt?.remaining_amount}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleRecordRepayment} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Montant versé ($ USD)</Label>
                            <div className="relative">
                                <DollarSign className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    type="number"
                                    step="0.01"
                                    max={Number(selectedDebt?.remaining_amount || 0)}
                                    value={amountInput}
                                    onChange={(e) => setAmountInput(e.target.value)}
                                    className="pl-8 text-xs h-9 font-mono"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Référence / Note de versement</Label>
                            <Input
                                placeholder="ex: Versement en espèces caisse principale"
                                value={reasonInput}
                                onChange={(e) => setReasonInput(e.target.value)}
                                className="text-xs h-9"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setIsRepayModalOpen(false)}>
                                Annuler
                            </Button>
                            <Button type="submit" size="sm" disabled={isSubmitting} className="bg-primary">
                                {isSubmitting ? "Comptabilisation..." : "Encaisser le remboursement"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}