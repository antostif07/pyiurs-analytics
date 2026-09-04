"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Check,
  ShieldCheck,
  Store,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCheck,
  UserCheck,
  Sparkles,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { updateAttendanceValidation } from "../actions";
import type { User } from "@supabase/supabase-js";
import { AttendanceWithEmployee, ATTENDANCE_LABELS, AttendanceStatus, ProfileRow } from "@/lib/supabase/types";


// ✅ Composants Shadcn UI
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AttendanceTableProps {
  initialData: AttendanceWithEmployee[];
  currentUser?: User | null;
  userProfile?: Pick<ProfileRow, "id" | "full_name" | "email" | "role" | "assigned_shops"> | null;
  selectedAgentId?: string;
  currentMonth?: string;
  currentYear?: string;
}

export default function AttendanceTable({
  initialData,
  currentUser,
  userProfile,
  selectedAgentId = "all",
}: AttendanceTableProps) {
  const [data, setData] = useState<AttendanceWithEmployee[]>(initialData);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isPending, startTransition] = useTransition();
  const [loadingRowId, setLoadingRowId] = useState<string | null>(null);

  // Mémorisation des choix de statuts avant validation
  const [pendingStatuses, setPendingStatuses] = useState<Record<string, AttendanceStatus>>({});

  const pageSize = 25;

  useEffect(() => {
    setData(initialData);
    setCurrentPage(1);
  }, [initialData]);

  // Filtrage par agent sélectionné
  const filteredData = useMemo(() => {
    return data.filter((row) =>
      selectedAgentId === "all" ? true : row.employees?.id === selectedAgentId
    );
  }, [data, selectedAgentId]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const from = (currentPage - 1) * pageSize;
    return filteredData.slice(from, from + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // 1. Action individuelle (Confirmation ou Validation avec typage strict)
  const handleAction = async (
    id: string,
    type: "confirm" | "validate",
    statusChoice?: AttendanceStatus
  ) => {
    if (!currentUser?.id) {
      toast.error("Vous devez être connecté pour valider ce pointage.");
      return;
    }

    try {
      setLoadingRowId(id);

      // ✅ Typage strict du payload correspondant exactement aux arguments de updateAttendanceValidation
      const payload: {
        is_confirmed?: boolean;
        confirmed_by?: string;
        is_validated?: boolean;
        validated_by?: string;
        validated_status?: AttendanceStatus;
      } = {};

      if (type === "confirm") {
        payload.is_confirmed = true;
        payload.confirmed_by = currentUser.id;
      } else {
        payload.is_validated = true;
        payload.validated_by = currentUser.id;
        payload.validated_status = statusChoice || "present";
      }

      await updateAttendanceValidation(id, payload);

      // Mise à jour optimiste du state local
      setData((prev) =>
        prev.map((item) =>
          item.id === id ? ({ ...item, ...payload } as AttendanceWithEmployee) : item
        )
      );

      toast.success(type === "confirm" ? "Pointage confirmé" : "Pointage validé pour la paie");

      if (type === "validate") {
        setPendingStatuses((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    } catch (error: unknown) {
      console.error("Erreur action pointage:", error);
      toast.error("Impossible de mettre à jour le pointage.");
    } finally {
      setLoadingRowId(null);
    }
  };

  // 2. Action groupée : Tout confirmer sur la page
  const handleBulkConfirmPage = async () => {
    const unconfirmedIds = paginatedData.filter((r) => !r.is_confirmed).map((r) => r.id);
    if (unconfirmedIds.length === 0) {
      toast.info("Tous les pointages affichés sont déjà confirmés.");
      return;
    }

    startTransition(async () => {
      try {
        await Promise.all(
          unconfirmedIds.map((id) =>
            updateAttendanceValidation(id, {
              is_confirmed: true,
              confirmed_by: currentUser?.id,
            })
          )
        );

        setData((prev) =>
          prev.map((item) =>
            unconfirmedIds.includes(item.id)
              ? { ...item, is_confirmed: true, confirmed_by: currentUser?.id || null }
              : item
          )
        );

        toast.success(`${unconfirmedIds.length} pointage(s) confirmé(s) en lot.`);
      } catch (e) {
        toast.error("Échec de la confirmation groupée.");
      }
    });
  };

  // Helper de rendu des badges selon les 8 statuts métiers
  const renderStatusBadge = (status: string, isLate: boolean) => {
    switch (status as AttendanceStatus) {
      case "present":
        if (isLate) {
          return (
            <Badge
              variant="secondary"
              className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] font-semibold gap-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Retard
            </Badge>
          );
        }
        return (
          <Badge
            variant="secondary"
            className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-semibold gap-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Présent
          </Badge>
        );
      case "absent":
        return (
          <Badge
            variant="secondary"
            className="bg-rose-500/10 text-rose-500 border-rose-500/20 text-[10px] font-semibold gap-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Absent
          </Badge>
        );
      case "repos":
        return (
          <Badge
            variant="secondary"
            className="bg-muted text-muted-foreground border-border text-[10px] font-semibold gap-1"
          >
            Repos
          </Badge>
        );
      case "conge_circonstanciel":
      case "conge_non_circonstanciel":
        return (
          <Badge
            variant="secondary"
            className="bg-sky-500/10 text-sky-500 border-sky-500/20 text-[10px] font-semibold gap-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            Congé
          </Badge>
        );
      case "sick":
        return (
          <Badge
            variant="secondary"
            className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 text-[10px] font-semibold gap-1"
          >
            Maladie
          </Badge>
        );
      case "suspension":
        return (
          <Badge
            variant="secondary"
            className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-[10px] font-semibold gap-1"
          >
            Suspension
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px] uppercase font-mono opacity-70">
            {status}
          </Badge>
        );
    }
  };

  const unconfirmedCount = paginatedData.filter((r) => !r.is_confirmed).length;

  return (
    <div className="bg-card rounded-xl border border-border/80 shadow-xs overflow-hidden">
      {/* Barre d'actions groupées */}
      {unconfirmedCount > 0 && (
        <div className="px-5 py-2.5 bg-primary/5 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-foreground font-medium">
              {unconfirmedCount} pointage(s) en attente de confirmation sur cette page.
            </span>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleBulkConfirmPage}
            disabled={isPending}
            className="h-7 text-[11px] gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Tout confirmer ({unconfirmedCount})</span>
          </Button>
        </div>
      )}

      {/* Tableau des Pointages */}
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead className="font-semibold text-xs text-foreground/80 pl-6">Conseiller de Vente</TableHead>
            <TableHead className="font-semibold text-xs text-foreground/80">Date</TableHead>
            <TableHead className="font-semibold text-xs text-foreground/80">Arrivée (Check-in)</TableHead>
            <TableHead className="font-semibold text-xs text-foreground/80">Statut Détecté</TableHead>
            <TableHead className="font-semibold text-xs text-foreground/80">Statut Paie Validé</TableHead>
            <TableHead className="text-right font-semibold text-xs text-foreground/80 pr-6">Validation</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {paginatedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                <div className="flex flex-col items-center justify-center space-y-1">
                  <UserCheck className="w-7 h-7 opacity-40 mb-1" />
                  <p className="text-sm font-medium text-foreground">Aucun pointage trouvé</p>
                  <p className="text-xs">Modifiez les filtres de recherche ou sélectionnez un autre mois.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            paginatedData.map((row) => {
              const currentChoice = (pendingStatuses[row.id] || row.status) as AttendanceStatus;
              const isRowLoading = loadingRowId === row.id;

              const employeeInitials = (row.employees?.name || "Agent")
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return (
                <TableRow key={row.id} className="hover:bg-muted/30 transition-colors group">
                  {/* Conseiller & Boutique */}
                  <TableCell className="pl-6 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border border-border shrink-0">
                        <AvatarFallback className="text-[11px] font-semibold bg-primary/10 text-primary">
                          {employeeInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{row.employees?.name}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-light">
                          <Store className="w-3 h-3 text-muted-foreground/70" />
                          <span className="truncate">{row.employees?.shops?.name || "Non assigné"}</span>
                          {row.employees?.matricule && (
                            <span className="font-mono opacity-80">• {row.employees.matricule}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Date formatée */}
                  <TableCell className="text-xs font-medium capitalize">
                    {format(new Date(row.date), "EEE d MMM yyyy", { locale: fr })}
                  </TableCell>

                  {/* Heure d'Arrivée (Check-in) */}
                  <TableCell>
                    <div className="flex items-center gap-1.5 font-mono text-xs">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
                      <span className={row.check_in ? "font-semibold text-foreground" : "text-muted-foreground font-light"}>
                        {row.check_in ? String(row.check_in).substring(0, 5) : "--:--"}
                      </span>
                    </div>
                  </TableCell>

                  {/* Statut Fichier / Badge Détecté */}
                  <TableCell>{renderStatusBadge(row.status as AttendanceStatus, Boolean(row.is_late))}</TableCell>

                  {/* Statut Validé pour la Paie */}
                  <TableCell>
                    {row.is_validated ? (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-semibold gap-1"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>{ATTENDANCE_LABELS[(row as any).validated_status as AttendanceStatus] || "Validé"}</span>
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground/70 text-[11px] italic">En attente de validation</span>
                    )}
                  </TableCell>

                  {/* Actions Métier Contextuelles */}
                  <TableCell className="text-right pr-6 py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      {/* Étape 1 : Non confirmé par le Store Manager */}
                      {!row.is_confirmed && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isRowLoading}
                          onClick={() => handleAction(row.id, "confirm")}
                          className="h-7 text-xs font-medium border-blue-500/30 text-blue-500 hover:bg-blue-500/10 gap-1 px-2.5 shadow-xs"
                        >
                          {isRowLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          <span>Confirmer</span>
                        </Button>
                      )}

                      {/* Étape 2 : Confirmé par Store Manager, en attente de validation RH */}
                      {row.is_confirmed && !row.is_validated && (
                        <div className="flex items-center gap-1.5">
                          <Select
                            value={currentChoice}
                            onValueChange={(val: AttendanceStatus) =>
                              setPendingStatuses((prev) => ({ ...prev, [row.id]: val }))
                            }
                          >
                            <SelectTrigger className="h-7 text-[11px] w-40 bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[90]">
                              {Object.entries(ATTENDANCE_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key} className="text-xs">
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Button
                            size="sm"
                            disabled={isRowLoading}
                            onClick={() => handleAction(row.id, "validate", currentChoice)}
                            className="h-7 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white gap-1 px-2.5 shadow-xs"
                          >
                            {isRowLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <ShieldCheck className="w-3 h-3" />
                            )}
                            <span>Valider</span>
                          </Button>
                        </div>
                      )}

                      {/* Étape 3 : Verrouillé & Validé pour la Paie */}
                      {row.is_validated && (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md cursor-default">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Verrouillé Paie</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-xs">
                              Ce pointage est validé et comptabilisé pour la paie.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Pied de Table & Pagination */}
      <div className="p-3.5 border-t border-border/70 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground font-light">
          Affichage de <span className="font-medium text-foreground">{paginatedData.length}</span> sur{" "}
          <span className="font-medium text-foreground">{filteredData.length}</span> pointages
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs gap-1"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Précédent</span>
          </Button>

          <span className="text-xs font-mono font-medium px-2">
            Page {currentPage} / {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs gap-1"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <span>Suivant</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}