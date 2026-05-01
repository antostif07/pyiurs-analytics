"use client";

import { useState, useEffect } from "react";
import { Search, MoreHorizontal, Mail, Phone, ChevronLeft, ChevronRight, Store, ArrowUpDown, ArrowUp, ArrowDown, Plus, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getEmployees, getShops } from "../actions";
import { EmployeeWithShop } from "@/lib/supabase/types";
import EmployeeFormDrawer from "../_components/employee-form-drawer";

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

    // Drawer States
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithShop | undefined>(undefined);
    const [shops, setShops] = useState<{id: string, name: string}[]>([]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        getShops().then(setShops);
    }, []);

    const { data, isFetching } = useQuery({
        queryKey: ["employees", page, debouncedSearch, sortBy, sortOrder],
        queryFn: () => getEmployees(page, 10, debouncedSearch, sortBy, sortOrder),
        placeholderData: keepPreviousData,
        initialData: (page === 1 && debouncedSearch === "" && sortBy === "name" && sortOrder === "asc") ? initialData : undefined,
    });

    const employees = data?.data || [];
    const totalPages = data?.totalPages || 1;
    const totalCount = data?.totalCount || 0;

    const handleSort = (column: string) => {
        if (sortBy === column) { setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }
        else { setSortBy(column); setSortOrder("asc"); }
    };

    return (
        <div className="space-y-6">
            {/* Header intégré pour gérer l'ouverture du drawer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Annuaire des Agents</h1>
                    <p className="text-sm text-muted-foreground mt-1">Gérez les profils, les contrats et les informations de contact.</p>
                </div>
                <button 
                    onClick={() => { setSelectedEmployee(undefined); setIsDrawerOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" /> Nouvel Agent
                </button>
            </div>

            {/* Barre de recherche */}
            <div className="flex items-center gap-4 bg-card p-2 rounded-lg border shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Rechercher un agent..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                        className="w-full pl-9 pr-4 py-2 bg-transparent border-none focus:outline-none text-sm"
                    />
                    {isFetching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
                </div>
            </div>

            {/* Table */}
            <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
                <div className={`overflow-x-auto transition-opacity ${isFetching ? "opacity-60" : "opacity-100"}`}>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground border-b uppercase text-xs font-semibold">
                            <tr>
                                <th onClick={() => handleSort("name")} className="px-6 py-4 cursor-pointer hover:text-foreground">Agent</th>
                                <th onClick={() => handleSort("matricule")} className="px-6 py-4 cursor-pointer hover:text-foreground">Matricule</th>
                                <th className="px-6 py-4">Poste / Dépt</th>
                                <th className="px-6 py-4">Affectation</th>
                                <th className="px-6 py-4">Statut</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {employees.map((emp) => (
                                <motion.tr key={emp.id} layout className="hover:bg-muted/30 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-foreground">{emp.name}</td>
                                    <td className="px-6 py-4 text-muted-foreground">{emp.matricule}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-foreground">{emp.job_title}</div>
                                        <div className="text-muted-foreground text-xs">{emp.department}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2"><Store className="w-3.5 h-3.5 text-muted-foreground" /> {emp.shops?.name || "Non assigné"}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${emp.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
                                            {emp.is_active ? "Actif" : "Inactif"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => { setSelectedEmployee(emp); setIsDrawerOpen(true); }}
                                            className="p-2 hover:bg-primary/10 hover:text-primary rounded-md transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/10">
                    <p className="text-xs text-muted-foreground">Total: {totalCount} agents</p>
                    <div className="flex items-center gap-2">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1 border rounded disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                        <span className="text-xs font-medium">Page {page} / {totalPages}</span>
                        <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1 border rounded disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>

            {/* Le Drawer */}
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