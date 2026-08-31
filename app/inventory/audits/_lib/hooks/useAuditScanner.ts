"use client";

import { useRef, useCallback, useState } from "react";
import { playScanSound } from "../../_lib/utils/sound-effects";
import { recordBarcodeScanAction } from "../../_lib/audits-actions";
import { StockAuditItem } from "../../_lib/types";
import { toast } from "sonner";

export function useAuditScanner(
    auditId: string,
    isReadOnly: boolean,
    onScanSuccess: (cleanCode: string, item: StockAuditItem) => void
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
                const result = await recordBarcodeScanAction(auditId, cleanCode);
                setBarcodeInput("");

                if (result.success && result.item) {
                    if (soundEnabled) playScanSound("success");

                    if (result.isUnexpected) {
                        toast.warning(result.message || `Produit inattendu ajouté : ${cleanCode}`, {
                            duration: 4000,
                        });
                    } else {
                        toast.success(`Scanné (1/1) : ${cleanCode}`);
                    }

                    // Cast sécurisé vers StockAuditItem
                    onScanSuccess(cleanCode, result.item as StockAuditItem);
                } else if (result.isDuplicate) {
                    if (soundEnabled) playScanSound("error");
                    toast.warning(result.error);
                } else {
                    if (soundEnabled) playScanSound("error");
                    toast.error(result.error || "Erreur lors du scan.");
                }
            } catch (err) {
                if (soundEnabled) playScanSound("error");
                toast.error(err instanceof Error ? err.message : "Erreur réseau lors du scan.");
            } finally {
                setIsScanning(false);
                requestAnimationFrame(() => enforceFocus());
            }
        },
        [barcodeInput, isReadOnly, isScanning, soundEnabled, auditId, onScanSuccess, enforceFocus]
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