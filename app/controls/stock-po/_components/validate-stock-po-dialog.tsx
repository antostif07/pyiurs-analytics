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
import { FileText, Image as ImageIcon, Loader2, ShieldCheck, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StockPoRow } from "../_lib/types";

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export default function ValidateStockPoDialog({
    order,
    open,
    onOpenChange,
    onSubmit,
    isSubmitting,
}: {
    order: StockPoRow | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (file: File, notes?: string) => Promise<void>;
    isSubmitting: boolean;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [notes, setNotes] = useState("");
    const [error, setError] = useState<string | null>(null);

    const reset = () => {
        setFile(null);
        setPreview(null);
        setNotes("");
        setError(null);
        if (inputRef.current) inputRef.current.value = "";
    };

    useEffect(() => {
        if (!open) reset();
    }, [open, order?.id]);

    const accept = (f: File) => {
        setError(null);
        if (!ALLOWED.includes(f.type)) {
            setError("Format non autorisé (PDF, JPEG, PNG ou WebP uniquement).");
            return;
        }
        if (f.size > MAX_SIZE) {
            setError("Fichier trop lourd (max 10 Mo).");
            return;
        }
        setFile(f);
        if (f.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (e) => setPreview(e.target?.result as string);
            reader.readAsDataURL(f);
        } else {
            setPreview(null);
        }
    };

    const handleSubmit = async () => {
        if (!file) {
            setError("Veuillez joindre un justificatif (PDF ou image).");
            return;
        }
        try {
            await onSubmit(file, notes.trim() || undefined);
            reset();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur inattendue");
        }
    };

    if (!order) return null;

    return (
        <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
            <DialogContent className="max-w-md rounded-xl border-border/60 bg-card p-5 shadow-2xl">
                <DialogHeader className="space-y-1 border-b border-border/60 pb-3">
                    <DialogTitle className="text-[15px] font-semibold flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        Valider le bon de commande
                    </DialogTitle>
                    <DialogDescription className="text-[11px] text-muted-foreground">
                        {order.name} · {order.partnerName}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-3">
                    <div
                        onDrop={(e) => {
                            e.preventDefault();
                            const f = e.dataTransfer.files?.[0];
                            if (f && !isSubmitting) accept(f);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onClick={() => !isSubmitting && inputRef.current?.click()}
                        className={cn(
                            "rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition-colors",
                            file
                                ? "border-emerald-300/60 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20"
                                : "border-border/60 hover:border-primary/40 hover:bg-accent/20",
                            isSubmitting && "opacity-50 cursor-not-allowed",
                        )}
                    >
                        {preview ? (
                            <div className="relative inline-block">
                                <img src={preview} alt="Aperçu" className="max-h-36 rounded-md" />
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
                        ) : file ? (
                            <div className="flex items-center justify-center gap-2 text-[11px]">
                                {file.type === "application/pdf" ? (
                                    <FileText className="w-4 h-4 text-rose-600" />
                                ) : (
                                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                                )}
                                <span className="font-semibold truncate max-w-[240px]">{file.name}</span>
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
                            <div className="space-y-1">
                                <Upload className="w-5 h-5 mx-auto text-muted-foreground/60" />
                                <p className="text-[11px] font-semibold">
                                    Cliquez ou glissez le document de validation
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                    PDF, JPEG, PNG ou WebP · max 10 Mo
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

                    <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Notes de contrôle (optionnel)..."
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
                        disabled={isSubmitting || !file}
                        className="h-7 text-[11px] gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                        Valider
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}