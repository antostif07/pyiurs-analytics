"use client";

import React, { useState, useEffect } from "react";
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
    FilterX
} from "lucide-react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getEmployees, getShops } from "../actions";
import { EmployeeWithShop } from "@/lib/supabase/types";
import EmployeeFormDrawer from "../_components/employee-form-drawer";

// ✅ Composants Shadcn UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";

interface EmployeesClientProps {
    initialData: {
        data: EmployeeWithShop[];
        totalCount: number;
        totalPages: number;
        currentPage: number;
    };
}

export default function EmployeesClient({ initialData }: EmployeesClientProps) {
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [sortBy, setSortBy] = useState("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [selectedShopId, setSelectedShopId] = useState<string>("all");

    // ✅ État du filtre Statut (Par défaut: 'active')
    const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");

    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithShop | undefined>(undefined);

    // Debounce de recherche textuelle (300ms)
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // 1. Récupération des boutiques via TanStack Query (Mise en cache 1h)
    const { data: shops = [] } = useQuery({
        queryKey: ["shops-list"],
        queryFn: async () => {
            const res = await getShops();
            return res || [];
        },
        staleTime: 1000 * 60 * 60,
    });

    // 2. Récupération paginée et filtrée des employés
    const { data, isFetching, isLoading } = useQuery({
        queryKey: ["employees", page, debouncedSearch, sortBy, sortOrder, selectedShopId, statusFilter],
        queryFn: () =>
            getEmployees(
                page,
                10,
                debouncedSearch,
                sortBy,
                sortOrder,
                selectedShopId === "all" ? undefined : selectedShopId,
                statusFilter
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
        if (sortBy !== column) return <ArrowUpDown className="w-3.5 h-3.5 ml-1.5 opacity-40 group-hover:opacity-100 transition-opacity" />;
        return sortOrder === "asc" ? (
            <ArrowUp className="w-3.5 h-3.5 ml-1.5 text-primary" />
        ) : (
            <ArrowDown className="w-3.5 h-3.5 ml-1.5 text-primary" />
        );
    };

    const copyMatricule = (matricule: string) => {
        navigator.clipboard.writeText(matricule);
        setCopiedId(matricule);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="space-y-6">
            {/* Entête de page avec Bouton Action Principal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Annuaire des Agents
                        </h1>
                        <Badge variant="secondary" className="font-mono text-xs font-semibold">
                            {totalCount} {totalCount > 1 ? "agents" : "agent"}
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Gestion du personnel de vente, profils boutique, spécialités et affectations.
                    </p>
                </div>

                <Button
                    onClick={() => {
                        setSelectedEmployee(undefined);
                        setIsDrawerOpen(true);
                    }}
                    className="gap-2 shadow-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    <span>Nouvel Agent</span>
                </Button>
            </div>

            {/* Barre d'Outils : Recherche & Filtre par Boutique */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
                {/* Recherche Textuelle */}
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                    <Input
                        placeholder="Rechercher par nom, matricule, poste..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setPage(1);
                        }}
                        className="pl-9 pr-9 bg-card text-xs h-9 focus-visible:ring-1"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => {
                                setSearchTerm("");
                                setPage(1);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <FilterX className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Filtre Sélecteur de Boutique */}
                <div className="w-full sm:w-64">
                    <Select
                        value={selectedShopId}
                        onValueChange={(val) => {
                            setSelectedShopId(val);
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="h-9 text-xs bg-card">
                            <SelectValue placeholder="Toutes les boutiques" />
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
                </div>
            </div>

            {/* Tableau des Employés (Shadcn Table) */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead
                                onClick={() => handleSort("name")}
                                className="cursor-pointer select-none font-semibold text-xs text-foreground/80 hover:text-foreground group"
                            >
                                <div className="flex items-center">
                                    <span>Agent</span>
                                    {getSortIcon("name")}
                                </div>
                            </TableHead>

                            <TableHead
                                onClick={() => handleSort("matricule")}
                                className="cursor-pointer select-none font-semibold text-xs text-foreground/80 hover:text-foreground group"
                            >
                                <div className="flex items-center">
                                    <span>Matricule</span>
                                    {getSortIcon("matricule")}
                                </div>
                            </TableHead>

                            <TableHead className="font-semibold text-xs text-foreground/80">Poste & Département</TableHead>
                            <TableHead className="font-semibold text-xs text-foreground/80">Boutique</TableHead>
                            <TableHead className="font-semibold text-xs text-foreground/80">Statut</TableHead>
                            <TableHead className="text-right font-semibold text-xs text-foreground/80 pr-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {isLoading ? (
                            // État de chargement élégant (Skeletons)
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-10 w-44 rounded-lg" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></TableCell>
                                </TableRow>
                            ))
                        ) : employees.length === 0 ? (
                            // État Vide
                            <TableRow>
                                <TableCell colSpan={6} className="h-48 text-center">
                                    <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                                        <UserX className="w-8 h-8 opacity-40" />
                                        <p className="text-sm font-medium text-foreground">Aucun agent trouvé</p>
                                        <p className="text-xs">Modifiez vos critères de recherche ou ajoutez un nouveau profil.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            // Liste des Employés
                            employees.map((emp) => {
                                const initials = emp.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .slice(0, 2)
                                    .join("")
                                    .toUpperCase();

                                return (
                                    <TableRow key={emp.id} className="hover:bg-muted/40 transition-colors group">
                                        {/* Nom + Avatar + Contacts */}
                                        <TableCell className="py-3 font-medium">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 border border-border shrink-0">
                                                    <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                                                        {initials}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-foreground truncate">{emp.name}</p>
                                                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5 font-light">
                                                        {emp.service_phone && (
                                                            <span className="flex items-center gap-1 hover:text-foreground">
                                                                <Phone className="w-3 h-3" /> {emp.service_phone}
                                                            </span>
                                                        )}
                                                        {emp.email && (
                                                            <span className="hidden md:flex items-center gap-1 hover:text-foreground truncate max-w-[150px]">
                                                                <Mail className="w-3 h-3" /> {emp.email}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Matricule avec copie rapide */}
                                        <TableCell className="py-3">
                                            <div
                                                onClick={() => emp.matricule && copyMatricule(emp.matricule)}
                                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50 border border-border/60 text-xs font-mono cursor-pointer hover:bg-accent transition-colors group/mat"
                                                title="Cliquer pour copier le matricule"
                                            >
                                                <span>{emp.matricule || "—"}</span>
                                                {copiedId === emp.matricule ? (
                                                    <Check className="w-3 h-3 text-emerald-500" />
                                                ) : (
                                                    <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover/mat:opacity-100 transition-opacity" />
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Poste & Département */}
                                        <TableCell className="py-3">
                                            <div>
                                                <p className="text-xs font-medium text-foreground">{emp.job_title || "Conseiller de Vente"}</p>
                                                <p className="text-[11px] text-muted-foreground font-light">{emp.department || "Boutique"}</p>
                                            </div>
                                        </TableCell>

                                        {/* Boutique d'affectation */}
                                        <TableCell className="py-3">
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <Store className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                                                <span className="truncate max-w-[140px] text-foreground font-light">
                                                    {emp.shops?.name || "Non assigné"}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* Statut Actif / Inactif */}
                                        <TableCell className="py-3">
                                            {emp.is_active ? (
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-semibold gap-1"
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    Actif
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-rose-500/10 text-rose-500 border-rose-500/20 text-[10px] font-semibold gap-1"
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                    Inactif
                                                </Badge>
                                            )}
                                        </TableCell>

                                        {/* Menu Actions Contextuelles (Shadcn Dropdown) */}
                                        <TableCell className="py-3 text-right pr-4">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                    >
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>

                                                <DropdownMenuContent align="end" className="w-48 text-xs">
                                                    <DropdownMenuLabel>Actions Agent</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />

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

                {/* Pied de tableau & Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-3.5 border-t border-border bg-muted/20 gap-3">
                    <p className="text-xs text-muted-foreground">
                        Affichage de <span className="font-medium text-foreground">{employees.length}</span> sur{" "}
                        <span className="font-medium text-foreground">{totalCount}</span> agents
                    </p>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 1 || isFetching}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="h-8 px-2.5 text-xs gap-1"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span>Précédent</span>
                        </Button>

                        <span className="text-xs font-mono font-medium px-2">
                            {page} / {totalPages}
                        </span>

                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages || isFetching}
                            onClick={() => setPage((p) => p + 1)}
                            className="h-8 px-2.5 text-xs gap-1"
                        >
                            <span>Suivant</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tiroir de création / modification d'agent */}
            <EmployeeFormDrawer
                key={selectedEmployee?.id || "new-employee"}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                shops={shops}
                initialData={selectedEmployee}
            />
        </div>
    );
}