import {
    startOfToday,
    endOfToday,
    startOfMonth,
    endOfMonth,
    startOfQuarter,
    endOfQuarter,
    startOfYear,
    endOfYear,
    subDays,
    parseISO,
    format,
} from "date-fns";

export type PeriodPreset =
    | "today"
    | "7d"
    | "30d"       // mois en cours
    | "quarter"   // trimestre en cours
    | "year"      // année en cours
    | "custom";

export interface ResolvedPeriod {
    from: Date;
    to: Date;
    preset: PeriodPreset;
}

export const PERIOD_PRESETS: {
    label: string;
    value: PeriodPreset;
    icon?: boolean;
}[] = [
        { label: "Aujourd'hui", value: "today" },
        { label: "7 jours", value: "7d" },
        { label: "Ce mois", value: "30d" },
        { label: "Trimestre", value: "quarter" },
        { label: "Année", value: "year" },
    ];

/** Résout un preset en { from, to } */
export function resolvePreset(preset: PeriodPreset): { from: Date; to: Date } {
    const now = new Date();

    switch (preset) {
        case "today":
            return { from: startOfToday(), to: endOfToday() };
        case "7d":
            return { from: subDays(startOfToday(), 6), to: endOfToday() };
        case "30d":
            return { from: startOfMonth(now), to: endOfMonth(now) };
        case "quarter":
            return { from: startOfQuarter(now), to: endOfQuarter(now) };
        case "year":
            return { from: startOfYear(now), to: endOfYear(now) };
        case "custom":
        default:
            return { from: startOfMonth(now), to: endOfMonth(now) };
    }
}

/** Lit les searchParams d'une page Next.js et retourne la période résolue */
export function parsePeriodFromSearchParams(
    params: { from?: string; to?: string; preset?: string }
): ResolvedPeriod {
    const preset = (params.preset as PeriodPreset) || "30d";

    if (params.from && params.to) {
        try {
            return {
                from: parseISO(params.from),
                to: parseISO(params.to),
                preset,
            };
        } catch {
            // fallback silencieux si parsing échoue
        }
    }

    const { from, to } = resolvePreset(preset);
    return { from, to, preset };
}

/** Formate la période en YYYY-MM-DD pour Odoo / Supabase */
export function toApiDates(period: ResolvedPeriod) {
    return {
        from: format(period.from, "yyyy-MM-dd"),
        to: format(period.to, "yyyy-MM-dd"),
    };
}