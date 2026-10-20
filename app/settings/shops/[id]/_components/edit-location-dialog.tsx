// app/settings/shops/[id]/_components/edit-location-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, MapPin } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateLocation } from "../../../_lib/hooks/use-settings";
import type { ShopLocation } from "../../../_lib/types";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shopId: string;
    location: ShopLocation;
}

export function EditLocationDialog({
    open,
    onOpenChange,
    shopId,
    location,
}: Props) {
    const update = useUpdateLocation(shopId);
    const [label, setLabel] = useState(location.label ?? "");
    const [sortOrder, setSortOrder] = useState(String(location.sort_order));
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setLabel(location.label ?? "");
            setSortOrder(String(location.sort_order));
            setError(null);
        }
    }, [open, location]);

    const handleSubmit = async () => {
        const orderNum = Number(sortOrder);
        if (!Number.isFinite(orderNum) || orderNum < 0) {
            setError("Ordre invalide (0 ou plus)");
            return;
        }

        try {
            await update.mutateAsync({
                locId: location.id,
                payload: {
                    label: label.trim() || null,
                    sort_order: Math.floor(orderNum),
                },
            });
            toast.success("Emplacement modifié");
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
                        <MapPin className="w-4 h-4 text-sky-600" />
                        Modifier l&apos;emplacement
                    </DialogTitle>
                    <DialogDescription className="text-[11px] text-muted-foreground/80">
                        {location.odoo_location_name} · #{location.odoo_location_id}
                    </DialogDescription>
                </DialogHeader>

                <div className="px-5 py-4 space-y-3">
                    <div className="space-y-1">
                        <Label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                            Label custom (optionnel)
                        </Label>
                        <Input
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder={`Défaut : ${location.odoo_location_name}`}
                            className="h-8 text-[11.5px]"
                            disabled={update.isPending}
                        />
                        <p className="text-[10px] text-muted-foreground/60 italic">
                            Nom lisible à utiliser dans les sélecteurs et les
                            rapports (ex : "Caisse principale").
                        </p>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                            Ordre d&apos;affichage
                        </Label>
                        <Input
                            type="number"
                            min={0}
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                            className="h-8 text-[11.5px] font-mono"
                            disabled={update.isPending}
                        />
                        <p className="text-[10px] text-muted-foreground/60 italic">
                            Plus petit = affiché en premier.
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