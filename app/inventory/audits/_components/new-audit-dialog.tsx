"use client";

import { useState } from "react";
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
import { Loader2, ScanLine, Calendar, Store, Layers, FileText, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createAuditSessionAction } from "../_lib/audits-actions";

interface NewAuditDialogProps {
    shops: { id: string; name: string }[];
}

const AVAILABLE_SEGMENTS = [
    { id: "Tous", label: "Tous les départements" },
    { id: "Beauty", label: "Beauté & Cosmétiques" },
    { id: "Femme", label: "Mode Femme & Wigs" },
    { id: "Enfant", label: "Mode Enfant" },
];

export function NewAuditDialog({ shops }: NewAuditDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const todayStr = new Date().toISOString().split("T")[0];

    const [selectedShops, setSelectedShops] = useState<string[]>([shops[0]?.id || ""]);
    const [selectedSegments, setSelectedSegments] = useState<string[]>(["Tous"]);
    const [auditDate, setAuditDate] = useState<string>(todayStr);
    const [notes, setNotes] = useState<string>("");

    const toggleShop = (shopId: string) => {
        setSelectedShops((prev) =>
            prev.includes(shopId) ? prev.filter((id) => id !== shopId) : [...prev, shopId]
        );
    };

    const toggleSegment = (segId: string) => {
        if (segId === "Tous") {
            setSelectedSegments(["Tous"]);
            return;
        }
        setSelectedSegments((prev) => {
            const filtered = prev.filter((s) => s !== "Tous");
            return filtered.includes(segId) ? filtered.filter((s) => s !== segId) : [...filtered, segId];
        });
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedShops.length === 0) {
            toast.error("Veuillez sélectionner au moins une boutique.");
            return;
        }

        setLoading(true);

        try {
            const result = await createAuditSessionAction(selectedShops, selectedSegments, notes, auditDate);

            if (result.success && result.auditId) {
                toast.success(`Session ${result.reference} créée avec succès !`);
                setOpen(false);
                router.push(`/inventory/audits/${result.auditId}`);
            } else {
                toast.error(result.error || "Échec de création.");
            }
        } catch (err) {
            toast.error("Erreur réseau.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="h-9 px-4 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 gap-2 cursor-pointer shadow-sm">
                    <ScanLine className="w-4 h-4" />
                    <span>Lancer un Audit Physique</span>
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg bg-card border-border text-card-foreground rounded-2xl shadow-xl">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                        <ScanLine className="w-5 h-5 text-primary" />
                        Nouvelle Session d'Inventaire Unitaire
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground font-light">
                        Sélectionnez une ou plusieurs boutiques et segments métier pour figer le stock.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreate} className="space-y-4 pt-2">
                    {/* Date */}
                    <div className="space-y-1">
                        <Label className="text-xs font-semibold flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-primary" /> Date de l'Audit
                        </Label>
                        <input
                            type="date"
                            value={auditDate}
                            max={todayStr}
                            onChange={(e) => setAuditDate(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl border border-input bg-muted/20 text-xs outline-none font-mono font-medium"
                            required
                        />
                    </div>

                    {/* Multi-Sélection Boutiques */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-muted-foreground" /> Boutiques / Entrepôts Cibles
                        </Label>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-muted/10 border border-border rounded-xl">
                            {shops.map((s) => {
                                const active = selectedShops.includes(s.id);
                                return (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => toggleShop(s.id)}
                                        className={cn(
                                            "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all flex items-center gap-1 cursor-pointer",
                                            active
                                                ? "bg-primary/10 border-primary text-primary font-semibold"
                                                : "bg-card border-border text-muted-foreground hover:bg-accent"
                                        )}
                                    >
                                        {active && <Check className="w-3 h-3 text-primary" />}
                                        <span>{s.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Multi-Sélection Segments */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-muted-foreground" /> Segments Métier
                        </Label>
                        <div className="flex flex-wrap gap-1.5 p-1 bg-muted/10 border border-border rounded-xl">
                            {AVAILABLE_SEGMENTS.map((seg) => {
                                const active = selectedSegments.includes(seg.id);
                                return (
                                    <button
                                        key={seg.id}
                                        type="button"
                                        onClick={() => toggleSegment(seg.id)}
                                        className={cn(
                                            "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all flex items-center gap-1 cursor-pointer",
                                            active
                                                ? "bg-primary/10 border-primary text-primary font-semibold"
                                                : "bg-card border-border text-muted-foreground hover:bg-accent"
                                        )}
                                    >
                                        {active && <Check className="w-3 h-3 text-primary" />}
                                        <span>{seg.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1">
                        <Label className="text-xs font-semibold flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-muted-foreground" /> Notes / Référence
                        </Label>
                        <input
                            type="text"
                            placeholder="Ex: Contrôle physique de clôture"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl border border-input bg-muted/20 text-xs outline-none"
                        />
                    </div>

                    <div className="pt-2 flex justify-end gap-2 border-t border-border/40">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-9 text-xs rounded-xl cursor-pointer">
                            Annuler
                        </Button>
                        <Button type="submit" disabled={loading} className="h-9 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 cursor-pointer min-w-[130px]">
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : "Initialiser Snapshot"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}