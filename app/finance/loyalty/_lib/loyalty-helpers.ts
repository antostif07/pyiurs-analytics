// app/finance/loyalty/_lib/loyalty-helpers.ts

/** 1 point par tranche de 10 $, arrondi bas */
export const POINTS_PER_UNIT = 1;
export const AMOUNT_PER_UNIT = 10;

/** Expiration des points : 6 mois après l'envoi */
export const EXPIRATION_MONTHS = 6;

/**
 * Calcule les points gagnés pour un montant donné.
 * Règle : 1 point / 10 $, arrondi bas.
 * Ex : 45 $ → 4 pts · 99 $ → 9 pts · 10 $ → 1 pt · 9 $ → 0 pt
 */
export function computePointsEarned(amount: number): number {
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    return Math.floor(amount / AMOUNT_PER_UNIT) * POINTS_PER_UNIT;
}

/**
 * Calcule la date d'expiration des points (6 mois après l'envoi).
 * Retourne au format yyyy-MM-dd (ISO date seule).
 */
export function computeExpirationDate(sentAt: Date = new Date()): string {
    const expires = new Date(sentAt);
    expires.setMonth(expires.getMonth() + EXPIRATION_MONTHS);

    const pad = (n: number) => String(n).padStart(2, "0");
    return `${expires.getFullYear()}-${pad(expires.getMonth() + 1)}-${pad(expires.getDate())}`;
}

/**
 * Formate une date au format dd/MM/yyyy pour le template WhatsApp.
 */
export function formatDateForTemplate(isoDate: string): string {
    const [y, m, d] = isoDate.split("-");
    return `${d}/${m}/${y}`;
}

/**
 * Retourne la plage ISO "aujourd'hui" dans le fuseau Africa/Kinshasa.
 * Utile pour filtrer les factures du jour.
 */
export function getTodayRangeKinshasa(): { from: string; to: string } {
    const now = new Date();

    // Récupère la date locale Kinshasa (UTC+1, pas de DST)
    const kinshasaMs = now.getTime() + 60 * 60 * 1000; // +1h
    const local = new Date(kinshasaMs);

    const pad = (n: number) => String(n).padStart(2, "0");
    const y = local.getUTCFullYear();
    const m = pad(local.getUTCMonth() + 1);
    const d = pad(local.getUTCDate());

    return { from: `${y}-${m}-${d}`, to: `${y}-${m}-${d}` };
}