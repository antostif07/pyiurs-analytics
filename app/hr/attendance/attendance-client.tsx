"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, Filter, Download, FileDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AttendanceTable from "../_components/attendance-table";
import { AttendanceStats } from "../_components/attendance-stats";
import { generateAttendancePDF } from "../_components/attendance-pdf";
import { toast } from "sonner";
import { MONTHS } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function AttendanceClient({ initialData, currentUser, currentMonth, currentYear, currentShop, shops }: {initialData: any, currentUser: any, currentMonth: string, currentYear: string, currentShop?: string, shops: {id: string, name: string}[]}) {
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();
    const [selectedAgentId, setSelectedAgentId] = useState("all");

    // Génération des années (Actuelle - 10 ans)
    const currentYearNum = new Date().getFullYear();
    const yearOptions = Array.from({ length: 11 }, (_, i) => String(currentYearNum - i));

    // Fonction pour mettre à jour les filtres via l'URL
    const updateFilter = (key: string, value: string) => {
        const params = new URLSearchParams(window.location.search);
        params.set(key, value);
        startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
        });
    };

    const selectedAgentName = useMemo(() => {
        if (selectedAgentId === "all") return "Tous les agents";
        const agent = initialData.attendances.find((a: any) => a.employees.id === selectedAgentId);
        return agent?.employees?.name || "";
    }, [selectedAgentId, initialData.attendances]);

    const handleExportPDF = () => {
        // 1. Filtrer les données selon les sélections actuelles de l'utilisateur
        const filteredData = initialData.attendances.filter((row: any) => {
            const matchAgent = selectedAgentId === "all" ? true : row.employees.id === selectedAgentId;
            // Le shop est déjà filtré côté serveur via l'URL, donc pas besoin de refiltrer ici
            return matchAgent;
        });

        if (filteredData.length === 0) {
            toast.error("Aucune donnée à exporter pour ces filtres.");
            return;
        }

        // 2. Récupérer les labels
        const monthLabel = MONTHS.find(m => m.val === currentMonth)?.label || currentMonth;
        const shopLabel = currentShop === "all" 
            ? "Toutes les boutiques" 
            : shops.find((s: any) => s.id === currentShop)?.name || "Boutique";

        // 3. Lancer la génération
        generateAttendancePDF(
            filteredData, 
            monthLabel, 
            currentYear, 
            shopLabel, 
            selectedAgentName
        );

        toast.success("Le rapport PDF a été généré.");
    };

  const agentsList = useMemo(() => {
    const map = new Map();
    initialData.attendances.forEach((a: any) => {
      if (!map.has(a.employees.id)) {
        map.set(a.employees.id, a.employees.name);
      }
    });
    return Array.from(map.entries());
  }, [initialData.attendances])

  return (
    <div className="space-y-6">
      {/* Barre de Filtres & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
            <AttendanceStats data={initialData.attendances} />
        </div>
        
        <div className="lg:col-span-4 bg-card p-4 rounded-[24px] border shadow-sm space-y-4">
            <div className="flex gap-2">
                {/* Sélecteur de Shop */}
                <Select value={currentShop} onValueChange={(val) => updateFilter("shopId", val)}>
                    <SelectTrigger className="rounded-xl font-bold text-xs h-10 border-emerald-100 bg-emerald-50/30">
                        <SelectValue placeholder="Toutes les boutiques" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Toutes les boutiques</SelectItem>
                        {shops.map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex gap-2">
                <Select value={currentMonth} onValueChange={(val) => updateFilter("month", val)}>
                    <SelectTrigger className="rounded-xl font-bold text-xs h-10">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {Array.from({ length: 12 }).map((_, i) => {
                            const m = String(i + 1).padStart(2, '0');
                            return <SelectItem key={m} value={m}>
                                {new Date(2000, i).toLocaleString('fr-FR', { month: 'long' })}
                            </SelectItem>
                        })}
                    </SelectContent>
                </Select>

                <Select value={currentYear} onValueChange={(val) => updateFilter("year", val)}>
                    <SelectTrigger className="rounded-xl font-bold text-xs h-10 w-[120px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {yearOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger className="rounded-xl text-xs h-10 bg-muted/30">
                    <SelectValue placeholder="Filtrer par agent..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Tous les agents</SelectItem>
                    {agentsList.map(([id, name]) => (
                        <SelectItem key={id} value={id}>{name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button 
                    variant="outline" 
                    onClick={handleExportPDF}
                    className="rounded-xl border-emerald-200 text-emerald-700 bg-emerald-50/20 hover:bg-emerald-50"
                >
                    <Download className="w-4 h-4 mr-2" />
                    Exporter Rapport {selectedAgentId !== "all" ? "Individuel" : "Boutique"}
                </Button>
        </div>
      </div>

      {/* Table de Validation */}
      <div className={isPending ? "opacity-50 pointer-events-none transition-opacity" : ""}>
        <AttendanceTable 
            key={`${currentMonth}-${currentYear}-${currentShop}`}
            initialData={initialData.attendances} 
            currentUser={currentUser}
            selectedAgentId={selectedAgentId}
        />
      </div>
    </div>
  );
}