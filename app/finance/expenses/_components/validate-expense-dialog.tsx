"use client";

import { useEffect, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    AlertTriangle,
    CheckCircle2,
    Image as ImageIcon,
    Loader2,
    ShieldCheck,
    Upload,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExpenseRow } from "../_lib/types";

interface ValidateExpenseDialogProps {
    expense: ExpenseRow | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (validationFile: File, notes?: string) => Promise<void>;
    isSubmitting: boolean;
}

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export default function ValidateExpenseDialog({
    expense,
    open,
    onOpenChange,
    onSubmit,
    isSubmitting,
}: ValidateExpenseDialogProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [validationFile, setValidationFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [notes, setNotes] = useState("");
    const [error, setError] = useState<string | null>(null);

    const reset = () => {
        setValidationFile(null);
        setPreview(null);
        setNotes("");
        setError(null);
        if (inputRef.current) inputRef.current.value = "";
    };

    useEffect(() => {
        if (!open) reset();
    }, [open, expense?.odooExpenseId]);

    const accept = (f: File) => {
        setError(null);
        if (!ALLOWED.includes(f.type)) {
            setError("Format non autorisé (JPEG, PNG, WebP ou PDF).");
            return;
        }
        if (f.size > MAX_SIZE) {
            setError("Fichier trop lourd (max 5 Mo).");
            return;
        }
        setValidationFile(f);
        if (f.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (e) => setPreview(e.target?.result as string);
            reader.readAsDataURL(f);
        } else {
            setPreview(null);
        }
    };

    const handleSubmit = async () => {
        if (!validationFile) {
            setError("L'autorisation de validation est obligatoire.");
            return;
        }
        try {
            await onSubmit(validationFile, notes.trim() || undefined);
            reset();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur inattendue");
        }
    };

    if (!expense) return null;

    return (
        <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
            <DialogContent className="max-w-md rounded-xl border-border/60 bg-card p-5 shadow-2xl">
                <DialogHeader className="space-y-1 border-b border-border/60 pb-3">
                    <DialogTitle className="text-[15px] font-semibold flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                        Valider la dépense
                    </DialogTitle>
                    <DialogDescription className="text-[11px] text-muted-foreground/80">
                        {expense.name} · {expense.totalAmount.toLocaleString("fr-FR")} {expense.currency}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-3">
                    {/* Rappel état preuve manager */}
                    {expense.hasProofPhoto ? (
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/30 px-3 py-2 text-[11px] text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>
                                Preuve jointe
                                {expense.proofAttachedBy ? ` par ${expense.proofAttachedBy}` : ""}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 rounded-lg border border-amber-200/60 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/30 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>Aucune preuve n&apos;a encore été attachée par le manager.</span>
                        </div>
                    )}

                    <div>
                        <span className="text-[11px] font-semibold text-foreground block mb-1">
                            Autorisation de validation <span className="text-muted-foreground font-normal">(obligatoire)</span>
                        </span>
                        <div
                            onDrop={(e) => {
                                e.preventDefault();
                                const f = e.dataTransfer.files?.[0];
                                if (f && !isSubmitting) accept(f);
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onClick={() => !isSubmitting && inputRef.current?.click()}
                            className={cn(
                                "rounded-lg border-2 border-dashed p-3 text-center cursor-pointer transition-colors",
                                validationFile
                                    ? "border-sky-300/60 dark:border-sky-800/60 bg-sky-50/30 dark:bg-sky-950/20"
                                    : "border-border/60 hover:border-primary/40 hover:bg-accent/20",
                                isSubmitting && "opacity-50 cursor-not-allowed",
                            )}
                        >
                            {preview ? (
                                <div className="relative inline-block">
                                    <img src={preview} alt="Aperçu" className="max-h-32 rounded-md" />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            reset();
                                        }}
                                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : validationFile ? (
                                <div className="flex items-center justify-center gap-2 text-[11px]">
                                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                                    <span className="font-semibold truncate max-w-[200px]">
                                        {validationFile.name}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            reset();
                                        }}
                                        className="text-muted-foreground hover:text-rose-500"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-0.5">
                                    <Upload className="w-4 h-4 mx-auto text-muted-foreground/60" />
                                    <p className="text-[10px] font-semibold text-foreground">
                                        Cliquez ou glissez le bon d&apos;autorisation
                                    </p>
                                </div>
                            )}
                            <input
                                ref={inputRef}
                                type="file"
                                accept={ALLOWED.join(",")}
                                className="hidden"
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) accept(f);
                                }}
                            />
                        </div>
                    </div>

                    <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Notes de validation (optionnel)..."
                        className="text-[11px] min-h-[60px]"
                        disabled={isSubmitting}
                    />

                    {error && (
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                            {error}
                        </p>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                        className="h-7 text-[11px]"
                    >
                        Annuler
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !validationFile}
                        className="h-7 text-[11px] gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                            <ShieldCheck className="w-3 h-3" />
                        )}
                        Valider
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}