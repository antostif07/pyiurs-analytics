import { SupabaseClient } from "@supabase/supabase-js";
import { FoundLocation, OdooProduct } from "./types";
import { odooClient } from "@/lib/odoo/odoo-json2-client";

/* ─── Types stricts alignés sur ta lib Odoo ─── */

export interface OdooQuant {
    product_id: [number, string];
    location_id: [number, string];
    quantity: number;
    company_id?: [number, string];
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

/**
 * Détermine le coût unitaire d'un produit Odoo.
 *
 * RÈGLE MÉTIER :
 *   - Si `standard_price` > 0 → on l'utilise tel quel
 *   - Sinon → fallback sur 40% du `list_price` (prix de vente)
 *
 * Retourne un nombre arrondi à 2 décimales (format monétaire).
 */
export function resolveUnitCost(product: OdooProduct): number {
    const cost = Number(product.standard_price) || 0;
    if (cost > 0) return cost;

    const listPrice = Number(product.list_price) || 0;
    return Number((listPrice * 0.4).toFixed(2));
}

/* Interface Odoo locale pour la résolution des noms */
interface OdooLocationShort {
    id: number;
    complete_name: string;
    company_id: [number, string] | false | null;
}

interface OdooCompanyShort {
    id: number;
    name: string;
}

/**
 * Récupère les emplacements positifs (found_locations) de plusieurs produits
 * en 3 appels Odoo batchés (quants → locations → companies).
 *
 * Utilisé pour les produits hors périmètre : on veut savoir où Odoo dit
 * qu'ils sont physiquement (stock positif) pour générer les transferts.
 *
 * @returns Map<productId, FoundLocation[]>
 */
export async function resolvePositiveLocationsForProducts(
    productIds: number[]
): Promise<Map<number, FoundLocation[]>> {
    const map = new Map<number, FoundLocation[]>();
    if (productIds.length === 0) return map;

    /* 1. Quants positifs (tous companies confondues) */
    const quants = await odooClient.searchRead<OdooQuant>("stock.quant", {
        domain: [
            ["product_id", "in", productIds],
            ["location_id.usage", "=", "internal"],
            ["quantity", ">", 0],
        ],
        fields: ["product_id", "location_id", "quantity"],
        limit: 50000,
    });

    if (!quants || quants.length === 0) return map;

    /* 2. Résoudre les noms des locations (1 appel) */
    const locationIds = new Set<number>();
    quants.forEach((q) => {
        if (Array.isArray(q.location_id)) locationIds.add(q.location_id[0]);
    });

    const locations = await odooClient.searchRead<OdooLocationShort>(
        "stock.location",
        {
            domain: [["id", "in", Array.from(locationIds)]],
            fields: ["id", "complete_name", "company_id"],
            limit: locationIds.size,
        }
    );

    const locationMap = new Map<number, OdooLocationShort>();
    (locations || []).forEach((l) => locationMap.set(l.id, l));

    /* 3. Résoudre les noms des companies (1 appel) */
    const companyIds = new Set<number>();
    (locations || []).forEach((l) => {
        if (Array.isArray(l.company_id)) companyIds.add(l.company_id[0]);
    });

    const companies = await odooClient.searchRead<OdooCompanyShort>(
        "res.company",
        {
            domain: [["id", "in", Array.from(companyIds)]],
            fields: ["id", "name"],
            limit: companyIds.size,
        }
    );

    const companyMap = new Map<number, string>();
    (companies || []).forEach((c) => companyMap.set(c.id, c.name));

    /* 4. Construire la Map<productId, FoundLocation[]> */
    quants.forEach((q) => {
        const pid = q.product_id[0];
        const locId = q.location_id[0];
        const loc = locationMap.get(locId);
        if (!loc || !Array.isArray(loc.company_id)) return;

        const companyId = loc.company_id[0];
        const companyName = companyMap.get(companyId) ?? loc.company_id[1];

        if (!map.has(pid)) map.set(pid, []);
        const arr = map.get(pid)!;

        /* Dédup : on ne garde qu'une occurrence par location,
           en cumulant la quantité si plusieurs quants dans la même location */
        const existing = arr.find((l) => l.id === locId);
        if (existing) {
            existing.quantity += Math.round(q.quantity || 0);
        } else {
            arr.push({
                id: locId,
                name: loc.complete_name,
                quantity: Math.round(q.quantity || 0),
                company_id: companyId,
                company_name: companyName,
            });
        }
    });

    return map;
}