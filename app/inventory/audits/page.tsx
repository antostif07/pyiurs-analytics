import { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewAuditDialog } from "./_components/new-audit-dialog";
import { DeleteAuditButton } from "./_components/delete-audit-button";
import { getAuditsAction } from "./_lib/audits-actions";
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
    ShieldAlert,
    FileEdit,
    AlertCircle,
    FileCheck2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuditStatus } from "./_lib/types";

export const metadata: Metadata = {
    title: "Audits & Inventaires Physiques | Retail Intelligence",
    description: "Gestion du comptage au scanner et contrôle de la démarque inconnue.",
};

const formatCurrencyUSD = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(amount);
};

export default async function AuditsListPage() {
    const supabase = await createClient();

    // 1. Authentification & Vérification Sécurisée
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return (
            <div className="p-8 text-center bg-card border border-border rounded-2xl max-w-lg mx-auto mt-12">
                <ShieldAlert className="w-10 h-10 text-destructive mx-auto mb-3" />
                <h3 className="text-base font-semibold text-foreground">Accès non autorisé</h3>
                <p className="text-xs text-muted-foreground mt-1">
                    Veuillez vous connecter pour accéder aux audits et contrôles d'inventaire.
                </p>
            </div>
        );
    }

    // 2. Lecture du profil & des permissions
    const { data: profile } = await supabase
        .from("profiles")
        .select("role, shop_access_type, assigned_shops, assigned_companies")
        .eq("id", user.id)
        .single();

    const allowedShopIds: string[] = Array.isArray(profile?.assigned_shops)
        ? (profile.assigned_shops as string[]).filter((id): id is string => typeof id === "string")
        : [];

    const allowedCompanyIds: number[] = Array.isArray(profile?.assigned_companies)
        ? profile.assigned_companies.filter((id): id is number => typeof id === "number")
        : [];

    const isFullAccess = profile?.role === "admin" || profile?.shop_access_type === "all";

    // 3. Récupération optimisée des boutiques autorisées
    let shopsQuery = supabase.from("shops").select("id, name, odoo_company_id").order("name");

    if (!isFullAccess) {
        if (allowedCompanyIds.length > 0) {
            shopsQuery = shopsQuery.in("odoo_company_id", allowedCompanyIds);
        } else if (allowedShopIds.length > 0) {
            shopsQuery = shopsQuery.in("id", allowedShopIds);
        }
    }

    // 4. Exécution en parallèle optimisée : Audits filtrés en SQL
    const [allowedShopsResult, audits] = await Promise.all([
        shopsQuery,
        getAuditsAction({
            allowedShopIds: isFullAccess ? undefined : allowedShopIds,
        }),
    ]);

    const allowedShops = allowedShopsResult.data || [];

    // 5. KPIs Métier Précis
    const totalAudits = audits.length;
    const activeAudits = audits.filter((a) => a.status === "in_progress" || a.status === "draft").length;
    const pendingValidationAudits = audits.filter((a) => a.status === "completed").length;
    const totalScannedItems = audits.reduce((sum, a) => sum + (a.total_items_scanned || 0), 0);

    // Séparation Démarque réelle (pertes) vs Écarts globaux
    const netDiscrepancyValue = audits.reduce((sum, a) => sum + (Number(a.total_discrepancy_value) || 0), 0);

    return (
        <div className="space-y-8 pb-10 animate-in fade-in duration-300">
            {/* HEADER SECTION */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/60 pb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground uppercase">
                        Audits & <span className="text-primary font-black">Inventaires Physiques</span>
                    </h1>
                    <p className="text-xs text-muted-foreground font-light mt-1">
                        Contrôle des stocks unitaires au scanner et suivi analytique de la démarque ($ USD).
                    </p>
                </div>

                <NewAuditDialog shops={allowedShops} />
            </div>

            {/* METRICS / KPIS DASHBOARD */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-card border border-border/60 rounded-2xl flex items-center gap-3.5 shadow-xs">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                        <ScanLine className="w-5 h-5 stroke-[1.75]" />
                    </div>
                    <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            Total Sessions
                        </span>
                        <div className="text-lg font-bold font-mono text-foreground">{totalAudits}</div>
                    </div>
                </div>

                <div className="p-4 bg-card border border-border/60 rounded-2xl flex items-center gap-3.5 shadow-xs">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                        <Clock className="w-5 h-5 stroke-[1.75]" />
                    </div>
                    <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            En Cours / Attente
                        </span>
                        <div className="text-lg font-bold font-mono text-foreground">
                            {activeAudits} <span className="text-xs font-normal text-muted-foreground">({pendingValidationAudits} à valider)</span>
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
                    <div
                        className={cn(
                            "p-2.5 rounded-xl shrink-0",
                            netDiscrepancyValue < 0 ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600"
                        )}
                    >
                        <TrendingDown className="w-5 h-5 stroke-[1.75]" />
                    </div>
                    <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            Démarque Nette ($)
                        </span>
                        <div
                            className={cn(
                                "text-lg font-bold font-mono",
                                netDiscrepancyValue < 0 ? "text-rose-600" : "text-emerald-600"
                            )}
                        >
                            {formatCurrencyUSD(netDiscrepancyValue)}
                        </div>
                    </div>
                </div>
            </div>

            {/* TABLEAU DES SESSIONS D'AUDIT */}
            <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Sessions d'Inventaires Enregistrées
                    </h2>
                    <Badge variant="outline" className="text-[9px] font-mono">
                        {audits.length} Session{audits.length > 1 ? "s" : ""}
                    </Badge>
                </div>

                {audits.length === 0 ? (
                    <div className="text-center py-16 bg-card border border-border border-dashed rounded-2xl">
                        <ScanLine className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                        <h3 className="text-sm font-semibold text-foreground">Aucune session d'audit trouvée</h3>
                        <p className="text-xs text-muted-foreground mt-1 font-light max-w-sm mx-auto">
                            Cliquez sur "Lancer un Audit Physique" pour démarrer une session de comptage dans votre boutique.
                        </p>
                    </div>
                ) : (
                    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs">
                        <Table className="w-full text-left text-xs border-collapse">
                            <TableHeader className="bg-muted/40">
                                <TableRow className="border-b border-border/60 hover:bg-transparent">
                                    <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider">
                                        Référence / Date
                                    </TableHead>
                                    <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider">
                                        Boutique
                                    </TableHead>
                                    <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider">
                                        Département
                                    </TableHead>
                                    <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider text-right">
                                        Scans
                                    </TableHead>
                                    <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider text-right">
                                        Écart (Qté)
                                    </TableHead>
                                    <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider text-right">
                                        Valeur Écart ($)
                                    </TableHead>
                                    <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider text-center">
                                        Statut
                                    </TableHead>
                                    <TableHead className="py-3 px-4 text-right w-28">Action</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody className="divide-y divide-border/40 font-mono">
                                {audits.map((a) => {
                                    const diffQty = a.total_discrepancy_qty || 0;
                                    const diffVal = Number(a.total_discrepancy_value) || 0;

                                    return (
                                        <TableRow key={a.id} className="hover:bg-muted/30 transition-colors group">
                                            {/* Référence */}
                                            <TableCell className="py-3 px-4 font-sans font-semibold text-foreground">
                                                <div className="flex flex-col">
                                                    <span className="font-mono font-bold text-xs text-primary">{a.reference}</span>
                                                    <span className="text-[10px] text-muted-foreground font-light font-sans mt-0.5">
                                                        {a.created_at
                                                            ? format(new Date(a.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })
                                                            : "—"}
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

                                            {/* Département */}
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
                                                <span
                                                    className={cn(
                                                        "font-bold text-xs",
                                                        diffQty < 0 ? "text-rose-600" : diffQty > 0 ? "text-emerald-600" : "text-muted-foreground/60"
                                                    )}
                                                >
                                                    {diffQty > 0 ? `+${diffQty}` : diffQty}
                                                </span>
                                            </TableCell>

                                            {/* Écart $ */}
                                            <TableCell className="py-3 px-4 text-right">
                                                <span
                                                    className={cn(
                                                        "font-bold text-xs",
                                                        diffVal < 0 ? "text-rose-600" : diffVal > 0 ? "text-emerald-600" : "text-muted-foreground/60"
                                                    )}
                                                >
                                                    {diffVal > 0 ? `+${formatCurrencyUSD(diffVal)}` : formatCurrencyUSD(diffVal)}
                                                </span>
                                            </TableCell>

                                            {/* Statut Réel (4 Statuts BDD) */}
                                            <TableCell className="py-3 px-4 text-center font-sans">
                                                <AuditStatusBadge status={a.status as AuditStatus} />
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Link href={`/inventory/audits/${a.id}`}>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 px-2.5 rounded-lg text-[10px] font-semibold gap-1 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all"
                                                        >
                                                            <span>{a.status === "validated" ? "Consulter" : "Ouvrir"}</span>
                                                            <ChevronRight className="w-3 h-3" />
                                                        </Button>
                                                    </Link>

                                                    {a.status !== "validated" ? (
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

/**
 * Composant de Badge pour les 4 Statuts Métier BDD
 */
function AuditStatusBadge({ status }: { status: AuditStatus }) {
    switch (status) {
        case "draft":
            return (
                <Badge className="bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[9px] font-bold">
                    <FileEdit className="w-2.5 h-2.5 mr-1" /> Brouillon
                </Badge>
            );
        case "in_progress":
            return (
                <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[9px] font-bold">
                    <Clock className="w-2.5 h-2.5 mr-1" /> Scan en cours
                </Badge>
            );
        case "completed":
            return (
                <Badge className="bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[9px] font-bold">
                    <FileCheck2 className="w-2.5 h-2.5 mr-1" /> À Valider
                </Badge>
            );
        case "validated":
            return (
                <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-bold">
                    <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Validé
                </Badge>
            );
        default:
            return (
                <Badge variant="outline" className="text-[9px]">
                    {status}
                </Badge>
            );
    }
}