import { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewAuditDialog } from "./_components/new-audit-dialog";
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
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
    ScanLine,
    Store,
    CheckCircle2,
    Clock,
    ChevronRight,
    Boxes,
    TrendingDown,
    Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DeleteAuditButton } from "./_components/delete-audit-button";
import { getAllAuditsAction } from "./_lib/audits-actions";

export const metadata: Metadata = {
    title: "Audits & Inventaires Physiques | Pyiurs Analytics",
    description: "Gestion du comptage au scanner et contrôle de la démarque inconnue.",
};

export interface AuditSession {
    id: string;
    reference: string;
    created_at: string;
    shop_id: string;
    shop_name: string;
    department: string;
    status: "in_progress" | "validated" | "cancelled";
    total_items_scanned: number;
    total_discrepancy_qty: number;
    total_discrepancy_value: number;
    created_by?: string;
}

const formatUSD = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(amount);
};

export default async function AuditsListPage() {
    const supabase = await createClient();

    // Chargement en parallèle des audits et des boutiques
    const [auditsResult, { data: shops }] = await Promise.all([
        getAllAuditsAction(),
        supabase.from("shops").select("id, name").order("name"),
    ]);

    const audits: AuditSession[] = (auditsResult as AuditSession[]) || [];

    // Statistiques globales calculées à la volée
    const totalAudits = audits.length;
    const activeAudits = audits.filter((a) => a.status === "in_progress").length;
    const totalScannedItems = audits.reduce((sum, a) => sum + (a.total_items_scanned || 0), 0);
    const totalDiscrepancyValue = audits.reduce((sum, a) => sum + (Number(a.total_discrepancy_value) || 0), 0);

    return (
        <div className="space-y-8 pb-10 animate-in fade-in duration-300">
            {/* 1. EN-TÊTE AVEC BOUTON DE CRÉATION */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/60 pb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground uppercase">
                        Audits & <span className="text-primary font-black">Inventaires Physiques</span>
                    </h1>
                    <p className="text-xs text-muted-foreground font-light mt-1">
                        Contrôle des stocks unitaires par scanner et suivi analytique de la démarque ($ USD).
                    </p>
                </div>

                <NewAuditDialog shops={shops || []} />
            </div>

            {/* 2. STATISTIQUES GLOBALES D'INVENTAIRE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-card border border-border/60 rounded-2xl flex items-center gap-3.5 shadow-xs">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                        <ScanLine className="w-5 h-5 stroke-[1.75]" />
                    </div>
                    <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            Total Sessions
                        </span>
                        <div className="text-lg font-bold font-mono text-foreground">
                            {totalAudits}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-card border border-border/60 rounded-2xl flex items-center gap-3.5 shadow-xs">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                        <Clock className="w-5 h-5 stroke-[1.75]" />
                    </div>
                    <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            En Cours / Actifs
                        </span>
                        <div className="text-lg font-bold font-mono text-foreground">
                            {activeAudits}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-card border border-border/60 rounded-2xl flex items-center gap-3.5 shadow-xs">
                    <div className="p-2.5 rounded-xl bg-muted text-foreground shrink-0">
                        <Boxes className="w-5 h-5 stroke-[1.75]" />
                    </div>
                    <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            Unités Scannées
                        </span>
                        <div className="text-lg font-bold font-mono text-foreground">
                            {totalScannedItems.toLocaleString("fr-FR")}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-card border border-border/60 rounded-2xl flex items-center gap-3.5 shadow-xs">
                    <div className={cn(
                        "p-2.5 rounded-xl shrink-0",
                        totalDiscrepancyValue < 0 ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600"
                    )}>
                        <TrendingDown className="w-5 h-5 stroke-[1.75]" />
                    </div>
                    <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            Démarque Globale ($)
                        </span>
                        <div className={cn(
                            "text-lg font-bold font-mono",
                            totalDiscrepancyValue < 0 ? "text-rose-600" : "text-emerald-600"
                        )}>
                            {formatUSD(totalDiscrepancyValue)}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. TABLEAU DES SESSIONS D'AUDIT */}
            <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Sessions d'Inventaires Enregistrées
                    </h2>
                    <Badge variant="outline" className="text-[9px] font-mono">
                        {audits.length} Sessions
                    </Badge>
                </div>

                {audits.length === 0 ? (
                    <div className="text-center py-16 bg-card border border-border border-dashed rounded-2xl">
                        <ScanLine className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                        <h3 className="text-sm font-semibold text-foreground">Aucune session d'audit enregistrée</h3>
                        <p className="text-xs text-muted-foreground mt-1 font-light max-w-sm mx-auto">
                            Cliquez sur "Lancer un Audit Physique" pour démarrer une session de comptage en boutique.
                        </p>
                    </div>
                ) : (
                    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs">
                        <Table className="w-full text-left text-xs border-collapse">
                            <TableHeader className="bg-muted/40">
                                <TableRow className="border-b border-border/60 hover:bg-transparent">
                                    <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider">Référence / Date</TableHead>
                                    <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider">Boutique</TableHead>
                                    <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider">Périmètre</TableHead>
                                    <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider text-right">Scans</TableHead>
                                    <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider text-right">Écart (Qté)</TableHead>
                                    <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider text-right">Démarque ($)</TableHead>
                                    <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider text-center">Statut</TableHead>
                                    <TableHead className="py-3 px-4 text-right w-28">Action</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody className="divide-y divide-border/40 font-mono">
                                {audits.map((a) => {
                                    const diffQty = a.total_discrepancy_qty || 0;
                                    const diffVal = Number(a.total_discrepancy_value) || 0;
                                    const isValidated = a.status === "validated";

                                    return (
                                        <TableRow key={a.id} className="hover:bg-muted/30 transition-colors group">
                                            {/* Référence */}
                                            <TableCell className="py-3 px-4 font-sans font-semibold text-foreground">
                                                <div className="flex flex-col">
                                                    <span className="font-mono font-bold text-xs text-primary">{a.reference}</span>
                                                    <span className="text-[10px] text-muted-foreground font-light font-sans mt-0.5">
                                                        {a.created_at
                                                            ? format(new Date(a.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })
                                                            : "—"
                                                        }
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* Boutique */}
                                            <TableCell className="py-3 px-4 font-sans font-medium text-foreground">
                                                <div className="flex items-center gap-1.5">
                                                    <Store className="w-3.5 h-3.5 text-primary shrink-0" />
                                                    <span>{a.shop_name}</span>
                                                </div>
                                            </TableCell>

                                            {/* Périmètre / Département */}
                                            <TableCell className="py-3 px-4 font-sans">
                                                <Badge variant="outline" className="text-[9px] font-medium border-border/80 bg-muted/20">
                                                    {a.department}
                                                </Badge>
                                            </TableCell>

                                            {/* Scans */}
                                            <TableCell className="py-3 px-4 text-right font-bold text-foreground">
                                                {(a.total_items_scanned || 0).toLocaleString("fr-FR")}
                                            </TableCell>

                                            {/* Écart Qté */}
                                            <TableCell className="py-3 px-4 text-right">
                                                <span className={cn(
                                                    "font-bold text-xs",
                                                    diffQty < 0 ? "text-rose-600" : diffQty > 0 ? "text-emerald-600" : "text-muted-foreground/60"
                                                )}>
                                                    {diffQty > 0 ? `+${diffQty}` : diffQty}
                                                </span>
                                            </TableCell>

                                            {/* Démarque $ */}
                                            <TableCell className="py-3 px-4 text-right">
                                                <span className={cn(
                                                    "font-bold text-xs",
                                                    diffVal < 0 ? "text-rose-600" : diffVal > 0 ? "text-emerald-600" : "text-muted-foreground/60"
                                                )}>
                                                    {diffVal > 0 ? `+${formatUSD(diffVal)}` : formatUSD(diffVal)}
                                                </span>
                                            </TableCell>

                                            {/* Statut */}
                                            <TableCell className="py-3 px-4 text-center font-sans">
                                                {isValidated ? (
                                                    <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-bold">
                                                        <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Validé
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[9px] font-bold">
                                                        <Clock className="w-2.5 h-2.5 mr-1" /> En Cours
                                                    </Badge>
                                                )}
                                            </TableCell>

                                            {/* Action */}
                                            <TableCell className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Link href={`/inventory/audits/${a.id}`}>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 px-2.5 rounded-lg text-[10px] font-semibold gap-1 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all"
                                                        >
                                                            <span>{isValidated ? "Consulter" : "Ouvrir"}</span>
                                                            <ChevronRight className="w-3 h-3" />
                                                        </Button>
                                                    </Link>

                                                    {/* Seuls les audits "En Cours" peuvent être supprimés pour des raisons de sécurité de la donnée Odoo */}
                                                    {!isValidated ? (
                                                        <DeleteAuditButton auditId={a.id} reference={a.reference} />
                                                    ) : (
                                                        <div className="p-1 text-muted-foreground/40" title="Audit validé et verrouillé">
                                                            <Lock className="w-3.5 h-3.5" />
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </div>
    );
}