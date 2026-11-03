// app/inventory/audits/_components/RfidScanZone.tsx
"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Loader2, Radio, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    useRecordRfidBatch,
    type RfidBatchResponse,
} from "../_lib/hooks/use-record-rfid-batch";

interface Props {
    auditId: string;
    isReadOnly: boolean;
    onSuccess?: (data: RfidBatchResponse) => void;
}

/**
 * Parse la textarea :
 * - split sur retour ligne / virgule / point-virgule
 * - trim + uppercase
 * - dédoublonnage case-insensitive
 */
function parseEpcs(raw: string): {
    unique: string[];
    duplicatesInInput: number;
} {
    if (!raw.trim()) return { unique: [], duplicatesInInput: 0 };
    const parts = raw.split(/[\n,;]+/);
    const seen = new Set<string>();
    let duplicatesInInput = 0;
    for (const p of parts) {
        const clean = p.trim().toUpperCase();
        if (!clean) continue;
        if (seen.has(clean)) {
            duplicatesInInput++;
        } else {
            seen.add(clean);
        }
    }
    return { unique: Array.from(seen), duplicatesInInput };
}

export function RfidScanZone({ auditId, isReadOnly, onSuccess }: Props) {
    const [raw, setRaw] = useState("");
    const [lastResult, setLastResult] = useState<RfidBatchResponse | null>(
        null,
    );
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const parsed = useMemo(() => parseEpcs(raw), [raw]);

    const mutation = useRecordRfidBatch(auditId, {
        onSuccess: (data) => {
            setLastResult(data);
            setRaw("");
            textareaRef.current?.focus();
            onSuccess?.(data);
        },
    });

    const handleSubmit = useCallback(() => {
        if (parsed.unique.length === 0 || mutation.isPending || isReadOnly) {
            return;
        }
        mutation.mutate({ epcs: parsed.unique });
    }, [parsed, mutation, isReadOnly]);

    const handleClear = useCallback(() => {
        setRaw("");
        setLastResult(null);
        textareaRef.current?.focus();
    }, []);

    const isDisabled = isReadOnly || mutation.isPending;

    return (
        <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/60 bg-muted/20">
                <div className="flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                        Mode RFID · Batch EPC
                    </span>
                </div>
                {parsed.unique.length > 0 && (
                    <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                        {parsed.unique.length} EPC unique
                        {parsed.unique.length > 1 ? "s" : ""}
                        {parsed.duplicatesInInput > 0 && (
                            <span className="text-amber-600 ml-1">
                                · {parsed.duplicatesInInput} doublon
                                {parsed.duplicatesInInput > 1 ? "s" : ""} ignoré
                                {parsed.duplicatesInInput > 1 ? "s" : ""}
                            </span>
                        )}
                    </span>
                )}
            </div>

            {/* Body */}
            <div className="p-3 sm:p-4 space-y-3">
                <textarea
                    ref={textareaRef}
                    value={raw}
                    onChange={(e) => setRaw(e.target.value)}
                    disabled={isDisabled}
                    placeholder={
                        "Coller les EPC (un par ligne)\n\nEx :\nE280110520008B9D5F0A1234\nE280110520008B9D5F0A5678"
                    }
                    rows={6}
                    className={cn(
                        "w-full px-2.5 py-2 rounded-lg border border-border/60 bg-secondary/40 text-[11px] font-mono text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring/40 resize-y min-h-[120px]",
                        isDisabled && "opacity-60 cursor-not-allowed",
                    )}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            handleSubmit();
                        }
                    }}
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[10px] text-muted-foreground/70">
                        Séparateurs : retour ligne, virgule, point-virgule ·{" "}
                        <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">
                            Ctrl+Entrée
                        </kbd>{" "}
                        pour envoyer
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClear}
                            disabled={
                                mutation.isPending || (!raw && !lastResult)
                            }
                            className="h-7 px-2 text-[11px] gap-1.5"
                        >
                            <Trash2 className="w-3 h-3" />
                            Effacer
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSubmit}
                            disabled={
                                mutation.isPending ||
                                parsed.unique.length === 0 ||
                                isReadOnly
                            }
                            className="h-7 px-3 text-[11px] gap-1.5 min-w-[150px] bg-sky-600 hover:bg-sky-700 text-white"
                        >
                            {mutation.isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                                <Upload className="w-3 h-3" />
                            )}
                            {mutation.isPending
                                ? "Envoi en cours…"
                                : `Envoyer ${parsed.unique.length || ""} EPC`.trim()}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Dernier résultat */}
            {lastResult && (
                <div className="border-t border-border/60 px-4 py-2 bg-muted/10">
                    <div className="flex flex-wrap items-center gap-2 text-[10.5px]">
                        <span className="font-bold uppercase tracking-wider text-muted-foreground/70">
                            Dernier batch
                        </span>
                        <ResultChip
                            label="Nouveaux"
                            value={lastResult.added}
                            tone="emerald"
                        />
                        <ResultChip
                            label="Doublons"
                            value={lastResult.ignoredDuplicates}
                            tone="neutral"
                        />
                        <ResultChip
                            label="Déjà comptés"
                            value={lastResult.alreadyCounted}
                            tone="sky"
                        />
                        <ResultChip
                            label="Inconnus"
                            value={lastResult.unknownEpcs}
                            tone="amber"
                        />
                        <ResultChip
                            label="Hors périm."
                            value={lastResult.unexpectedAdded}
                            tone="rose"
                        />
                        <span className="ml-auto text-muted-foreground/60 font-mono text-[10px]">
                            {lastResult.productsAffected} item
                            {lastResult.productsAffected > 1 ? "s" : ""} mis à
                            jour
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Chip résultat ──────────────────────────────────────────

function ResultChip({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone: "emerald" | "neutral" | "sky" | "amber" | "rose";
}) {
    if (value === 0 && tone !== "emerald") {
        return (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-muted/40 text-muted-foreground/60 font-mono">
                <span className="font-bold">{value}</span>
                {label}
            </span>
        );
    }
    const toneClass = {
        emerald:
            "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400",
        neutral: "bg-muted/60 text-muted-foreground",
        sky: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-400",
        amber:
            "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400",
        rose: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-400",
    }[tone];
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold",
                toneClass,
            )}
        >
            <span>{value}</span>
            {label}
        </span>
    );
}