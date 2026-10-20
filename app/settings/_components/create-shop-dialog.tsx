// app/settings/shops/_components/create-shop-dialog.tsx
"use client";

import { useState } from "react";
import { Loader2, Store } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateShop } from "../_lib/hooks/use-settings";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: () => void;
}

export function CreateShopDialog({ open, onOpenChange, onCreated }: Props) {
    const create = useCreateShop();
    const [name, setName] = useState("");
    const [companyId, setCompanyId] = useState("");
    const [error, setError] = useState<string | null>(null);

    const reset = () => {
        setName("");
        setCompanyId("");
        setError(null);
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            setError("Le nom est requis");
            return;
        }

        try {
            await create.mutateAsync({
                name: name.trim(),
                odoo_company_id: companyId ? Number(companyId) : null,
                odoo_pos_ids: null,
            });
            toast.success(`Boutique ${name} créée`);
            reset();
            onOpenChange(false);
            onCreated();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur");
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next && !create.isPending) reset();
                onOpenChange(next);
            }}
        >
            <DialogContent className="max-w-md rounded-xl border-border/60 bg-card p-0 shadow-2xl gap-0">
                <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
                    <DialogTitle className="text-[15px] font-semibold flex items-center gap-2">
                        <Store className="w-4 h-4 text-sky-600" />
                        Nouvelle boutique
                    </DialogTitle>
                    <DialogDescription className="text-[11px] text-muted-foreground/80">
                        Créer une nouvelle boutique (les emplacements Odoo seront à ajouter ensuite)
                    </DialogDescription>
                </DialogHeader>

                <div className="px-5 py-4 space-y-3">
                    <div className="space-y-1">
                        <Label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                            Nom de la boutique *
                        </Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex : PB.24"
                            className="h-8 text-[11.5px]"
                            disabled={create.isPending}
                        />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                            ID Company Odoo (optionnel)
                        </Label>
                        <Input
                            type="number"
                            value={companyId}
                            onChange={(e) => setCompanyId(e.target.value)}
                            placeholder="Ex : 1"
                            className="h-8 text-[11.5px] font-mono"
                            disabled={create.isPending}
                        />
                        <p className="text-[10px] text-muted-foreground/60 italic">
                            Si renseigné, les emplacements ajoutés devront appartenir à cette company.
                        </p>
                    </div>

                    {error && (
                        <p className="text-[10px] text-rose-600 font-semibold">{error}</p>
                    )}
                </div>

                <DialogFooter className="px-5 py-3 border-t border-border/60 gap-2 sm:gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        disabled={create.isPending}
                        className="h-7 text-[11px]"
                    >
                        Annuler
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={create.isPending}
                        className="h-7 text-[11px] gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
                    >
                        {create.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                        Créer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}