"use client";

import React, { useState, useMemo, useTransition, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
    FileSpreadsheet,
    Calculator,
    Lock,
    DollarSign,
    Store,
    Pencil,
    Search,
    ShieldCheck,
    ClockAlert,
    Calendar,
    AlertTriangle,
    Info,
    Loader2,
    UserCheck,
} from "lucide-react";
import { toast } from "sonner";

import {
    PayslipWithDetails,
    generateOrRecalculatePayrollBatch,
    updateSinglePayslip,
    lockAndValidatePayrollBatch,
} from "./_actions";

// ✅ Composants Shadcn UI
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { PayslipBatchRow } from "@/lib/supabase/types";

interface PreparationClientProps {
    batch: PayslipBatchRow | null;
    initialPayslips: PayslipWithDetails[];
    currentMonth: string;
    currentYear: string;
    currentShop: string;
    shops: { id: string; name: string }[];
    userRole: string;
}

export default function PreparationClient({
    batch,
    initialPayslips,
    currentMonth,
    currentYear,
    currentShop,
    shops,
}: PreparationClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPayslip, setSelectedPayslip] = useState<PayslipWithDetails | null>(null);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

    // État du volet d'inspection des pénalités
    const [inspectingPayslip, setInspectingPayslip] = useState<PayslipWithDetails | null>(null);

    const [bonusInput, setBonusInput] = useState("");
    const [debtInput, setDebtInput] = useState("");
    const [noteInput, setNoteInput] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Helper d'extraction des métadonnées stockées dans 'note'
    const parsePayslipMeta = (noteText?: string | null) => {
        if (!noteText) return { absenceDeductions: 0, lateDeductions: 0, penalties: [] };
        try {
            return JSON.parse(noteText);
        } catch {
            return { absenceDeductions: 0, lateDeductions: 0, penalties: [] };
        }
    };

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

    // Totaux financiers
    const totals = useMemo(() => {
        return initialPayslips.reduce(
            (acc, p) => {
                const meta = parsePayslipMeta(p.note);
                acc.gross += Number(p.gross_salary || 0);
                acc.bonuses += Number(p.performance_bonus || 0);
                acc.absences += Number(meta.absenceDeductions || p.deductions_absences || 0);
                acc.lates += Number(meta.lateDeductions || 0);
                acc.debts += Number(p.advance_repayments || 0);
                acc.net += Number(p.net_payable || 0);
                return acc;
            },
            { gross: 0, bonuses: 0, absences: 0, lates: 0, debts: 0, net: 0 }
        );
    }, [initialPayslips]);

    const filteredPayslips = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return initialPayslips;
        return initialPayslips.filter(
            (p) =>
                p.employees?.name.toLowerCase().includes(q) ||
                p.employees?.matricule?.toLowerCase().includes(q) ||
                p.employees?.job_title?.toLowerCase().includes(q)
        );
    }, [initialPayslips, searchQuery]);

    const handleCalculate = async () => {
        try {
            setIsSubmitting(true);
            await generateOrRecalculatePayrollBatch(
                parseInt(currentMonth, 10),
                parseInt(currentYear, 10),
                currentShop
            );
            toast.success("Feuille de paie calculée avec succès !");
        } catch (err: any) {
            toast.error(err.message || "Erreur lors du calcul.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLockBatch = async () => {
        if (!batch?.id) return;
        if (!confirm("Voulez-vous clôturer ce lot ? Cette action verrouille les bulletins et déduit les dettes actives.")) {
            return;
        }

        try {
            setIsSubmitting(true);
            await lockAndValidatePayrollBatch(batch.id);
            toast.success("Lot de paie clôturé et verrouillé !");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isLocked = batch?.status === "validated" || batch?.status === "paid";
    const activeInspectedMeta = parsePayslipMeta(inspectingPayslip?.note);

    return (
        <div className="space-y-6 w-full">
            {/* 1. SYNTHÈSE DES CHARGES DE PAIE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 w-full">
                <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-xs">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Masse Brute</span>
                    <p className="text-xl font-bold font-mono mt-1">${totals.gross.toFixed(2)}</p>
                </div>

                <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-xs">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Primes</span>
                    <p className="text-xl font-bold font-mono text-emerald-500 mt-1">+${totals.bonuses.toFixed(2)}</p>
                </div>

                {/* ✅ KPI Absences */}
                <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-xs">
                    <span className="text-[10px] font-semibold text-rose-500 uppercase tracking-wider block">Déd. Absences</span>
                    <p className="text-xl font-bold font-mono text-rose-500 mt-1">-${totals.absences.toFixed(2)}</p>
                </div>

                {/* ✅ KPI Retards */}
                <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-xs">
                    <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider block">Retenues Retard</span>
                    <p className="text-xl font-bold font-mono text-amber-500 mt-1">-${totals.lates.toFixed(2)}</p>
                </div>

                <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-xs">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Amort. Dettes</span>
                    <p className="text-xl font-bold font-mono text-amber-500 mt-1">-${totals.debts.toFixed(2)}</p>
                </div>

                <div className="bg-card border border-primary/40 rounded-xl p-3.5 shadow-xs bg-primary/5">
                    <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block">Net Global</span>
                    <p className="text-xl font-bold font-mono text-primary mt-1">${totals.net.toFixed(2)}</p>
                </div>
            </div>

            {/* 2. BARRE D'OUTILS ET CLÔTURE */}
            <div className="bg-card border border-border/80 p-3.5 rounded-xl shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                    <div className="relative w-full sm:w-60">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
                        <Input
                            placeholder="Rechercher un agent..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 text-xs h-9 bg-background"
                        />
                    </div>

                    <div className="w-full sm:w-52">
                        <Select value={currentShop} onValueChange={(val) => updateFilter("shopId", val)}>
                            <SelectTrigger className="h-9 text-xs bg-background">
                                <div className="flex items-center gap-2 truncate">
                                    <Store className="w-3.5 h-3.5 text-primary/80 shrink-0" />
                                    <SelectValue placeholder="Boutique" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-xs">Toutes les boutiques</SelectItem>
                                {shops.map((s) => (
                                    <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator orientation="vertical" className="h-5 hidden sm:block mx-0.5" />

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
                                    <SelectItem key={y} value={y} className="text-xs font-mono">{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {!isLocked && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCalculate}
                                disabled={isSubmitting || isPending}
                                className="h-9 text-xs gap-1.5 border-border hover:bg-muted"
                            >
                                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calculator className="w-3.5 h-3.5" />}
                                <span>{initialPayslips.length > 0 ? "Recalculer le lot" : "Générer la paie"}</span>
                            </Button>

                            {initialPayslips.length > 0 && (
                                <Button
                                    size="sm"
                                    onClick={handleLockBatch}
                                    disabled={isSubmitting || isPending}
                                    className="h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                                >
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Clôturer & Verrouiller</span>
                                </Button>
                            )}
                        </>
                    )}

                    {isLocked && (
                        <Badge variant="secondary" className="h-9 px-3 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs font-semibold gap-1.5">
                            <ShieldCheck className="w-4 h-4" />
                            <span>Lot Clôturé & Verrouillé</span>
                        </Badge>
                    )}
                </div>
            </div>

            {/* 3. TABLEAU DE PAIE AVEC COLONNES SÉPARÉES */}
            <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="font-semibold text-xs text-foreground/80 pl-6">Collaborateur (Cliquer pour inspecter)</TableHead>
                            <TableHead className="font-semibold text-xs text-foreground/80 text-right">Salaire Base</TableHead>
                            <TableHead className="font-semibold text-xs text-foreground/80 text-right">Transport Net</TableHead>
                            <TableHead className="font-semibold text-xs text-foreground/80 text-right">Primes</TableHead>
                            <TableHead className="font-semibold text-xs text-foreground/80 text-right">Salaire Brut</TableHead>
                            {/* ✅ DEUX COLONNES SÉPARÉES */}
                            <TableHead className="font-semibold text-xs text-rose-500 text-right">Déd. Absence</TableHead>
                            <TableHead className="font-semibold text-xs text-amber-500 text-right">Retenue Retard</TableHead>
                            <TableHead className="font-semibold text-xs text-foreground/80 text-right">Amort. Avance</TableHead>
                            <TableHead className="font-semibold text-xs text-foreground/80 text-right">Net à Payer</TableHead>
                            <TableHead className="text-right font-semibold text-xs text-foreground/80 pr-6">Action</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {filteredPayslips.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} className="h-44 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center space-y-2">
                                        <FileSpreadsheet className="w-8 h-8 opacity-40 mb-1" />
                                        <p className="text-sm font-medium text-foreground">Aucune paie calculée pour ce mois</p>
                                        <p className="text-xs">Cliquez sur <strong>« Générer la paie »</strong> pour lancer la consolidation.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredPayslips.map((slip) => {
                                const meta = parsePayslipMeta(slip.note);
                                const hasPenalties = (meta.penalties || []).length > 0;

                                return (
                                    <TableRow key={slip.id} className="hover:bg-muted/20 transition-colors font-mono text-xs">
                                        {/* Nom cliquable avec soulignement et badge */}
                                        <TableCell className="pl-6 py-3 font-sans">
                                            <div
                                                onClick={() => setInspectingPayslip(slip)}
                                                className="cursor-pointer group/emp inline-flex flex-col text-left"
                                                title="Cliquer pour afficher le détail des retenues"
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-semibold text-foreground group-hover/emp:text-primary group-hover/emp:underline transition-colors text-xs">
                                                        {slip.employees?.name}
                                                    </span>
                                                    {hasPenalties && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" title="Pénalités détectées" />
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground font-light">
                                                    {slip.employees?.shops?.name || "Boutique"} • {slip.employees?.job_title}
                                                </p>
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-right text-muted-foreground">
                                            ${Number(slip.base_salary).toFixed(2)}
                                        </TableCell>

                                        <TableCell className="text-right text-muted-foreground">
                                            ${Number(slip.transport_allowance).toFixed(2)}
                                        </TableCell>

                                        <TableCell className="text-right text-emerald-500 font-bold">
                                            {Number(slip.performance_bonus) > 0 ? `+$${Number(slip.performance_bonus).toFixed(2)}` : "—"}
                                        </TableCell>

                                        <TableCell className="text-right font-bold text-foreground">
                                            ${Number(slip.gross_salary).toFixed(2)}
                                        </TableCell>

                                        {/* ✅ Colonne Déduction Absence */}
                                        <TableCell className="text-right text-rose-500 font-medium">
                                            {Number(meta.absenceDeductions) > 0 ? `-$${Number(meta.absenceDeductions).toFixed(2)}` : "—"}
                                        </TableCell>

                                        {/* ✅ Colonne Retenue Retard */}
                                        <TableCell className="text-right text-amber-500 font-medium">
                                            {Number(meta.lateDeductions) > 0 ? `-$${Number(meta.lateDeductions).toFixed(2)}` : "—"}
                                        </TableCell>

                                        <TableCell className="text-right text-amber-500">
                                            {Number(slip.advance_repayments) > 0 ? `-$${Number(slip.advance_repayments).toFixed(2)}` : "—"}
                                        </TableCell>

                                        <TableCell className="text-right font-bold text-sm text-primary">
                                            ${Number(slip.net_payable).toFixed(2)}
                                        </TableCell>

                                        <TableCell className="text-right pr-6 py-2.5 font-sans">
                                            {!isLocked ? (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setSelectedPayslip(slip);
                                                        setBonusInput(String(slip.performance_bonus || 0));
                                                        setDebtInput(String(slip.advance_repayments || 0));
                                                        setNoteInput(slip.note || "");
                                                        setIsAdjustModalOpen(true);
                                                    }}
                                                    className="h-7 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground"
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                    <span>Ajuster</span>
                                                </Button>
                                            ) : (
                                                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-none text-[10px]">
                                                    Validé
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* 4. VOLET LATÉRAL D'INSPECTION DÉTAILLÉE DES PÉNALITÉS (SHADCN SHEET) */}
            <Sheet open={Boolean(inspectingPayslip)} onOpenChange={(open) => !open && setInspectingPayslip(null)}>
                <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-background border-l shadow-2xl z-[80]">
                    <SheetHeader className="px-6 py-5 border-b bg-muted/20 text-left">
                        <SheetTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                            <ClockAlert className="w-4 h-4 text-amber-500" />
                            <span>Détails des Pointages & Retenues</span>
                        </SheetTitle>
                        <SheetDescription className="text-xs text-muted-foreground">
                            Agent : <strong className="text-foreground">{inspectingPayslip?.employees?.name}</strong> • Base :{" "}
                            <span className="font-mono font-bold">${inspectingPayslip?.base_salary}</span>
                        </SheetDescription>
                    </SheetHeader>

                    <ScrollArea className="flex-1 px-6 py-4">
                        <div className="space-y-4">
                            {/* Synthèse des déductions */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                                    <span className="text-[10px] text-rose-500 font-semibold uppercase">Total Absences</span>
                                    <p className="text-lg font-bold font-mono text-rose-500 mt-0.5">
                                        -${Number(activeInspectedMeta.absenceDeductions || 0).toFixed(2)}
                                    </p>
                                </div>

                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                    <span className="text-[10px] text-amber-500 font-semibold uppercase">Total Retards ({">"}9h)</span>
                                    <p className="text-lg font-bold font-mono text-amber-500 mt-0.5">
                                        -${Number(activeInspectedMeta.lateDeductions || 0).toFixed(2)}
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                                    Historique des jours pénalisés ({activeInspectedMeta.penalties?.length || 0})
                                </h4>

                                {(!activeInspectedMeta.penalties || activeInspectedMeta.penalties.length === 0) ? (
                                    <div className="p-6 text-center text-muted-foreground border border-dashed rounded-lg">
                                        <UserCheck className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
                                        <p className="text-xs font-medium text-foreground">Aucune pénalité ce mois-ci</p>
                                        <p className="text-[11px]">L'agent a été ponctuel et présent à tous ses horaires.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {activeInspectedMeta.penalties.map((item: any, idx: number) => (
                                            <div
                                                key={idx}
                                                className="p-3 rounded-lg border border-border/70 bg-card flex items-start justify-between gap-3 text-xs"
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-foreground">
                                                            {item.date === "Mois complet"
                                                                ? item.date
                                                                : format(new Date(item.date), "EEE dd MMM yyyy", { locale: fr })}
                                                        </span>
                                                        <Badge
                                                            variant="secondary"
                                                            className={`text-[9px] px-1.5 py-0 ${item.penaltyType === "late"
                                                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                                                    : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                                                }`}
                                                        >
                                                            {item.penaltyType === "late" ? "Retard" : "Absence"}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.reason}</p>
                                                </div>

                                                <div className="text-right font-mono shrink-0">
                                                    <span className="font-bold text-rose-500">-${Number(item.amountDeducted).toFixed(2)}</span>
                                                    {item.transportDeducted && (
                                                        <p className="text-[10px] text-muted-foreground">-1j transport</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>

            {/* 5. MODALE D'AJUSTEMENT DU BULLETIN */}
            <Dialog open={isAdjustModalOpen} onOpenChange={setIsAdjustModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold">Ajustement du Bulletin de Paie</DialogTitle>
                        <DialogDescription className="text-xs">
                            Agent : <strong className="text-foreground">{selectedPayslip?.employees?.name}</strong> • Base :{" "}
                            <span className="font-mono font-bold">${selectedPayslip?.base_salary}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={async (e) => {
                            e.preventDefault();
                            if (!selectedPayslip) return;
                            try {
                                setIsSubmitting(true);
                                await updateSinglePayslip(selectedPayslip.id, {
                                    performance_bonus: Number(bonusInput),
                                    advance_repayments: Number(debtInput),
                                    note: noteInput,
                                });
                                toast.success("Bulletin mis à jour !");
                                setIsAdjustModalOpen(false);
                            } catch (err: any) {
                                toast.error(err.message);
                            } finally {
                                setIsSubmitting(false);
                            }
                        }}
                        className="space-y-4 py-2"
                    >
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Primes exceptionnelles ($ USD)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={bonusInput}
                                onChange={(e) => setBonusInput(e.target.value)}
                                className="text-xs h-9 font-mono"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Retenue Remboursement Avance ($ USD)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={debtInput}
                                onChange={(e) => setDebtInput(e.target.value)}
                                className="text-xs h-9 font-mono"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Motif / Note</Label>
                            <Input
                                placeholder="Régularisation exceptionnelle"
                                value={noteInput}
                                onChange={(e) => setNoteInput(e.target.value)}
                                className="text-xs h-9"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setIsAdjustModalOpen(false)}>
                                Annuler
                            </Button>
                            <Button type="submit" size="sm" disabled={isSubmitting}>
                                Appliquer l'ajustement
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}