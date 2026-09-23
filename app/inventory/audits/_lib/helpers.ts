import { Json } from "@/lib/supabase/database.types";
import { SoldLocation } from "./types";

/**
 * Convertit une valeur métier en `Json` Supabase.
 * Utilisé UNIQUEMENT aux frontières (insert / RPC).
 */
export function toJson(value: unknown): Json {
    return value as unknown as Json;
}

/**
 * Narrow un champ `Json` (issu des types générés Supabase) en `SoldLocation[]`.
 * Tolère null, undefined, string JSON, array d'objets malformés.
 */
export function normalizeSoldLocations(value: unknown): SoldLocation[] {
    if (value == null) return [];

    // Cas 1 : déjà un tableau
    if (Array.isArray(value)) {
        return value
            .filter((v): v is { id: number; name: string } => {
                return (
                    typeof v === "object" &&
                    v !== null &&
                    typeof (v as any).id === "number" &&
                    typeof (v as any).name === "string"
                );
            })
            .map((v) => ({ id: v.id, name: v.name }));
    }

    // Cas 2 : string JSON (anciennes données non migrées)
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            return normalizeSoldLocations(parsed);
        } catch {
            return [];
        }
    }

    return [];
}