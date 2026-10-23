// app/revenue/arpu/_lib/constants.ts

/**
 * Segments issus du champ Odoo Studio `product.product.x_studio_segment`.
 * Source unique de vérité pour les filtres ARPU.
 */
export const ARPU_SEGMENTS = ["Enfant", "Femme", "Beauty"] as const;
export type ArpuSegment = (typeof ARPU_SEGMENTS)[number];

export function isArpuSegment(v: unknown): v is ArpuSegment {
    return (
        typeof v === "string" &&
        (ARPU_SEGMENTS as readonly string[]).includes(v)
    );
}