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
    DialogDescription
} from "@/components/ui/dialog";
import { Loader2, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { createAuditSessionAction } from "../audits-actions";

interface NewAuditDialogProps {
    shops: { id: string; name: string }[];
}

export function NewAuditDialog({ shops }: NewAuditDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [shopId, setShopId] = useState<string>(shops[0]?.id || "");
    const [department, setDepartment] = useState<string>("Tous");
    const [notes, setNotes] = useState<string>("");

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shopId) {
            toast.error("Veuillez sélectionner une boutique.");
            return;
        }

        setLoading(true);

        const result = await createAuditSessionAction(shopId, department, notes);

        setLoading(false);

        if (result.success && result.auditId) {
            toast.success(`Session d'audit ${result.reference} créée !`);
            setOpen(false);
            // Redirection directe vers l'interface de scan interactif
            router.push(`/inventory/audits/${result.auditId}`);
        } else {
            toast.error(result.error || "Échec de la création de l'audit.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="h-9 px-4 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 gap-1.5 cursor-pointer">
                    <ScanLine className="w-4 h-4" /> Lancer un Audit Physique
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md bg-card border-border text-card-foreground rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold">Nouvelle Session d'Inventaire</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground font-light">
                        Sélectionnez la boutique physique pour démarrer le comptage au scanner.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreate} className="space-y-4 pt-2">
                    {/* Choix de la Boutique */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Boutique Physique</Label>
                        <select
                            value={shopId}
                            onChange={(e) => setShopId(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl border border-input bg-muted/20 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
                            required
                        >
                            {shops.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Choix du Département */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Département (Périmètre)</Label>
                        <select
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl border border-input bg-muted/20 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
                        >
                            <option value="Tous">Tous les Départements</option>
                            <option value="Beauty">Beauté & Cosmétiques</option>
                            <option value="Femme">Mode Femme</option>
                            <option value="Enfant">Mode Enfant</option>
                        </select>
                    </div>

                    {/* Remarques */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Notes / Emplacement (Optionnel)</Label>
                        <input
                            type="text"
                            placeholder="Ex: Rayon Perruques / Réception de Juillet"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl border border-input bg-muted/20 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            className="h-9 px-4 rounded-xl text-xs cursor-pointer"
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-9 px-4 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                    Initialisation...
                                </>
                            ) : (
                                "Démarrer le Scan"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}