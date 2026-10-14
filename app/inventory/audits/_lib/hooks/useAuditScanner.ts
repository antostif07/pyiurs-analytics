// app/inventory/audits/[id]/_lib/hooks/useAuditScanner.ts (ou l'emplacement actuel)
"use client";

import { useRef, useCallback, useState } from "react";
import { playScanSound } from "../../_lib/utils/sound-effects";
import type { StockAuditItem } from "../../_lib/types";
import { toast } from "sonner";

interface ScanApiResponse {
    success: boolean;
    item?: StockAuditItem;
    isUnexpected?: boolean;
    isDuplicate?: boolean;
    isUnknown?: boolean;
    error?: string;
    message?: string;
}

export function useAuditScanner(
    auditId: string,
    isReadOnly: boolean,
    onScanSuccess: (cleanCode: string, item: StockAuditItem) => void,
) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [barcodeInput, setBarcodeInput] = useState("");
    const [isScanning, setIsScanning] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);

    const enforceFocus = useCallback(() => {
        if (
            !isReadOnly &&
            document.activeElement?.tagName !== "INPUT" &&
            document.activeElement?.tagName !== "TEXTAREA"
        ) {
            inputRef.current?.focus();
        }
    }, [isReadOnly]);

    const handleScanSubmit = useCallback(
        async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const cleanCode = barcodeInput.trim().toUpperCase();
            if (!cleanCode || isReadOnly || isScanning) return;

            setIsScanning(true);
            try {
                // ✅ Appel HTTP au lieu de Server Action
                const res = await fetch(
                    `/api/inventory/audits/${auditId}/scan`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ barcode: cleanCode }),
                    },
                );

                const result: ScanApiResponse = await res.json();

                setBarcodeInput("");

                if (result.success && result.item) {
                    if (soundEnabled) playScanSound("success");

                    if (result.isUnexpected) {
                        toast.warning(
                            result.message ||
                            `Produit inattendu ajouté : ${cleanCode}`,
                            { duration: 4000 },
                        );
                    } else {
                        toast.success(`Scanné (1/1) : ${cleanCode}`);
                    }

                    onScanSuccess(cleanCode, result.item);
                } else if (result.isDuplicate) {
                    if (soundEnabled) playScanSound("error");
                    toast.warning(result.error ?? "Doublon détecté");
                } else {
                    if (soundEnabled) playScanSound("error");
                    toast.error(result.error ?? "Erreur lors du scan.");
                }
            } catch (err) {
                if (soundEnabled) playScanSound("error");
                toast.error(
                    err instanceof Error
                        ? err.message
                        : "Erreur réseau lors du scan.",
                );
            } finally {
                setIsScanning(false);
                requestAnimationFrame(() => enforceFocus());
            }
        },
        [
            barcodeInput,
            isReadOnly,
            isScanning,
            soundEnabled,
            auditId,
            onScanSuccess,
            enforceFocus,
        ],
    );

    return {
        inputRef,
        barcodeInput,
        setBarcodeInput,
        isScanning,
        soundEnabled,
        setSoundEnabled,
        handleScanSubmit,
        enforceFocus,
    };
}