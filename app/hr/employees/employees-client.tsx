"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
    Search,
    MoreHorizontal,
    Plus,
    Pencil,
    Store,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    ChevronLeft,
    ChevronRight,
    Phone,
    Mail,
    Copy,
    Check,
    UserX,
    FilterX,
    Folder,
    Users,
    UserCheck,
    Briefcase,
} from "lucide-react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";

import ReportPageHeader from "@/components/new-ui/layout/report-page-header";
import { ReportSection } from "@/components/new-ui/layout/report-section";
import CeoKpiCard from "@/app/ceo-report/_components/ceo-kpi-card";
import EmployeeFormDrawer from "../_components/employee-form-drawer";
import { getEmployees, getShops } from "../actions";
import type { EmployeeWithShop } from "@/lib/supabase/types";

// Composants UI
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const HEADER_BG =
    "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950";

const selectClass =
    "h-7 text-[11.5px] bg-secondary/60 border-border hover:border-ring/60 focus:border-ring text-foreground/80 rounded-lg";

interface EmployeesClientProps {
    initialData: {
        data: EmployeeWithShop[];
        totalCount: number;
        totalPages: number;
        currentPage: number;
    };
    initialShops: Array<{ id: string; name: string }>;
    userRole: string;
}

export default function EmployeesClient({
    initialData,
    initialShops,
    userRole,
}: EmployeesClientProps) {
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [sortBy, setSortBy] = useState("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [selectedShopId, setSelectedShopId] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");

    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithShop | undefined>(undefined);

    const canEdit = userRole === "admin" || userRole === "manager";

    // Debounce de recherche textuelle (300ms)
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // 1. Boutiques en cache
    const { data: shops = initialShops } = useQuery({
        queryKey: ["shops-list"],
        queryFn: async () => {
            const res = await getShops();
            return (res || []).map((s: any) => ({ id: s.id, name: s.name }));
        },
        initialData: initialShops,
        staleTime: 1000 * 60 * 60,
    });

    // 2. Query paginée des employés
    const {
        data,
        isFetching,
        isLoading,
        refetch,
    } = useQuery({
        queryKey: [
            "employees",
            page,
            debouncedSearch,
            sortBy,
            sortOrder,
            selectedShopId,
            statusFilter,
        ],
        queryFn: () =>
            getEmployees(
                page,
                10,
                debouncedSearch,
                sortBy,
                sortOrder,
                selectedShopId === "all" ? undefined : selectedShopId,
                statusFilter,
            ),
        placeholderData: keepPreviousData,
        initialData:
            page === 1 &&
                debouncedSearch === "" &&
                sortBy === "name" &&
                sortOrder === "asc" &&
                selectedShopId === "all" &&
                statusFilter === "active"
                ? initialData
                : undefined,
    });

    const employees = data?.data || [];
    const totalPages = data?.totalPages || 1;
    const totalCount = data?.totalCount || 0;

    const handleSort = (column: string) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortBy(column);
            setSortOrder("asc");
        }
    };

    const getSortIcon = (column: string) => {
        if (sortBy !== column) {
            return (
                <ArrowUpDown className="w-3 h-3 ml-1 opacity-40 group-hover:opacity-100 transition-opacity" />
            );
        }
        return sortOrder === "asc" ? (
            <ArrowUp className="w-3 h-3 ml-1 text-sky-400" />
        ) : (
            <ArrowDown className="w-3 h-3 ml-1 text-sky-400" />
        );
    };

    const copyMatricule = (matricule: string) => {
        navigator.clipboard.writeText(matricule);
        setCopiedId(matricule);
        toast.success(`Matricule ${matricule} copié !`);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Statistiques rapides sur le jeu de données actuel
    const activeCount = useMemo(
        () => (statusFilter === "active" ? totalCount : employees.filter((e) => e.is_active).length),
        [statusFilter, totalCount, employees],
    );

    return (
        <div>
            {/* Header unifié new-ui */}
            <ReportPageHeader
                title="Annuaire des Collaborateurs"
                subtitle="Personnel de vente, affectations boutiques, fiches de paie et dossiers"
                badge={{ label: `${totalCount} agent${totalCount > 1 ? "s" : ""}`, tone: "sky" }}
                isLoading={isFetching}
                onRefresh={async () => {
                    await refetch();
                    toast.success("Annuaire actualisé");
                }}
                extraActions={
                    canEdit ? (
                        <Button
                            size="sm"
                            onClick={() => {
                                setSelectedEmployee(undefined);
                                setIsDrawerOpen(true);
                            }}
                            className="h-7 px-2.5 text-[11px] gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-medium"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Nouvel Agent</span>
                        </Button>
                    ) : undefined
                }
            >
                {/* Barre de filtres intégrée au header */}
                <div className="flex flex-wrap items-center gap-1.5">
                    {/* Recherche texte */}
                    <div className="relative w-56 sm:w-64">
                        <Search className="w-3 h-3 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(1);
                            }}
                            placeholder="Rechercher nom, matricule, poste..."
                            className="w-full h-7 pl-7 pr-7 rounded-lg border border-border bg-secondary/60 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => {
                                    setSearchTerm("");
                                    setPage(1);
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <FilterX className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Filtre Boutique */}
                    <Select
                        value={selectedShopId}
                        onValueChange={(val) => {
                            setSelectedShopId(val);
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className={cn(selectClass, "w-[160px]")}>
                            <Store className="w-3 h-3 text-muted-foreground shrink-0" />
                            <SelectValue placeholder="Toutes boutiques" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-xs">
                                Toutes les boutiques
                            </SelectItem>
                            {shops.map((shop) => (
                                <SelectItem key={shop.id} value={shop.id} className="text-xs">
                                    {shop.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Filtre Statut */}
                    <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
                        {(
                            [
                                { id: "active", label: "Actifs" },
                                { id: "all", label: "Tous" },
                                { id: "inactive", label: "Inactifs" },
                            ] as const
                        ).map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => {
                                    setStatusFilter(tab.id);
                                    setPage(1);
                                }}
                                className={cn(
                                    "px-2 py-0.5 rounded-md text-[10.5px] font-medium transition-colors",
                                    statusFilter === tab.id
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </ReportPageHeader>

            <div className="p-4 sm:p-5 space-y-4">
                {/* Cartes KPI new-ui */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <CeoKpiCard
                        label="Total Effectif"
                        value={String(totalCount)}
                        subtitle={`${shops.length} boutique(s) configurée(s)`}
                        icon={<Users className="w-3.5 h-3.5" />}
                        iconColor="text-sky-600 dark:text-sky-400"
                        iconBg="bg-sky-50 dark:bg-sky-950/40"
                    />
                    <CeoKpiCard
                        label="Agents Actifs"
                        value={String(activeCount)}
                        subtitle="Sous contrat en activité"
                        icon={<UserCheck className="w-3.5 h-3.5" />}
                        iconColor="text-emerald-600 dark:text-emerald-400"
                        iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                    />
                    <CeoKpiCard
                        label="Boutique Sélectionnée"
                        value={
                            selectedShopId === "all"
                                ? "Toutes"
                                : shops.find((s) => s.id === selectedShopId)?.name || "—"
                        }
                        subtitle="Filtre d'affectation"
                        icon={<Store className="w-3.5 h-3.5" />}
                        iconColor="text-violet-600 dark:text-violet-400"
                        iconBg="bg-violet-50 dark:bg-violet-950/40"
                    />
                    <CeoKpiCard
                        label="Page en cours"
                        value={`${page} / ${totalPages}`}
                        subtitle={`${employees.length} affichés sur cette page`}
                        icon={<Briefcase className="w-3.5 h-3.5" />}
                        iconColor="text-amber-600 dark:text-amber-400"
                        iconBg="bg-amber-50 dark:bg-amber-950/40"
                    />
                </div>

                {/* Section Tableau */}
                <ReportSection
                    index={1}
                    title={`Liste des Collaborateurs (${totalCount})`}
                >
                    <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table className="w-full text-[11px]">
                                <TableHeader className={HEADER_BG}>
                                    <TableRow className={cn("border-none", HEADER_BG)}>
                                        <TableHead
                                            onClick={() => handleSort("name")}
                                            className={cn(
                                                "py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider text-left cursor-pointer hover:text-sky-300 select-none min-w-[220px]",
                                                HEADER_BG,
                                            )}
                                        >
                                            <div className="flex items-center">
                                                <span>Agent</span>
                                                {getSortIcon("name")}
                                            </div>
                                        </TableHead>

                                        <TableHead
                                            onClick={() => handleSort("matricule")}
                                            className={cn(
                                                "py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider text-left cursor-pointer hover:text-sky-300 select-none min-w-[120px]",
                                                HEADER_BG,
                                            )}
                                        >
                                            <div className="flex items-center">
                                                <span>Matricule</span>
                                                {getSortIcon("matricule")}
                                            </div>
                                        </TableHead>

                                        <TableHead className={cn("py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider text-left min-w-[180px]", HEADER_BG)}>
                                            Poste &amp; Département
                                        </TableHead>

                                        <TableHead className={cn("py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider text-left min-w-[140px]", HEADER_BG)}>
                                            Boutique
                                        </TableHead>

                                        <TableHead className={cn("py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider text-center min-w-[90px]", HEADER_BG)}>
                                            Statut
                                        </TableHead>

                                        <TableHead className={cn("py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider text-right min-w-[90px] pr-4", HEADER_BG)}>
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody className="divide-y divide-border/40">
                                    {isLoading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i} className="animate-pulse">
                                                <TableCell className="py-2.5 px-3">
                                                    <div className="h-8 w-44 rounded bg-muted/60" />
                                                </TableCell>
                                                <TableCell className="py-2.5 px-3">
                                                    <div className="h-4 w-20 rounded bg-muted/60" />
                                                </TableCell>
                                                <TableCell className="py-2.5 px-3">
                                                    <div className="h-6 w-32 rounded bg-muted/60" />
                                                </TableCell>
                                                <TableCell className="py-2.5 px-3">
                                                    <div className="h-4 w-24 rounded bg-muted/60" />
                                                </TableCell>
                                                <TableCell className="py-2.5 px-3 text-center">
                                                    <div className="h-5 w-14 rounded-full bg-muted/60 mx-auto" />
                                                </TableCell>
                                                <TableCell className="py-2.5 px-3 text-right">
                                                    <div className="h-6 w-6 rounded bg-muted/60 ml-auto" />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : employees.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-40 text-center">
                                                <div className="flex flex-col items-center justify-center space-y-1.5 text-muted-foreground">
                                                    <UserX className="w-7 h-7 opacity-40" />
                                                    <p className="text-xs font-semibold text-foreground">
                                                        Aucun collaborateur trouvé
                                                    </p>
                                                    <p className="text-[11px]">
                                                        Modifiez vos critères de recherche ou réinitialisez les filtres.
                                                    </p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        employees.map((emp) => {
                                            const initials = emp.name
                                                .split(" ")
                                                .map((n) => n[0])
                                                .slice(0, 2)
                                                .join("")
                                                .toUpperCase();

                                            return (
                                                <TableRow
                                                    key={emp.id}
                                                    className="hover:bg-accent/30 transition-colors border-b border-border/40"
                                                >
                                                    {/* Nom + Avatar + Contacts */}
                                                    <TableCell className="py-2 px-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <Avatar className="h-8 w-8 border border-border shrink-0">
                                                                <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                                                    {initials}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0">
                                                                <Link
                                                                    href={`/hr/employees/${emp.id}`}
                                                                    className="text-xs font-semibold text-foreground hover:text-primary hover:underline truncate block"
                                                                >
                                                                    {emp.name}
                                                                </Link>
                                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                                                    {emp.service_phone && (
                                                                        <span className="flex items-center gap-0.5">
                                                                            <Phone className="w-2.5 h-2.5" />
                                                                            {emp.service_phone}
                                                                        </span>
                                                                    )}
                                                                    {emp.email && (
                                                                        <span className="hidden md:flex items-center gap-0.5 truncate max-w-[150px]">
                                                                            <Mail className="w-2.5 h-2.5" />
                                                                            {emp.email}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    {/* Matricule avec copie rapide */}
                                                    <TableCell className="py-2 px-3">
                                                        {emp.matricule ? (
                                                            <div
                                                                onClick={() => copyMatricule(emp.matricule!)}
                                                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/50 border border-border/60 text-[11px] font-mono cursor-pointer hover:bg-accent hover:border-border transition-colors group/mat"
                                                                title="Cliquer pour copier le matricule"
                                                            >
                                                                <span>{emp.matricule}</span>
                                                                {copiedId === emp.matricule ? (
                                                                    <Check className="w-3 h-3 text-emerald-500" />
                                                                ) : (
                                                                    <Copy className="w-3 h-3 text-muted-foreground opacity-30 group-hover/mat:opacity-100 transition-opacity" />
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground/40">—</span>
                                                        )}
                                                    </TableCell>

                                                    {/* Poste & Département */}
                                                    <TableCell className="py-2 px-3">
                                                        <p className="font-medium text-foreground text-[11px]">
                                                            {emp.job_title || "Conseiller de Vente"}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground">
                                                            {emp.department || "Boutique"}
                                                        </p>
                                                    </TableCell>

                                                    {/* Boutique d'affectation */}
                                                    <TableCell className="py-2 px-3">
                                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                                            <Store className="w-3 h-3 text-sky-600 shrink-0" />
                                                            <span className="truncate max-w-[130px] text-foreground font-medium">
                                                                {emp.shops?.name || "Non assigné"}
                                                            </span>
                                                        </div>
                                                    </TableCell>

                                                    {/* Statut Actif / Inactif */}
                                                    <TableCell className="py-2 px-3 text-center">
                                                        {emp.is_active ? (
                                                            <Badge
                                                                variant="outline"
                                                                className="h-5 px-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60 gap-1"
                                                            >
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                Actif
                                                            </Badge>
                                                        ) : (
                                                            <Badge
                                                                variant="outline"
                                                                className="h-5 px-1.5 text-[10px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/60 gap-1"
                                                            >
                                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                                Inactif
                                                            </Badge>
                                                        )}
                                                    </TableCell>

                                                    {/* Menu Actions Contextuelles */}
                                                    <TableCell className="py-2 px-3 text-right pr-4">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                                >
                                                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </DropdownMenuTrigger>

                                                            <DropdownMenuContent align="end" className="w-48 text-xs">
                                                                <DropdownMenuLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                                                                    Actions Collaborateur
                                                                </DropdownMenuLabel>
                                                                <DropdownMenuSeparator />

                                                                <DropdownMenuItem asChild>
                                                                    <Link
                                                                        href={`/hr/employees/${emp.id}`}
                                                                        className="gap-2 cursor-pointer flex items-center"
                                                                    >
                                                                        <Folder className="w-3.5 h-3.5 text-primary" />
                                                                        <span>Dossier Collaborateur</span>
                                                                    </Link>
                                                                </DropdownMenuItem>

                                                                {canEdit && (
                                                                    <DropdownMenuItem
                                                                        onClick={() => {
                                                                            setSelectedEmployee(emp);
                                                                            setIsDrawerOpen(true);
                                                                        }}
                                                                        className="gap-2 cursor-pointer"
                                                                    >
                                                                        <Pencil className="w-3.5 h-3.5" />
                                                                        <span>Modifier la fiche</span>
                                                                    </DropdownMenuItem>
                                                                )}

                                                                {emp.matricule && (
                                                                    <DropdownMenuItem
                                                                        onClick={() => copyMatricule(emp.matricule!)}
                                                                        className="gap-2 cursor-pointer"
                                                                    >
                                                                        <Copy className="w-3.5 h-3.5" />
                                                                        <span>Copier le matricule</span>
                                                                    </DropdownMenuItem>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination new-ui */}
                        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-2.5 border-t border-border/60 bg-muted/20 gap-2 text-[11px] text-muted-foreground">
                            <span>
                                Affichage de <strong className="text-foreground">{employees.length}</strong> sur{" "}
                                <strong className="text-foreground">{totalCount}</strong> agents
                            </span>

                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page === 1 || isFetching}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    className="h-7 px-2 text-[11px] gap-1"
                                >
                                    <ChevronLeft className="w-3 h-3" />
                                    <span>Précédent</span>
                                </Button>

                                <span className="font-mono px-2 text-foreground font-semibold">
                                    {page} / {totalPages}
                                </span>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page >= totalPages || isFetching}
                                    onClick={() => setPage((p) => p + 1)}
                                    className="h-7 px-2 text-[11px] gap-1"
                                >
                                    <span>Suivant</span>
                                    <ChevronRight className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </ReportSection>
            </div>

            {/* Tiroir de création / modification d'agent */}
            <EmployeeFormDrawer
                key={selectedEmployee?.id || "new-employee"}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                shops={shops as any}
                initialData={selectedEmployee}
            />
        </div>
    );
}