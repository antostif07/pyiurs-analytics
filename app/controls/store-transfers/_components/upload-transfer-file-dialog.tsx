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
import { FileText, Image as ImageIcon, Loader2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StoreTransferRow } from "../_lib/types";

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export default function UploadTransferFileDialog({
    transfer,
    kind,
    open,
    onOpenChange,
    onSubmit,
    isSubmitting,
}: {
    transfer: StoreTransferRow | null;
    kind: "dp_out" | "dp_in" | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (file: File) => Promise<void>;
    isSubmitting: boolean;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const reset = () => {
        setFile(null);
        setPreview(null);
        setError(null);
        if (inputRef.current) inputRef.current.value = "";
    };

    useEffect(() => {
        if (!open) reset();
    }, [open, transfer?.saleOrderId, kind]);

    const accept = (f: File) => {
        setError(null);
        if (!ALLOWED.includes(f.type)) {
            setError("Format non autorisé (PDF, JPEG, PNG ou WebP).");
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
            setError("Sélectionnez un fichier.");
            return;
        }
        try {
            await onSubmit(file);
            reset();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur inattendue");
        }
    };

    if (!transfer || !kind) return null;

    const isOut = kind === "dp_out";
    const label = isOut ? "Validation DP/OUT (Expédition)" : "Validation DP/IN (Réception)";

    return (
        <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
            <DialogContent className="max-w-md rounded-xl border-border/60 bg-card p-5 shadow-2xl">
                <DialogHeader className="space-y-1 border-b border-border/60 pb-3">
                    <DialogTitle className="text-[15px] font-semibold">{label}</DialogTitle>
                    <DialogDescription className="text-[11px] text-muted-foreground">
                        {transfer.saleOrderName}
                        {transfer.generatedPo ? ` → ${transfer.generatedPo.name}` : ""} ·{" "}
                        {transfer.destinationPartnerName}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-3 space-y-3">
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
                                ? isOut
                                    ? "border-sky-300/60 bg-sky-50/30 dark:bg-sky-950/20"
                                    : "border-violet-300/60 bg-violet-50/30 dark:bg-violet-950/20"
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
                                    Cliquez ou glissez le document {isOut ? "DP/OUT" : "DP/IN"}
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
                    {error && (
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">{error}</p>
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
                        className={cn(
                            "h-7 text-[11px] gap-1.5 text-white",
                            isOut ? "bg-sky-600 hover:bg-sky-700" : "bg-violet-600 hover:bg-violet-700",
                        )}
                    >
                        {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        Enregistrer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}