// app/inventory/purchases/import-generator/_lib/session-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient, getServerAuth } from "@/lib/supabase/server";
import type { ProductLine } from "../import-types";
import type { Json } from "@/lib/supabase/database.types";

function toJson<T>(value: T): Json {
    return value as unknown as Json;
}

/**
 * Mappe un row Supabase (avec colonnes JSONB typées `Json`)
 * vers notre type strict `PurchaseImportSession`.
 */
function rowToSession(row: Record<string, unknown>): PurchaseImportSession {
    return {
        id: row.id as string,
        last_modified_by: (row.last_modified_by as string | null) ?? null,
        selected_po_id: row.selected_po_id as number,
        selected_po_data: row.selected_po_data as PurchaseImportSession["selected_po_data"],
        polog: (row.polog as string) ?? "",
        date_chargement: (row.date_chargement as string) ?? "",
        departement: (row.departement as string) ?? "Beauty",
        products: (row.products as ProductLine[]) ?? [],
        status: row.status as "draft" | "exported" | "archived",
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
    };
}

// ─── Types ──────────────────────────────────────────────────

export interface PurchaseImportSession {
    id: string;
    last_modified_by: string | null;
    selected_po_id: number;
    selected_po_data: {
        id: number;
        name: string;
        externalId: string;
        supplierRef: string;
        supplierId: number;
        supplierName: string;
    };
    polog: string;
    date_chargement: string;
    departement: string;
    products: ProductLine[];
    status: "draft" | "exported" | "archived";
    created_at: string;
    updated_at: string;
}

interface SavePayload {
    sessionId: string;
    selected_po_id: number;
    selected_po_data: PurchaseImportSession["selected_po_data"];
    polog: string;
    date_chargement: string;
    departement: string;
    products: ProductLine[];
    /** updated_at local — détection de conflit */
    knownUpdatedAt?: string;
}

// ─── Actions ────────────────────────────────────────────────

/**
 * Cherche la session draft existante pour ce PO (peu importe l'utilisateur),
 * ou en crée une nouvelle vierge.
 */
export async function findOrCreateSession(
    selectedPoId: number,
    selectedPoData: PurchaseImportSession["selected_po_data"],
): Promise<{ session: PurchaseImportSession | null; error?: string }> {
    const auth = await getServerAuth();
    if (!auth.user) return { session: null, error: "Non authentifié" };

    const supabase = await createClient();

    // 1. Cherche la session draft existante pour ce PO
    const { data: existing } = await supabase
        .from("purchase_import_sessions")
        .select("*")
        .eq("selected_po_id", selectedPoId)
        .eq("status", "draft")
        .maybeSingle();

    if (existing) return { session: rowToSession(existing) };

    // 2. Sinon, crée une session vierge
    const { data: created, error } = await supabase
        .from("purchase_import_sessions")
        .insert({
            last_modified_by: auth.user.id,
            selected_po_id: selectedPoId,
            selected_po_data: selectedPoData,
            products: [],
            status: "draft",
        })
        .select("*")
        .single();

    if (error) {
        // Race condition possible : quelqu'un a créé en parallèle
        // → on retente un SELECT
        const { data: retry } = await supabase
            .from("purchase_import_sessions")
            .select("*")
            .eq("selected_po_id", selectedPoId)
            .eq("status", "draft")
            .maybeSingle();

        if (retry) return { session: rowToSession(retry) };
        return { session: null, error: error.message };
    }

    return { session: rowToSession(created) };
}

/**
 * Upsert d'une session (auto-save).
 * Retourne `conflict: true` si `knownUpdatedAt` ne correspond plus (autre user a modifié).
 */
export async function saveSession(payload: SavePayload): Promise<{
    session: PurchaseImportSession | null;
    conflict?: boolean;
    error?: string;
}> {
    const auth = await getServerAuth();
    if (!auth.user) return { session: null, error: "Non authentifié" };

    const supabase = await createClient();

    // ─── 1. Vérif conflit (optimistic lock simple) ──────────
    if (payload.knownUpdatedAt) {
        const { data: fresh } = await supabase
            .from("purchase_import_sessions")
            .select("updated_at")
            .eq("id", payload.sessionId)
            .maybeSingle();

        if (fresh && fresh.updated_at !== payload.knownUpdatedAt) {
            return {
                session: null,
                conflict: true,
                error: "Session modifiée par un autre utilisateur",
            };
        }
    }

    // ─── 2. Update ──────────────────────────────────────────
    const { data, error } = await supabase
        .from("purchase_import_sessions")
        .update({
            last_modified_by: auth.user.id,
            selected_po_data: payload.selected_po_data,
            polog: payload.polog,
            date_chargement: payload.date_chargement,
            departement: payload.departement,
            products: toJson(payload.products),
        })
        .eq("id", payload.sessionId)
        .eq("status", "draft")
        .select("*")
        .single();

    if (error) return { session: null, error: error.message };
    return { session: rowToSession(data) };
}

/**
 * Charge une session par ID (deep-link via ?session=).
 */
export async function loadSessionById(
    sessionId: string,
): Promise<{ session: PurchaseImportSession | null; error?: string }> {
    const auth = await getServerAuth();
    if (!auth.user) return { session: null, error: "Non authentifié" };

    const supabase = await createClient();
    const { data, error } = await supabase
        .from("purchase_import_sessions")
        .select("*")
        .eq("id", sessionId)
        .maybeSingle();

    if (error) return { session: null, error: error.message };
    return { session: data as PurchaseImportSession | null };
}

/**
 * Marque la session comme exportée (libère le slot draft pour ce PO).
 */
export async function markSessionExported(
    sessionId: string,
): Promise<{ success: boolean; error?: string }> {
    const auth = await getServerAuth();
    if (!auth.user) return { success: false, error: "Non authentifié" };

    const supabase = await createClient();
    const { error } = await supabase
        .from("purchase_import_sessions")
        .update({
            status: "exported",
            exported_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

    if (error) return { success: false, error: error.message };
    revalidatePath("/inventory/purchases/import-generator");
    return { success: true };
}

/**
 * Vide la session courante (garde le PO, reset les champs).
 */
export async function resetSession(
    sessionId: string,
    selectedPoData: PurchaseImportSession["selected_po_data"],
): Promise<{ session: PurchaseImportSession | null; error?: string }> {
    const auth = await getServerAuth();
    if (!auth.user) return { session: null, error: "Non authentifié" };

    const supabase = await createClient();
    const { data, error } = await supabase
        .from("purchase_import_sessions")
        .update({
            last_modified_by: auth.user.id,
            selected_po_data: selectedPoData,
            polog: "",
            date_chargement: "",
            departement: "Beauty",
            products: [],
        })
        .eq("id", sessionId)
        .eq("status", "draft")
        .select("*")
        .single();

    if (error) return { session: null, error: error.message };
    return { session: rowToSession(data) };
}