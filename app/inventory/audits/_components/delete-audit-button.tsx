// app/inventory/audits/_components/delete-audit-button.tsx
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
import { useDeleteAudit } from "../_lib/hooks/use-audit-mutations";

interface DeleteAuditButtonProps {
    auditId: string;
    reference: string;
}

export function DeleteAuditButton({
    auditId,
    reference,
}: DeleteAuditButtonProps) {
    const [open, setOpen] = useState(false);
    const deleteMutation = useDeleteAudit();

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault(); // garde le dialog ouvert pendant l'appel

        try {
            await deleteMutation.mutateAsync(auditId);
            toast.success(`Session ${reference} supprimée`);
            setOpen(false);
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Échec de la suppression",
            );
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md"
                    title="Supprimer cet audit"
                >
                    <Trash2 className="w-3 h-3" />
                </Button>
            </AlertDialogTrigger>

            <AlertDialogContent className="rounded-xl border-border/60 bg-card p-0 shadow-2xl gap-0 max-w-md">
                <AlertDialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
                    <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-1">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <AlertDialogTitle className="text-[15px] font-semibold tracking-tight">
                            Supprimer l&apos;audit {reference} ?
                        </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-[11px] text-muted-foreground/80 leading-relaxed">
                        Cette action est <strong>irréversible</strong>. Toutes
                        les lignes d&apos;inventaire scannées et la démarque
                        associée à cette session seront définitivement effacées.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter className="px-5 py-3 gap-2 sm:gap-2">
                    <AlertDialogCancel
                        className="h-7 px-3 text-[11px]"
                        disabled={deleteMutation.isPending}
                    >
                        Annuler
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                        className="h-7 px-3 text-[11px] font-semibold gap-1.5 bg-rose-600 text-white hover:bg-rose-700"
                    >
                        {deleteMutation.isPending ? (
                            <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Suppression…
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-3 h-3" />
                                Supprimer
                            </>
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}