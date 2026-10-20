// app/settings/shops/_components/edit-shop-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Store } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shop } from "@/app/settings/_lib/types";
import { useUpdateShop } from "@/app/settings/_lib/hooks/use-settings";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shop: Shop;
}

export function EditShopDialog({ open, onOpenChange, shop }: Props) {
    const update = useUpdateShop(shop.id);
    const [name, setName] = useState(shop.name);
    const [companyId, setCompanyId] = useState(
        shop.odoo_company_id?.toString() ?? "",
    );
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setName(shop.name);
            setCompanyId(shop.odoo_company_id?.toString() ?? "");
            setError(null);
        }
    }, [open, shop]);

    const handleSubmit = async () => {
        if (!name.trim()) {
            setError("Le nom est requis");
            return;
        }

        try {
            await update.mutateAsync({
                name: name.trim(),
                odoo_company_id: companyId ? Number(companyId) : null,
            });
            toast.success("Boutique modifiée");
            onOpenChange(false);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur");
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next && !update.isPending) onOpenChange(false);
            }}
        >
            <DialogContent className="max-w-md rounded-xl border-border/60 bg-card p-0 shadow-2xl gap-0">
                <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
                    <DialogTitle className="text-[15px] font-semibold flex items-center gap-2">
                        <Store className="w-4 h-4 text-sky-600" />
                        Modifier la boutique
                    </DialogTitle>
                    <DialogDescription className="text-[11px] text-muted-foreground/80">
                        {shop.name}
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
                            className="h-8 text-[11.5px]"
                            disabled={update.isPending}
                        />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                            ID Company Odoo
                        </Label>
                        <Input
                            type="number"
                            value={companyId}
                            onChange={(e) => setCompanyId(e.target.value)}
                            placeholder="Ex : 1"
                            className="h-8 text-[11.5px] font-mono"
                            disabled={update.isPending}
                        />
                        <p className="text-[10px] text-muted-foreground/60 italic">
                            Si modifié, vérifiez que les emplacements existants
                            correspondent à la nouvelle company.
                        </p>
                    </div>

                    {error && (
                        <p className="text-[10px] text-rose-600 font-semibold">
                            {error}
                        </p>
                    )}
                </div>

                <DialogFooter className="px-5 py-3 border-t border-border/60 gap-2 sm:gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        disabled={update.isPending}
                        className="h-7 text-[11px]"
                    >
                        Annuler
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={update.isPending}
                        className="h-7 text-[11px] gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
                    >
                        {update.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                            <Save className="w-3 h-3" />
                        )}
                        Enregistrer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}