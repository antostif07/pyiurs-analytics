"use client";

import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ShieldCheck, Store, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { ATTENDANCE_LABELS, AttendanceStatus } from "@/lib/supabase/types";
import { updateAttendanceValidation } from "../actions";

export default function AttendanceTable({ initialData, currentUser, selectedAgentId = "all" }: any) {
  const [data, setData] = useState(initialData);
  const [currentPage, setCurrentPage] = useState(1);
  
  // 💡 NOUVEAU : État pour mémoriser le choix du statut par ligne avant validation
  const [pendingStatuses, setPendingStatuses] = useState<Record<string, AttendanceStatus>>({});
  
  const pageSize = 30;

  useEffect(() => {
    setData(initialData);
    setCurrentPage(1);
  }, [initialData]);
  
  const filteredData = useMemo(() => {
    return data.filter((row: any) => 
        selectedAgentId === "all" ? true : row.employees.id === selectedAgentId
    );
  }, [data, selectedAgentId]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleAction = async (id: string, type: 'confirm' | 'validate', status?: AttendanceStatus) => {
    try {
      const payload: any = {};
      if (type === 'confirm') {
        payload.is_confirmed = true;
        payload.confirmed_by = currentUser.id;
      } else {
        payload.is_validated = true;
        payload.validated_by = currentUser.id;
        // On utilise le statut passé en argument (le choix du select)
        payload.validated_status = status;
      }

      await updateAttendanceValidation(id, payload);
      toast.success(type === 'confirm' ? "Confirmé" : "Validé");
      
      setData((prev: any) => prev.map((item: any) => item.id === id ? { ...item, ...payload } : item));
      
      // Nettoyer le statut temporaire après validation
      if (type === 'validate') {
        setPendingStatuses(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
      }
    } catch (e) {
      toast.error("Erreur");
    }
  };

  return (
    <div className="bg-card rounded-[32px] border shadow-sm overflow-hidden mt-6">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="font-bold pl-8">Employé</TableHead>
            <TableHead className="font-bold">Date</TableHead>
            <TableHead className="font-bold">Heure Fichier</TableHead>
            <TableHead className="font-bold">Status Fichier</TableHead>
            <TableHead className="font-bold">Status Validé</TableHead>
            <TableHead className="font-bold text-right pr-8">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.map((row: any) => {
            // On récupère le statut choisi ou par défaut celui du fichier
            const currentChoice = pendingStatuses[row.id] || row.status;

            return (
              <TableRow key={row.id} className="hover:bg-muted/20 transition-colors">
                <TableCell className="font-bold pl-8">
                    {row.employees?.name}
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-normal italic">
                    <Store className="w-3 h-3" /> {row.employees?.shops?.name}
                    </div>
                </TableCell>
                <TableCell className="text-xs font-medium">
                    {new Date(row.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                </TableCell>
                <TableCell className="font-mono text-primary font-bold">{row.check_in || "--:--"}</TableCell>
                <TableCell>
                    <Badge variant="outline" className="text-[10px] uppercase opacity-50">
                        {ATTENDANCE_LABELS[row.status as AttendanceStatus]}
                    </Badge>
                </TableCell>
                <TableCell>
                  {row.is_validated ? (
                    // Cas 1 : Déjà validé en base de données (Badge plein)
                    <Badge className="bg-emerald-500 text-[10px] uppercase font-bold text-white border-none">
                      {ATTENDANCE_LABELS[row.validated_status as AttendanceStatus]}
                    </Badge>
                  ) : row.status === 'present' ? (
                    // Cas 2 : Pas encore validé mais le fichier dit 'Présent' (Badge contouré)
                    <Badge variant="outline" className="text-[10px] uppercase font-bold border-emerald-500/30 text-emerald-600 bg-emerald-50/50">
                      {ATTENDANCE_LABELS['present']}
                    </Badge>
                  ) : (
                    // Cas 3 : Tout autre statut (Retard, Absent, etc.) qui attend une décision
                    <span className="text-muted-foreground text-[10px] italic">En attente...</span>
                  )}
                </TableCell>
                <TableCell className="text-right pr-8">
                    <div className="flex justify-end gap-2">
                    {!row.is_confirmed && (
                        <Button 
                            size="sm" variant="outline" 
                            onClick={() => handleAction(row.id, 'confirm')}
                            className="h-8 rounded-xl text-[10px] font-bold border-blue-200 text-blue-600 hover:bg-blue-50"
                        >
                            <Check className="w-3 h-3 mr-1" /> CONFIRMER
                        </Button>
                    )}

                    {row.is_confirmed && !row.is_validated && (
                        <div className="flex gap-1 items-center">
                            <select 
                                className="text-[10px] border rounded-lg px-2 h-8 bg-gray-50 focus:ring-2 focus:ring-primary/20 outline-none"
                                value={currentChoice}
                                onChange={(e) => setPendingStatuses(prev => ({ 
                                    ...prev, 
                                    [row.id]: e.target.value as AttendanceStatus 
                                }))}
                            >
                                {Object.keys(ATTENDANCE_LABELS).map(k => (
                                    <option key={k} value={k}>{ATTENDANCE_LABELS[k as AttendanceStatus]}</option>
                                ))}
                            </select>
                            <Button 
                                size="sm" 
                                // 💡 ON UTILISE LE CHOIX ACTUEL
                                onClick={() => handleAction(row.id, 'validate', currentChoice)}
                                className="h-8 rounded-xl text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <ShieldCheck className="w-3 h-3 mr-1" /> OK
                            </Button>
                        </div>
                    )}

                    {row.is_validated && (
                        <Badge variant="secondary" className="h-8 rounded-xl px-3 flex items-center gap-1 bg-emerald-50 text-emerald-700 border-none font-bold text-[9px]">
                            <ShieldCheck className="w-3 h-3" /> VALIDÉ
                        </Badge>
                    )}
                    </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      
      {/* Pagination Footer */}
      <div className="p-4 border-t bg-muted/10 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Affichage de {paginatedData.length} sur {filteredData.length} lignes
          </p>
          <div className="flex items-center gap-2">
            <Button 
                variant="outline" size="sm" className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
            >
                <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-bold px-2">Page {currentPage} / {totalPages || 1}</span>
            <Button 
                variant="outline" size="sm" className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
            >
                <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
      </div>
    </div>
  );
}