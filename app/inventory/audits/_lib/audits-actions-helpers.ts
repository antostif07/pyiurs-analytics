import { createClient } from "@/lib/supabase/server";
import { odooClient } from "@/lib/odoo/odoo-json2-client";
import { SupabaseClient } from "@supabase/supabase-js";

/* ─── Types stricts alignés sur ta lib Odoo ─── */

export interface OdooQuant {
    product_id: [number, string];
    location_id: [number, string];
    quantity: number;
    company_id?: [number, string];
}

export interface OdooProduct {
    id: number;
    name: string;
    barcode: string | false;
    default_code: string | false;
    hs_code: string | false;
    standard_price: number;
    create_date: string | false;
    x_studio_segment: string | false;
    x_studio_many2one_field_21bvh: [number, string] | false;
    x_studio_many2one_field_Arl5D: [number, string] | false;
}

/* ─── Retry exponentiel (ton client gère déjà le timeout, mais pas le retry) ─── */

export async function withOdooRetry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries = 2
): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (err) {
            lastError = err;
            if (attempt === maxRetries) break;
            // Backoff : 500ms, 1000ms
            await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
        }
    }
    console.error(`[ODOO_RETRY_EXHAUSTED] ${context}`, lastError);
    throw lastError instanceof Error
        ? lastError
        : new Error(`${context} : échec après ${maxRetries + 1} tentatives`);
}

/* ─── Guard : audit non verrouillé ─── */

export async function assertAuditEditable(supabase: SupabaseClient, auditId: string) {
    const { data, error } = await supabase
        .from("stock_audits")
        .select("status")
        .eq("id", auditId)
        .single();

    if (error || !data) throw new Error("Audit introuvable.");
    if (data.status === "validated") throw new Error("L'audit est verrouillé et ne peut plus être modifié.");
    return data;
}

/* ─── Recalcul exact des totaux ─── */

export async function updateAuditTotals(supabase: SupabaseClient, auditId: string) {
    const { data: allItems, error } = await supabase
        .from("stock_audit_items")
        .select("counted_qty, theoretical_qty, unit_cost")
        .eq("audit_id", auditId);

    if (error || !allItems) {
        console.error("[UPDATE_AUDIT_TOTALS_ERROR]", error);
        return;
    }

    let totalScanned = 0;
    let totalDiffQty = 0;
    let totalDiffVal = 0;

    for (const i of allItems) {
        const counted = i.counted_qty ?? 0;
        const theoretical = i.theoretical_qty ?? 0;
        const cost = Number(i.unit_cost) || 0;

        if (counted === 1) totalScanned++;
        const diff = counted - theoretical;
        totalDiffQty += diff;
        totalDiffVal += diff * cost;
    }

    await supabase
        .from("stock_audits")
        .update({
            total_items_scanned: totalScanned,
            total_discrepancy_qty: totalDiffQty,
            total_discrepancy_value: totalDiffVal,
            updated_at: new Date().toISOString(),
        })
        .eq("id", auditId);
}

/* ─── Update batché Supabase (Promise.all OK ici, c'est pas Odoo) ─── */

export async function batchUpdateAuditItems(
    supabase: SupabaseClient,
    updates: Array<{ id: string;[key: string]: unknown }>
) {
    const BATCH = 50;
    for (let i = 0; i < updates.length; i += BATCH) {
        const batch = updates.slice(i, i + BATCH);
        const results = await Promise.all(
            batch.map((u) => supabase.from("stock_audit_items").update(u).eq("id", u.id))
        );
        const firstError = results.find((r) => r.error)?.error;
        if (firstError) {
            console.error("[BATCH_UPDATE_ERROR]", firstError);
            throw new Error("Échec de la mise à jour batch des articles.");
        }
    }
}

/* ─── Dédoublonnage barcodes ─── */

export function sanitizeBarcodes(barcodes: unknown[]): string[] {
    if (!Array.isArray(barcodes)) return [];
    return Array.from(
        new Set(
            barcodes
                .map((b) => (typeof b === "string" ? b.trim().toUpperCase() : ""))
                .filter(Boolean)
        )
    );
}