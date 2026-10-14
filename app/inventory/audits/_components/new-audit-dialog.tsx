// app/inventory/audits/_components/new-audit-dialog.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Loader2,
    ScanLine,
    Calendar,
    Store,
    Layers,
    FileText,
    Check,
    ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCreateAudit } from "../_lib/hooks/use-audit-mutations";
import { usePurchaseOrders } from "../_lib/hooks/use-purchase-orders";
import { MultiSelect } from "@/components/new-ui/multi-select";

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export interface ShopOption {
    id: string;
    name: string;
    odoo_company_id?: number | null;
}

interface NewAuditDialogProps {
    shops: ShopOption[];
}

// ─────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────

const AVAILABLE_SEGMENTS = [
    { id: "Tous", label: "Tous les départements" },
    { id: "Beauty", label: "Beauty" },
    { id: "Femme", label: "Femme" },
    { id: "Enfant", label: "Kids" },
];

/** Mapping département → préfixes fournisseurs correspondants */
const SEGMENT_TO_PREFIXES: Record<string, readonly string[]> = {
    Beauty: ["P.BTY"],
    Femme: ["P.FEM"],
    Enfant: ["P.KID"],
    // "Tous" = pas de filtre (tous les préfixes)
};

// ─────────────────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────────────────

export function NewAuditDialog({ shops }: NewAuditDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false); const { data: poData, isLoading: loadingPO } = usePurchaseOrders(open);
    const purchaseOrders = poData?.orders ?? [];

    const [selectedPOs, setSelectedPOs] = useState<number[]>([]);
    const createMutation = useCreateAudit();

    const todayStr = new Date().toISOString().split("T")[0];

    const [selectedShops, setSelectedShops] = useState<string[]>([]);
    const [selectedSegments, setSelectedSegments] = useState<string[]>(["Tous"]);
    const [auditDate, setAuditDate] = useState<string>(todayStr);
    const [notes, setNotes] = useState<string>("");

    const filteredPurchaseOrders = useMemo(() => {
        // "Tous" sélectionné → pas de filtre, on affiche tout
        if (selectedSegments.includes("Tous")) return purchaseOrders;

        // Récupérer tous les préfixes autorisés pour les segments actifs
        const allowedPrefixes = new Set<string>();
        for (const seg of selectedSegments) {
            const prefixes = SEGMENT_TO_PREFIXES[seg];
            if (prefixes) prefixes.forEach((p) => allowedPrefixes.add(p));
        }

        // Si aucun mapping (sécurité), on laisse tout passer
        if (allowedPrefixes.size === 0) return purchaseOrders;

        return purchaseOrders.filter((po) =>
            allowedPrefixes.has(po.supplierPrefix),
        );
    }, [purchaseOrders, selectedSegments]);

    // Sélection par défaut : première boutique autorisée
    useEffect(() => {
        if (shops && shops.length > 0 && selectedShops.length === 0) {
            setSelectedShops([shops[0].id]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shops]);

    useEffect(() => {
        const stillValidIds = new Set(filteredPurchaseOrders.map((o) => o.id));
        setSelectedPOs((prev) => {
            const valid = prev.filter((id) => stillValidIds.has(id));
            return valid.length === prev.length ? prev : valid;
        });
    }, [filteredPurchaseOrders]);

    const resetForm = () => {
        setSelectedShops(shops.length > 0 ? [shops[0].id] : []);
        setSelectedSegments(["Tous"]);
        setAuditDate(todayStr);
        setNotes("");
        setSelectedPOs([]);   // ⬅️
    };

    const toggleShop = (shopId: string) => {
        if (!shopId) return;
        setSelectedShops((prev) =>
            prev.includes(shopId)
                ? prev.filter((id) => id !== shopId)
                : [...prev, shopId],
        );
    };

    const togglePO = (poId: number) => {
        setSelectedPOs((prev) =>
            prev.includes(poId)
                ? prev.filter((id) => id !== poId)
                : [...prev, poId],
        );
    };

    const toggleSegment = (segId: string) => {
        if (segId === "Tous") {
            setSelectedSegments(["Tous"]);
            return;
        }
        setSelectedSegments((prev) => {
            const filtered = prev.filter((s) => s !== "Tous");
            const next = filtered.includes(segId)
                ? filtered.filter((s) => s !== segId)
                : [...filtered, segId];
            return next.length === 0 ? ["Tous"] : next;
        });
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        const cleanShops = selectedShops.filter(
            (id) => typeof id === "string" && id.trim().length > 0,
        );

        if (cleanShops.length === 0) {
            toast.error("Veuillez sélectionner au moins une boutique.");
            return;
        }

        try {
            const result = await createMutation.mutateAsync({
                shopIds: cleanShops,
                departments: selectedSegments,
                notes: notes.trim() || undefined,
                auditDate,
                purchaseOrderIds: selectedPOs.length > 0 ? selectedPOs : undefined,
            });

            if (result.success && result.auditId) {
                toast.success(`Session ${result.reference} créée avec succès`);
                setOpen(false);
                resetForm();
                router.push(`/inventory/audits/${result.auditId}`);
            } else {
                toast.error(result.error ?? "Échec de la création d'audit.");
            }
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Erreur lors de la création de l'audit.",
            );
        }
    };

    const isSubmitting = createMutation.isPending;

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next && isSubmitting) return;
                if (!next) resetForm();
                setOpen(next);
            }}
        >
            <DialogTrigger asChild>
                <Button
                    size="sm"
                    className="h-7 px-2.5 text-[11px] gap-1.5 bg-primary text-primary-foreground hover:opacity-90 shadow-2xs"
                >
                    <ScanLine className="w-3 h-3" />
                    <span>Nouvel audit</span>
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg rounded-xl border-border/60 bg-card p-0 shadow-2xl gap-0">
                <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
                    <DialogTitle className="text-[15px] font-semibold text-foreground tracking-tight flex items-center gap-2">
                        <ScanLine className="w-4 h-4 text-primary" />
                        Nouvelle session d&apos;inventaire
                    </DialogTitle>
                    <DialogDescription className="text-[11px] text-muted-foreground/80">
                        Sélectionnez la boutique et le périmètre pour capturer
                        l&apos;état des stocks.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreate}>
                    <div className="px-5 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
                        {/* ─── Date ─────────────────────────────── */}
                        <div className="space-y-1">
                            <Label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" />
                                Date de l&apos;audit
                            </Label>
                            <input
                                type="date"
                                value={auditDate}
                                max={todayStr}
                                onChange={(e) => setAuditDate(e.target.value)}
                                disabled={isSubmitting}
                                required
                                className="w-full h-8 px-2.5 rounded-lg border border-border/60 bg-muted/20 text-[11.5px] font-mono outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:bg-background transition-colors"
                            />
                        </div>

                        {/* ─── Boutiques ────────────────────────── */}
                        <div className="space-y-1.5">
                            <Label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
                                <Store className="w-3 h-3" />
                                Boutiques cibles
                            </Label>
                            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-muted/10 border border-border/60 rounded-lg">
                                {shops.length === 0 ? (
                                    <span className="text-[11px] text-muted-foreground/60 italic px-1">
                                        Aucune boutique autorisée.
                                    </span>
                                ) : (
                                    shops.map((s) => {
                                        const active = selectedShops.includes(
                                            s.id,
                                        );
                                        return (
                                            <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => toggleShop(s.id)}
                                                disabled={isSubmitting}
                                                className={cn(
                                                    "px-2 py-1 rounded-md text-[11px] font-medium border transition-colors flex items-center gap-1.5",
                                                    active
                                                        ? "bg-primary/10 border-primary text-primary font-semibold"
                                                        : "bg-card border-border/60 text-muted-foreground hover:bg-accent/40",
                                                    isSubmitting &&
                                                    "opacity-60 cursor-not-allowed",
                                                )}
                                            >
                                                {active && (
                                                    <Check className="w-2.5 h-2.5" />
                                                )}
                                                <span className="truncate max-w-[130px]">
                                                    {s.name}
                                                </span>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* ─── Segments ─────────────────────────── */}
                        <MultiSelect
                            options={AVAILABLE_SEGMENTS.map((s) => ({
                                value: s.id,
                                label: s.label,
                            }))}
                            value={selectedSegments}
                            onChange={setSelectedSegments}
                            placeholder="Tous les départements"
                            searchPlaceholder="Rechercher un segment..."
                            maxBadges={2}
                            disabled={isSubmitting}
                        />

                        {/* ─── Commandes fournisseurs (optionnel) ───────────────── */}
                        <div className="space-y-1.5">
                            <Label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
                                <ShoppingBag className="w-3 h-3" />
                                Commandes fournisseurs
                                <span className="text-muted-foreground/60 normal-case font-normal">
                                    (optionnel — vide = tout le stock)
                                </span>
                            </Label>

                            {loadingPO ? (
                                <div className="flex items-center gap-2 p-2 text-[11px] text-muted-foreground/60 italic">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Chargement des commandes...
                                </div>
                            ) : filteredPurchaseOrders.length === 0 ? (
                                <div className="p-2 text-[11px] text-muted-foreground/60 italic">
                                    {purchaseOrders.length === 0
                                        ? "Aucune commande P.FEM / P.BTY / P.KID disponible."
                                        : "Aucune commande ne correspond aux segments sélectionnés."}
                                </div>
                            ) : (
                                <MultiSelect
                                    options={filteredPurchaseOrders.map((po) => ({
                                        value: String(po.id),
                                        label: `${po.supplierName} - ${po.partnerRef}`,
                                        group: po.supplierPrefix,
                                        hint: po.date.slice(5),
                                    }))}
                                    value={selectedPOs.map(String)}
                                    onChange={(v) => setSelectedPOs(v.map(Number))}
                                    placeholder="Toutes les commandes"
                                    searchPlaceholder="Rechercher par fournisseur ou référence..."
                                    emptyText="Aucune commande trouvée."
                                    maxBadges={2}
                                    disabled={isSubmitting}
                                />
                            )}

                            {selectedPOs.length > 0 && (
                                <p className="text-[10px] text-muted-foreground/70 italic">
                                    {selectedPOs.length} commande
                                    {selectedPOs.length > 1 ? "s" : ""} sélectionnée
                                    {selectedPOs.length > 1 ? "s" : ""} — seuls les produits concernés
                                    seront audités.
                                </p>
                            )}
                        </div>

                        {/* ─── Notes ────────────────────────────── */}
                        <div className="space-y-1">
                            <Label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
                                <FileText className="w-3 h-3" />
                                Notes / Référence
                            </Label>
                            <input
                                type="text"
                                placeholder="Ex : Inventaire trimestriel de clôture"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                disabled={isSubmitting}
                                className="w-full h-8 px-2.5 rounded-lg border border-border/60 bg-muted/20 text-[11.5px] outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:bg-background transition-colors"
                            />
                        </div>
                    </div>

                    <div className="px-5 py-3 border-t border-border/60 flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setOpen(false)}
                            disabled={isSubmitting}
                            className="h-7 px-3 text-[11px]"
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={isSubmitting || shops.length === 0}
                            className="h-7 px-3 text-[11px] gap-1.5 bg-primary text-primary-foreground hover:opacity-90 min-w-[130px]"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                                <ScanLine className="w-3 h-3" />
                            )}
                            {isSubmitting
                                ? "Génération..."
                                : "Générer le snapshot"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}