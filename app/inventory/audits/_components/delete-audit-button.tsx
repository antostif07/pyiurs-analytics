"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { deleteAuditSessionAction } from "../_lib/audits-actions";

interface DeleteAuditButtonProps {
    auditId: string;
    reference: string;
}

export function DeleteAuditButton({ auditId, reference }: DeleteAuditButtonProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        setLoading(true);
        const result = await deleteAuditSessionAction(auditId);
        setLoading(false);

        if (result.success) {
            toast.success(`Session d'audit ${reference} supprimée.`);
            setOpen(false);
        } else {
            toast.error(result.error || "Échec de la suppression.");
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                    title="Supprimer cet audit"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </Button>
            </AlertDialogTrigger>

            <AlertDialogContent className="bg-card text-card-foreground border-border rounded-2xl max-w-md">
                <AlertDialogHeader>
                    <div className="flex items-center gap-2 text-destructive mb-1">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <AlertDialogTitle className="text-base font-bold">
                            Supprimer l'Audit {reference} ?
                        </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-xs text-muted-foreground font-light leading-relaxed">
                        Cette action est irréversible. Toutes les lignes d'inventaire scannées et la démarque associée à cette session seront définitivement effacées de la base de données.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter className="gap-2 pt-2">
                    <AlertDialogCancel className="h-9 rounded-xl text-xs cursor-pointer">
                        Annuler
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault(); // Empêche la fermeture prématurée avant la fin de l'action asynchrone
                            handleDelete();
                        }}
                        disabled={loading}
                        className="h-9 rounded-xl text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                Suppression...
                            </>
                        ) : (
                            "Confirmer la suppression"
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}