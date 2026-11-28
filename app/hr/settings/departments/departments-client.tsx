"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
    AlertCircle,
    Briefcase,
    Building,
    Loader2,
    Pencil,
    Plus,
    Search,
    Trash2,
    Users,
} from "lucide-react";

import ReportPageHeader from "@/components/new-ui/layout/report-page-header";
import { ReportSection } from "@/components/new-ui/layout/report-section";
import CeoKpiCard from "@/app/ceo-report/_components/ceo-kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
    useDepartmentMutations,
    useDepartmentsData,
} from "./_lib/hooks/use-departments";
import type {
    HrDepartmentItem,
    HrDepartmentsData,
    HrJobTitleItem,
} from "./_lib/types";

const HEADER_BG =
    "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950";

export default function DepartmentsClient({
    initialData,
}: {
    initialData: HrDepartmentsData;
}) {
    const { data, isFetching, refetch } = useDepartmentsData(initialData);
    const mut = useDepartmentMutations();

    const report = data ?? initialData;
    const [search, setSearch] = useState("");
    const [selectedDeptId, setSelectedDeptId] = useState<string>("all");

    // Modales Département
    const [deptModal, setDeptModal] = useState<{
        open: boolean;
        editing: HrDepartmentItem | null;
        name: string;
        description: string;
    }>({ open: false, editing: null, name: "", description: "" });

    // Modales Poste
    const [posModal, setPosModal] = useState<{
        open: boolean;
        editing: HrJobTitleItem | null;
        title: string;
        departmentId: string;
        defaultSalary: string;
        currency: "USD" | "CDF";
    }>({
        open: false,
        editing: null,
        title: "",
        departmentId: "none",
        defaultSalary: "0",
        currency: "USD",
    });

    const [deleteTarget, setDeleteTarget] = useState<{
        type: "dept" | "pos";
        id: string;
        label: string;
    } | null>(null);

    const filteredDepts = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return report.departments;
        return report.departments.filter(
            (d) =>
                d.name.toLowerCase().includes(q) ||
                (d.description ?? "").toLowerCase().includes(q),
        );
    }, [report.departments, search]);

    const filteredPositions = useMemo(() => {
        const q = search.trim().toLowerCase();
        return report.positions.filter((p) => {
            if (selectedDeptId !== "all" && p.departmentId !== selectedDeptId) {
                return false;
            }
            if (!q) return true;
            return (
                p.title.toLowerCase().includes(q) ||
                (p.departmentName ?? "").toLowerCase().includes(q)
            );
        });
    }, [report.positions, search, selectedDeptId]);

    const handleSaveDept = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deptModal.name.trim()) return;
        try {
            if (deptModal.editing) {
                await mut.updateDepartment.mutateAsync({
                    id: deptModal.editing.id,
                    name: deptModal.name.trim(),
                    description: deptModal.description.trim() || null,
                });
                toast.success("Département mis à jour");
            } else {
                await mut.createDepartment.mutateAsync({
                    name: deptModal.name.trim(),
                    description: deptModal.description.trim() || null,
                });
                toast.success("Département créé");
            }
            setDeptModal((p) => ({ ...p, open: false }));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erreur");
        }
    };

    const handleSavePos = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!posModal.title.trim()) return;
        const payload = {
            title: posModal.title.trim(),
            department_id: posModal.departmentId === "none" ? null : posModal.departmentId,
            default_base_salary: Number(posModal.defaultSalary) || 0,
            currency: posModal.currency,
        };

        try {
            if (posModal.editing) {
                await mut.updatePosition.mutateAsync({
                    id: posModal.editing.id,
                    ...payload,
                });
                toast.success("Poste mis à jour");
            } else {
                await mut.createPosition.mutateAsync(payload);
                toast.success("Poste créé");
            }
            setPosModal((p) => ({ ...p, open: false }));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erreur");
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            if (deleteTarget.type === "dept") {
                await mut.deleteDepartment.mutateAsync(deleteTarget.id);
                toast.success("Département supprimé");
            } else {
                await mut.deletePosition.mutateAsync(deleteTarget.id);
                toast.success("Poste supprimé");
            }
            setDeleteTarget(null);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erreur");
        }
    };

    const isSavingDept = mut.createDepartment.isPending || mut.updateDepartment.isPending;
    const isSavingPos = mut.createPosition.isPending || mut.updatePosition.isPending;
    const isDeleting = mut.deleteDepartment.isPending || mut.deletePosition.isPending;

    return (
        <div>
            <ReportPageHeader
                title="Départements & Postes"
                subtitle="Structure organisationnelle, grilles indicatives et affectation agents"
                badge={{ label: "Admin RH", tone: "violet" }}
                isLoading={isFetching}
                onRefresh={async () => {
                    await refetch();
                }}
                extraActions={
                    <div className="flex items-center gap-1.5">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                                setDeptModal({
                                    open: true,
                                    editing: null,
                                    name: "",
                                    description: "",
                                })
                            }
                            className="h-7 px-2.5 text-[11px] gap-1"
                        >
                            <Plus className="w-3 h-3" />
                            Département
                        </Button>
                        <Button
                            size="sm"
                            onClick={() =>
                                setPosModal({
                                    open: true,
                                    editing: null,
                                    title: "",
                                    departmentId: selectedDeptId === "all" ? "none" : selectedDeptId,
                                    defaultSalary: "0",
                                    currency: "USD",
                                })
                            }
                            className="h-7 px-2.5 text-[11px] gap-1 bg-sky-600 hover:bg-sky-700 text-white"
                        >
                            <Plus className="w-3 h-3" />
                            Poste
                        </Button>
                    </div>
                }
            >
                <div className="relative w-64">
                    <Search className="w-3 h-3 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Filtrer département ou poste..."
                        className="w-full h-7 pl-7 pr-2.5 rounded-lg border border-border bg-secondary/60 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                </div>
            </ReportPageHeader>

            <div className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <CeoKpiCard
                        label="Départements"
                        value={String(report.kpis.totalDepartments)}
                        icon={<Building className="w-3.5 h-3.5" />}
                        iconColor="text-sky-600 dark:text-sky-400"
                        iconBg="bg-sky-50 dark:bg-sky-950/40"
                    />
                    <CeoKpiCard
                        label="Postes / Fonctions"
                        value={String(report.kpis.totalPositions)}
                        icon={<Briefcase className="w-3.5 h-3.5" />}
                        iconColor="text-violet-600 dark:text-violet-400"
                        iconBg="bg-violet-50 dark:bg-violet-950/40"
                    />
                    <CeoKpiCard
                        label="Agents affectés"
                        value={String(report.kpis.assignedEmployees)}
                        subtitle="Département + poste renseignés"
                        icon={<Users className="w-3.5 h-3.5" />}
                        iconColor="text-emerald-600 dark:text-emerald-400"
                        iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                    />
                    <CeoKpiCard
                        label="Agents incomplets"
                        value={String(report.kpis.unassignedEmployees)}
                        subtitle="Sans département ou sans poste"
                        icon={<AlertCircle className="w-3.5 h-3.5" />}
                        iconColor="text-amber-600 dark:text-amber-400"
                        iconBg="bg-amber-50 dark:bg-amber-950/40"
                    />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
                    {/* Départements */}
                    <div className="xl:col-span-5">
                        <ReportSection index={1} title={`Départements (${filteredDepts.length})`}>
                            <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
                                <Table className="w-full text-[11px]">
                                    <TableHeader className={HEADER_BG}>
                                        <TableRow className={cn("border-none", HEADER_BG)}>
                                            <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-left", HEADER_BG)}>Département</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-center", HEADER_BG)}>Postes</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-center", HEADER_BG)}>Agents</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-right", HEADER_BG)}>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y divide-border/40">
                                        {filteredDepts.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground italic">
                                                    Aucun département.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredDepts.map((d) => (
                                                <TableRow
                                                    key={d.id}
                                                    onClick={() =>
                                                        setSelectedDeptId((cur) => (cur === d.id ? "all" : d.id))
                                                    }
                                                    className={cn(
                                                        "cursor-pointer transition-colors",
                                                        selectedDeptId === d.id
                                                            ? "bg-sky-50/70 dark:bg-sky-950/30"
                                                            : "hover:bg-accent/30",
                                                    )}
                                                >
                                                    <TableCell className="py-2 px-3">
                                                        <p className="font-semibold text-foreground">{d.name}</p>
                                                        {d.description && (
                                                            <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                                                                {d.description}
                                                            </p>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-2 px-3 text-center font-mono">
                                                        {d.positionsCount}
                                                    </TableCell>
                                                    <TableCell className="py-2 px-3 text-center">
                                                        <Badge variant="secondary" className="h-5 font-mono text-[10px]">
                                                            {d.employeeCount}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell
                                                        className="py-2 px-3 text-right"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <div className="inline-flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    setDeptModal({
                                                                        open: true,
                                                                        editing: d,
                                                                        name: d.name,
                                                                        description: d.description ?? "",
                                                                    })
                                                                }
                                                                className="h-6 w-6 p-0"
                                                            >
                                                                <Pencil className="w-3 h-3" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    setDeleteTarget({
                                                                        type: "dept",
                                                                        id: d.id,
                                                                        label: d.name,
                                                                    })
                                                                }
                                                                className="h-6 w-6 p-0 text-rose-600"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </ReportSection>
                    </div>

                    {/* Postes */}
                    <div className="xl:col-span-7">
                        <ReportSection
                            index={2}
                            title={`Postes / Fonctions (${filteredPositions.length})`}
                        >
                            <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
                                <Table className="w-full text-[11px]">
                                    <TableHeader className={HEADER_BG}>
                                        <TableRow className={cn("border-none", HEADER_BG)}>
                                            <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-left", HEADER_BG)}>Intitulé du Poste</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-left", HEADER_BG)}>Département</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-right", HEADER_BG)}>Salaire Base Réf.</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-center", HEADER_BG)}>Agents</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-right", HEADER_BG)}>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y divide-border/40">
                                        {filteredPositions.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground italic">
                                                    Aucun poste trouvé.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredPositions.map((p) => (
                                                <TableRow key={p.id} className="hover:bg-accent/30">
                                                    <TableCell className="py-2 px-3 font-semibold text-foreground">
                                                        {p.title}
                                                    </TableCell>
                                                    <TableCell className="py-2 px-3 text-muted-foreground">
                                                        {p.departmentName || "—"}
                                                    </TableCell>
                                                    <TableCell className="py-2 px-3 text-right font-mono tabular-nums">
                                                        {p.defaultBaseSalary > 0
                                                            ? `${p.defaultBaseSalary.toLocaleString("fr-FR")} ${p.currency}`
                                                            : "—"}
                                                    </TableCell>
                                                    <TableCell className="py-2 px-3 text-center">
                                                        <Badge variant="secondary" className="h-5 font-mono text-[10px]">
                                                            {p.employeeCount}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="py-2 px-3 text-right">
                                                        <div className="inline-flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    setPosModal({
                                                                        open: true,
                                                                        editing: p,
                                                                        title: p.title,
                                                                        departmentId: p.departmentId ?? "none",
                                                                        defaultSalary: String(p.defaultBaseSalary),
                                                                        currency: p.currency,
                                                                    })
                                                                }
                                                                className="h-6 w-6 p-0"
                                                            >
                                                                <Pencil className="w-3 h-3" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    setDeleteTarget({
                                                                        type: "pos",
                                                                        id: p.id,
                                                                        label: p.title,
                                                                    })
                                                                }
                                                                className="h-6 w-6 p-0 text-rose-600"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </ReportSection>
                    </div>
                </div>
            </div>

            {/* Modal Département */}
            <Dialog
                open={deptModal.open}
                onOpenChange={(open) => !isSavingDept && setDeptModal((p) => ({ ...p, open }))}
            >
                <DialogContent className="max-w-md rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="text-sm">
                            {deptModal.editing ? "Modifier le département" : "Nouveau département"}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Le renommage met aussi à jour les fiches employés rattachées.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveDept} className="space-y-3">
                        <div className="space-y-1">
                            <Label className="text-xs">Nom *</Label>
                            <Input
                                value={deptModal.name}
                                onChange={(e) => setDeptModal((p) => ({ ...p, name: e.target.value }))}
                                placeholder="Ex : Ventes Boutique, Logistique, Finance…"
                                className="h-8 text-xs"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Description</Label>
                            <Input
                                value={deptModal.description}
                                onChange={(e) =>
                                    setDeptModal((p) => ({ ...p, description: e.target.value }))
                                }
                                placeholder="Optionnel…"
                                className="h-8 text-xs"
                            />
                        </div>
                        <DialogFooter className="gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isSavingDept}
                                onClick={() => setDeptModal((p) => ({ ...p, open: false }))}
                                className="h-7 text-[11px]"
                            >
                                Annuler
                            </Button>
                            <Button type="submit" size="sm" disabled={isSavingDept} className="h-7 text-[11px] gap-1.5">
                                {isSavingDept && <Loader2 className="w-3 h-3 animate-spin" />}
                                Enregistrer
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Poste */}
            <Dialog
                open={posModal.open}
                onOpenChange={(open) => !isSavingPos && setPosModal((p) => ({ ...p, open }))}
            >
                <DialogContent className="max-w-md rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="text-sm">
                            {posModal.editing ? "Modifier le poste" : "Nouveau poste"}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Rattachez ce poste à un département et définissez un salaire indicatif.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSavePos} className="space-y-3">
                        <div className="space-y-1">
                            <Label className="text-xs">Intitulé du poste *</Label>
                            <Input
                                value={posModal.title}
                                onChange={(e) => setPosModal((p) => ({ ...p, title: e.target.value }))}
                                placeholder="Ex : Conseillère de vente, Caissier, Gérant…"
                                className="h-8 text-xs"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Département</Label>
                            <Select
                                value={posModal.departmentId}
                                onValueChange={(v) => setPosModal((p) => ({ ...p, departmentId: v }))}
                            >
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Sans département" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none" className="text-xs">
                                        Sans département
                                    </SelectItem>
                                    {report.departments.map((d) => (
                                        <SelectItem key={d.id} value={d.id} className="text-xs">
                                            {d.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                            <div className="space-y-1">
                                <Label className="text-xs">Salaire de base réf.</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={posModal.defaultSalary}
                                    onChange={(e) =>
                                        setPosModal((p) => ({ ...p, defaultSalary: e.target.value }))
                                    }
                                    className="h-8 text-xs font-mono"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Devise</Label>
                                <Select
                                    value={posModal.currency}
                                    onValueChange={(v) =>
                                        setPosModal((p) => ({
                                            ...p,
                                            currency: v === "CDF" ? "CDF" : "USD",
                                        }))
                                    }
                                >
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USD" className="text-xs">USD ($)</SelectItem>
                                        <SelectItem value="CDF" className="text-xs">CDF (FC)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter className="gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isSavingPos}
                                onClick={() => setPosModal((p) => ({ ...p, open: false }))}
                                className="h-7 text-[11px]"
                            >
                                Annuler
                            </Button>
                            <Button type="submit" size="sm" disabled={isSavingPos} className="h-7 text-[11px] gap-1.5">
                                {isSavingPos && <Loader2 className="w-3 h-3 animate-spin" />}
                                Enregistrer
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Confirmation suppression */}
            <Dialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}
            >
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-sm">Confirmer la suppression</DialogTitle>
                        <DialogDescription className="text-xs">
                            Supprimer « {deleteTarget?.label} » ? Les fiches employés existantes
                            garderont leur texte actuel.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isDeleting}
                            onClick={() => setDeleteTarget(null)}
                            className="h-7 text-[11px]"
                        >
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            disabled={isDeleting}
                            onClick={handleConfirmDelete}
                            className="h-7 text-[11px] gap-1.5"
                        >
                            {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                            Supprimer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}