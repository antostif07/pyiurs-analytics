// app/inventory/stock-beauty/_lib/odoo-safe.ts
import { odooClient } from "@/lib/odoo/odoo-json2-client";

const MAX_RETRIES = 4;
const BASE_DELAY_MS = 1500;
const INTER_BATCH_DELAY_MS = 400;

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

function isRateLimit(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    const msg = err.message ?? "";
    return (
        msg.includes("429") ||
        msg.includes("Rate limit") ||
        msg.includes("HTTP 429")
    );
}

/**
 * Retry exponentiel sur 429, transparent pour l'appelant.
 * 1ʳᵉ tentative → 2ᵉ à +1.5s → 3ᵉ à +3s → 4ᵉ à +6s → 5ᵉ à +12s
 */
export async function safeSearchRead<T>(
    model: string,
    options: Parameters<typeof odooClient.searchRead<T>>[1],
): Promise<T[]> {
    let attempt = 0;
    while (true) {
        try {
            return await odooClient.searchRead<T>(model, options);
        } catch (e) {
            attempt++;
            if (!isRateLimit(e) || attempt > MAX_RETRIES) throw e;
            const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
            console.warn(
                `[odoo-safe] 429 on ${model}, retry #${attempt} in ${delay}ms`,
            );
            await sleep(delay);
        }
    }
}

/**
 * Traite N batches en séquence avec un délai entre chaque.
 * Évite de saturer Odoo en parallélisant 20 requêtes d'un coup.
 */
export async function processBatchesSequentially<In, Out>(
    items: In[],
    handler: (item: In) => Promise<Out>,
): Promise<Out[]> {
    const results: Out[] = [];
    for (let i = 0; i < items.length; i++) {
        if (i > 0) await sleep(INTER_BATCH_DELAY_MS);
        results.push(await handler(items[i]));
    }
    return results;
}