"use client";

import { useState, useRef } from "react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, Image as ImageIcon, Loader2, ShieldCheck, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExpenseRow } from "../_lib/types";

interface ValidateExpenseDialogProps {
    expense: ExpenseRow | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (validationFile: File, proofFile: File | undefined, notes?: string) => Promise<void>;
    isSubmitting: boolean;
}

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function FileDropzone({
    label,
    hint,
    file,
    onFile,
    onClear,
    disabled,
    tone,
}: {
    label: string;
    hint: string;
    file: File | null;
    onFile: (f: File) => void;
    onClear: () => void;
    disabled: boolean;
    tone: "sky" | "violet";
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

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
        onFile(f);
        if (f.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (e) => setPreview(e.target?.result as string);
            reader.readAsDataURL(f);
        } else {
            setPreview(null);
        }
    };

    const clear = () => {
        setPreview(null);
        setError(null);
        if (inputRef.current) inputRef.current.value = "";
        onClear();
    };

    const toneClasses =
        tone === "sky"
            ? { border: "border-sky-300/60 dark:border-sky-800/60", bg: "bg-sky-50/30 dark:bg-sky-950/20" }
            : { border: "border-violet-300/60 dark:border-violet-800/60", bg: "bg-violet-50/30 dark:bg-violet-950/20" };

    return (
        <div>
            <div className="flex items-center gap-1.5 mb-1">
                {tone === "sky" ? (
                    <ShieldCheck className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                ) : (
                    <Package className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                )}
                <span className="text-[11px] font-semibold text-foreground">{label}</span>
                <span className="text-[10px] text-muted-foreground/70">{hint}</span>
            </div>

            <div
                onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f && !disabled) accept(f);
                }}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => !disabled && inputRef.current?.click()}
                className={cn(
                    "rounded-lg border-2 border-dashed p-3 text-center cursor-pointer transition-colors",
                    file
                        ? cn(toneClasses.border, toneClasses.bg)
                        : "border-border/60 hover:border-primary/40 hover:bg-accent/20",
                    disabled && "opacity-50 cursor-not-allowed",
                )}
            >
                {preview ? (
                    <div className="relative inline-block">
                        <img src={preview} alt="Aperçu" className="max-h-32 rounded-md" />
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                clear();
                            }}
                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ) : file ? (
                    <div className="flex items-center justify-center gap-2 text-[11px]">
                        <ImageIcon className="w-4 h-4 text-emerald-600" />
                        <span className="font-semibold truncate max-w-[200px]">{file.name}</span>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                clear();
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
                            Cliquez ou glissez
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
            {error && (
                <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-1">
                    {error}
                </p>
            )}
        </div>
    );
}

export default function ValidateExpenseDialog({
    expense,
    open,
    onOpenChange,
    onSubmit,
    isSubmitting,
}: ValidateExpenseDialogProps) {
    const [validationFile, setValidationFile] = useState<File | null>(null);
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [notes, setNotes] = useState("");
    const [error, setError] = useState<string | null>(null);

    const reset = () => {
        setValidationFile(null);
        setProofFile(null);
        setNotes("");
        setError(null);
    };

    const handleClose = (next: boolean) => {
        if (!next && !isSubmitting) reset();
        onOpenChange(next);
    };

    const handleSubmit = async () => {
        if (!validationFile) {
            setError("L'autorisation est obligatoire.");
            return;
        }
        try {
            await onSubmit(validationFile, proofFile ?? undefined, notes.trim() || undefined);
            reset();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur inattendue");
        }
    };

    if (!expense) return null;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md rounded-xl border-border/60 bg-card p-5 shadow-2xl">
                <DialogHeader className="space-y-1 border-b border-border/60 pb-3">
                    <DialogTitle className="text-[15px] font-semibold text-foreground tracking-tight">
                        Valider la dépense
                    </DialogTitle>
                    <DialogDescription className="text-[11px] text-muted-foreground/80">
                        {expense.name} · {expense.totalAmount.toLocaleString("fr-FR")} {expense.currency}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-3">
                    <FileDropzone
                        label="Autorisation"
                        hint="(obligatoire)"
                        file={validationFile}
                        onFile={setValidationFile}
                        onClear={() => setValidationFile(null)}
                        disabled={isSubmitting}
                        tone="sky"
                    />

                    <FileDropzone
                        label="Preuve"
                        hint="(optionnel — ex : article acheté)"
                        file={proofFile}
                        onFile={setProofFile}
                        onClear={() => setProofFile(null)}
                        disabled={isSubmitting}
                        tone="violet"
                    />

                    <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Notes (optionnel)..."
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
                        onClick={() => handleClose(false)}
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
                            <Upload className="w-3 h-3" />
                        )}
                        Valider
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}