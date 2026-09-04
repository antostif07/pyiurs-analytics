"use client";

import React, { useMemo, useState, useTransition, useEffect, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
    Download,
    Calendar,
    Store,
    User as UserIcon,
    Loader2,
    RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { MONTHS } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

// ✅ Composants Shadcn UI
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import AttendanceTable from "../_components/attendance-table";
import { AttendanceStats } from "../_components/attendance-stats";
import { generateAttendancePDF } from "../_components/attendance-pdf";
import { AttendanceWithEmployee, ProfileRow, ShopRow } from "@/lib/supabase/types";

export interface AttendanceClientProps {
    initialData: {
        attendances: AttendanceWithEmployee[];
        stats?: Record<string, unknown>;
    };
    currentUser?: User | null;
    userProfile?: Pick<ProfileRow, "id" | "full_name" | "email" | "role" | "assigned_shops"> | null;
    currentMonth: string;
    currentYear: string;
    currentShop?: string;
    shops: Pick<ShopRow, "id" | "name">[];
}

export default function AttendanceClient({
    initialData,
    currentUser,
    userProfile,
    currentMonth,
    currentYear,
    currentShop = "all",
    shops,
}: AttendanceClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [isPending, startTransition] = useTransition();
    const [selectedAgentId, setSelectedAgentId] = useState<string>("all");
    const [isExporting, setIsExporting] = useState<boolean>(false);

    // Génération dynamique des années disponibles (-5 ans à +1 an)
    const currentYearNum = new Date().getFullYear();
    const yearOptions = useMemo(
        () => Array.from({ length: 7 }, (_, i) => String(currentYearNum - 5 + i)),
        [currentYearNum]
    );

    // 1. Réinitialisation de l'agent si la boutique change
    useEffect(() => {
        setSelectedAgentId("all");
    }, [currentShop]);

    // 2. Mise à jour fluide des filtres d'URL (SSR-Friendly & sans saut de scroll)
    const updateFilter = useCallback(
        (key: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value && value !== "all") {
                params.set(key, value);
            } else if (key === "shopId" && value === "all") {
                params.set("shopId", "all");
            } else {
                params.delete(key);
            }

            startTransition(() => {
                router.replace(`${pathname}?${params.toString()}`, { scroll: false });
            });
        },
        [pathname, router, searchParams]
    );

    // 3. Liste unique des agents présents dans les données actuelles
    const agentsList = useMemo(() => {
        const map = new Map<string, string>();
        (initialData?.attendances || []).forEach((item) => {
            if (item.employees?.id && item.employees?.name) {
                map.set(item.employees.id, item.employees.name);
            }
        });
        return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
    }, [initialData?.attendances]);

    const selectedAgentName = useMemo(() => {
        if (selectedAgentId === "all") return "Tous les agents";
        return agentsList.find(([id]) => id === selectedAgentId)?.[1] || "";
    }, [selectedAgentId, agentsList]);

    // 4. Export PDF Sécurisé avec retour tactile Sonner
    const handleExportPDF = async () => {
        try {
            setIsExporting(true);

            const filteredData = (initialData?.attendances || []).filter((row) => {
                if (selectedAgentId === "all") return true;
                return row.employees?.id === selectedAgentId;
            });

            if (filteredData.length === 0) {
                toast.error("Aucune donnée disponible pour les filtres sélectionnés.");
                return;
            }

            const monthLabel = MONTHS.find((m) => m.val === currentMonth)?.label || currentMonth;
            const shopLabel =
                currentShop === "all"
                    ? "Toutes les boutiques"
                    : shops.find((s) => s.id === currentShop)?.name || "Boutique";

            await generateAttendancePDF(
                filteredData,
                monthLabel,
                currentYear,
                shopLabel,
                selectedAgentName
            );

            toast.success("Rapport PDF généré avec succès.");
        } catch (error: unknown) {
            console.error("Erreur lors de l'export PDF:", error);
            toast.error("Échec de la génération du rapport PDF.");
        } finally {
            setIsExporting(false);
        }
    };

    const hasActiveFilters = currentShop !== "all" || selectedAgentId !== "all";

    return (
        <div className="space-y-6 w-full">
            {/* 1. SECTION KPIS & STATISTIQUES MENSUELLES (Plein Écran) */}
            <AttendanceStats data={initialData?.attendances || []} />

            {/* 2. BARRE D'OUTILS DE FILTRAGE & CONTRÔLE SHADCN */}
            <div className="bg-card border border-border/80 p-3.5 rounded-xl shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                {/* Filtres de Navigation */}
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                    {/* Sélecteur de Boutique */}
                    <div className="w-full sm:w-56">
                        <Select value={currentShop} onValueChange={(val) => updateFilter("shopId", val)}>
                            <SelectTrigger className="h-9 text-xs bg-background">
                                <div className="flex items-center gap-2 truncate">
                                    <Store className="w-3.5 h-3.5 text-primary/80 shrink-0" />
                                    <SelectValue placeholder="Toutes les boutiques" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="z-[80]">
                                <SelectItem value="all" className="text-xs font-medium">
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

                    <Separator orientation="vertical" className="h-5 hidden sm:block mx-0.5 opacity-60" />

                    {/* Sélecteur Mois */}
                    <div className="w-[145px]">
                        <Select value={currentMonth} onValueChange={(val) => updateFilter("month", val)}>
                            <SelectTrigger className="h-9 text-xs bg-background">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    <SelectValue />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="z-[80]">
                                {Array.from({ length: 12 }).map((_, i) => {
                                    const m = String(i + 1).padStart(2, "0");
                                    const label = new Date(2000, i).toLocaleString("fr-FR", { month: "long" });
                                    return (
                                        <SelectItem key={m} value={m} className="text-xs capitalize">
                                            {label}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Sélecteur Année */}
                    <div className="w-[95px]">
                        <Select value={currentYear} onValueChange={(val) => updateFilter("year", val)}>
                            <SelectTrigger className="h-9 text-xs bg-background font-mono">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[80]">
                                {yearOptions.map((y) => (
                                    <SelectItem key={y} value={y} className="text-xs font-mono">
                                        {y}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Filtre par Agent Spécifique */}
                    <div className="w-full sm:w-56">
                        <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                            <SelectTrigger className="h-9 text-xs bg-background">
                                <div className="flex items-center gap-2 truncate">
                                    <UserIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    <SelectValue placeholder="Tous les agents" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="z-[80]">
                                <SelectItem value="all" className="text-xs font-medium">
                                    Tous les agents ({agentsList.length})
                                </SelectItem>
                                {agentsList.map(([id, name]) => (
                                    <SelectItem key={id} value={id} className="text-xs">
                                        {name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Bouton Réinitialiser si filtres actifs */}
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                updateFilter("shopId", "all");
                                setSelectedAgentId("all");
                            }}
                            className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                            title="Réinitialiser les filtres"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Réinitialiser</span>
                        </Button>
                    )}

                    {/* Indicateur de chargement discret lors du changement de filtres */}
                    {isPending && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-2 animate-pulse">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                            <span className="font-light">Actualisation...</span>
                        </div>
                    )}
                </div>

                {/* Action Export PDF */}
                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportPDF}
                        disabled={isExporting || isPending}
                        className="h-9 text-xs gap-2 border-border shadow-xs hover:bg-muted font-medium"
                    >
                        {isExporting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                        ) : (
                            <Download className="w-3.5 h-3.5 text-primary" />
                        )}
                        <span>
                            Exporter {selectedAgentId !== "all" ? "Fiche Individuelle" : "Registre Mensuel"}
                        </span>
                    </Button>
                </div>
            </div>

            {/* 3. MATRICE COMPLÈTE DES POINTAGES (TABLEAU CALENDRIER) */}
            <div
                className={`transition-opacity duration-200 ${isPending ? "opacity-60 pointer-events-none" : "opacity-100"
                    }`}
            >
                <AttendanceTable
                    key={`${currentMonth}-${currentYear}-${currentShop}`}
                    initialData={initialData?.attendances || []}
                    currentUser={currentUser}
                    userProfile={userProfile}
                    selectedAgentId={selectedAgentId}
                    currentMonth={currentMonth}
                    currentYear={currentYear}
                />
            </div>
        </div>
    );
}