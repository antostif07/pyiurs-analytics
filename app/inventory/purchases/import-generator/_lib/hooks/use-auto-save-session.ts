// app/inventory/purchases/import-generator/_lib/hooks/use-auto-save-session.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
    saveSession,
    findOrCreateSession,
    markSessionExported,
    type PurchaseImportSession,
} from "../session-actions";
import type { ProductLine } from "../../import-types";
import { OdooPurchaseOrderOption } from "../../../_lib/_components/purchase-order-selector";

const DEBOUNCE_MS = 1500;

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

interface UseAutoSaveOptions {
    sessionId: string | null;
    knownUpdatedAt: string | null;
    selectedPo: OdooPurchaseOrderOption | null;
    polog: string;
    dateChargement: string;
    departement: string;
    products: ProductLine[];
    onSessionReady: (session: PurchaseImportSession) => void;
    onConflict: (session: PurchaseImportSession) => void;
}

export function useAutoSaveSession({
    sessionId,
    knownUpdatedAt,
    selectedPo,
    polog,
    dateChargement,
    departement,
    products,
    onSessionReady,
    onConflict,
}: UseAutoSaveOptions) {
    const [status, setStatus] = useState<SaveStatus>("idle");
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const currentSessionIdRef = useRef<string | null>(sessionId);
    const currentUpdatedAtRef = useRef<string | null>(knownUpdatedAt);
    // Évite la sauvegarde immédiate après chargement (sinon update inutile)
    const skipNextSaveRef = useRef(false);

    // Sync refs si props changent depuis l'extérieur
    useEffect(() => {
        currentSessionIdRef.current = sessionId;
    }, [sessionId]);

    useEffect(() => {
        currentUpdatedAtRef.current = knownUpdatedAt;
    }, [knownUpdatedAt]);

    /**
     * Charge ou crée la session d'un PO, puis hydrate le state via onSessionReady.
     * À appeler manuellement au clic sur un PO (dans le client).
     */
    const ensureSessionForPo = useCallback(
        async (po: OdooPurchaseOrderOption) => {
            setStatus("saving");
            try {
                const { session, error } = await findOrCreateSession(po.id, {
                    id: po.id,
                    name: po.name,
                    externalId: po.externalId,
                    supplierRef: po.supplierRef,
                    supplierId: po.supplierId,
                    supplierName: po.supplierName,
                });

                if (error || !session) {
                    setStatus("error");
                    toast.error(error ?? "Impossible de charger la session");
                    return null;
                }

                currentSessionIdRef.current = session.id;
                currentUpdatedAtRef.current = session.updated_at;

                // Skip le prochain debounce pour éviter un save immédiat
                skipNextSaveRef.current = true;

                setStatus("saved");
                setLastSavedAt(new Date(session.updated_at));
                onSessionReady(session);
                return session;
            } catch (e) {
                setStatus("error");
                toast.error("Erreur de chargement de la session");
                return null;
            }
        },
        [onSessionReady],
    );

    const triggerSave = useCallback(async () => {
        const sid = currentSessionIdRef.current;
        if (!sid || !selectedPo) return;

        setStatus("saving");
        try {
            const { session, conflict, error } = await saveSession({
                sessionId: sid,
                selected_po_id: selectedPo.id,
                selected_po_data: {
                    id: selectedPo.id,
                    name: selectedPo.name,
                    externalId: selectedPo.externalId,
                    supplierRef: selectedPo.supplierRef,
                    supplierId: selectedPo.supplierId,
                    supplierName: selectedPo.supplierName,
                },
                polog,
                date_chargement: dateChargement,
                departement,
                products,
                knownUpdatedAt: currentUpdatedAtRef.current ?? undefined,
            });

            if (conflict) {
                // Charge la version serveur pour proposer un refresh
                const { session: fresh } = await (async () => {
                    const mod = await import("../session-actions");
                    return mod.loadSessionById(sid);
                })();
                if (fresh) {
                    currentUpdatedAtRef.current = fresh.updated_at;
                    onConflict(fresh);
                }
                setStatus("error");
                return;
            }

            if (error || !session) {
                setStatus("error");
                console.error("[auto-save] error:", error);
                return;
            }

            currentUpdatedAtRef.current = session.updated_at;
            setStatus("saved");
            setLastSavedAt(new Date(session.updated_at));
        } catch (e) {
            setStatus("error");
            console.error("[auto-save] exception:", e);
        }
    }, [
        selectedPo,
        polog,
        dateChargement,
        departement,
        products,
        onConflict,
    ]);

    // Debounced save à chaque changement
    useEffect(() => {
        if (!currentSessionIdRef.current || !selectedPo) return;

        if (skipNextSaveRef.current) {
            skipNextSaveRef.current = false;
            return;
        }

        if (timerRef.current) clearTimeout(timerRef.current);
        setStatus("pending");
        timerRef.current = setTimeout(() => {
            void triggerSave();
        }, DEBOUNCE_MS);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [
        selectedPo,
        polog,
        dateChargement,
        departement,
        products,
        triggerSave,
    ]);

    const flush = useCallback(async () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        await triggerSave();
    }, [triggerSave]);

    const markAsExported = useCallback(async () => {
        const sid = currentSessionIdRef.current;
        if (!sid) return;
        await markSessionExported(sid);
        toast.success("Session marquée comme exportée");
        // Reset local : la prochaine ouverture du PO créera une nouvelle session
        currentSessionIdRef.current = null;
        currentUpdatedAtRef.current = null;
    }, []);

    return {
        status,
        lastSavedAt,
        ensureSessionForPo,
        flush,
        markAsExported,
    };
}