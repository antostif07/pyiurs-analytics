// app/inventory/purchases/import-generator/_lib/hooks/use-hs-code-lookup.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { getLastProductByHsCode } from "../../../import-actions";
import {
    applyHsCodeMatch,
    applyHsCodeNoMatch,
    type MatchedHsCodeProduct,
} from "../product-form-logic";
import type { ProductFormState } from "../../import-types";
import type { Departement } from "../../_components/global-params-section";

export type LookupStatus = "idle" | "success" | "not-found" | "error";

interface Options {
    form: ProductFormState;
    departement: Departement;
    currentCodeRemise: string;
    onFieldsUpdate: (fields: Partial<ProductFormState>) => void;
}

/**
 * Recherche un produit Odoo par son code HS (onBlur / Enter).
 *
 * - Gère loading + statut visuel
 * - Applique la cascade de champs si match
 * - Applique le recalcul simple si pas de match
 * - Ignore les réponses obsolètes (race condition)
 */
export function useHsCodeLookup({
    form,
    departement,
    currentCodeRemise,
    onFieldsUpdate,
}: Options) {
    const [isLooking, setIsLooking] = useState(false);
    const [status, setStatus] = useState<LookupStatus>("idle");

    // Snapshot récent (évite de recréer `lookup` à chaque frappe)
    const formRef = useRef(form);
    useEffect(() => {
        formRef.current = form;
    }, [form]);

    // Id pour ignorer les réponses obsolètes
    const requestIdRef = useRef(0);

    // Reset du badge auto après 3s (avec cleanup propre)
    useEffect(() => {
        if (status === "idle") return;
        const t = setTimeout(() => setStatus("idle"), 3000);
        return () => clearTimeout(t);
    }, [status]);

    const lookup = useCallback(
        async (rawHs: string) => {
            const cleanHs = rawHs.trim();
            if (!cleanHs) return;

            const myId = ++requestIdRef.current;
            setIsLooking(true);
            setStatus("idle");

            try {
                const matched =
                    (await getLastProductByHsCode(cleanHs)) as
                    | MatchedHsCodeProduct
                    | null;

                // Réponse obsolète (une autre recherche a démarré)
                if (myId !== requestIdRef.current) return;

                // L'utilisateur a modifié le champ entre temps → on abandonne
                // pour ne pas écraser sa saisie en cours.
                const currentInput = formRef.current.codeHs.trim();
                if (currentInput !== cleanHs) return;

                if (matched) {
                    const fields = applyHsCodeMatch(
                        formRef.current,
                        matched,
                        departement,
                        currentCodeRemise,
                        cleanHs,
                    );
                    onFieldsUpdate(fields);
                    setStatus("success");
                    toast.success(`Produit Odoo trouvé : ${cleanHs}`);
                } else {
                    const fields = applyHsCodeNoMatch(
                        formRef.current,
                        cleanHs,
                        departement,
                        currentCodeRemise,
                    );
                    onFieldsUpdate(fields);
                    setStatus("not-found");
                    toast.info(`Nouveau Code HS ${cleanHs} (non trouvé dans Odoo).`);
                }
            } catch (err) {
                if (myId !== requestIdRef.current) return;
                console.error("[HS_CODE_LOOKUP]", err);
                setStatus("error");
                toast.error("Erreur lors de la recherche dans Odoo.");
            } finally {
                if (myId === requestIdRef.current) setIsLooking(false);
            }
        },
        [departement, currentCodeRemise, onFieldsUpdate],
    );

    return { lookup, isLooking, status };
}