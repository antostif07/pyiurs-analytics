import type { KpiData } from "./_lib/types";

const CURRENCY_FORMATTERS = {
    USD: new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }),
    CDF: new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "CDF",
        maximumFractionDigits: 0,
    }),
};

const NUMBER_FORMATTER = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
});

const PERCENT_FORMATTER = new Intl.NumberFormat("fr-FR", {
    style: "percent",
    maximumFractionDigits: 1,
});

/** Formate la valeur principale d'un KPI selon son unité */
export function formatKpiValue(kpi: KpiData): string {
    const { value, unit, currency } = kpi;

    switch (unit) {
        case "currency":
            return CURRENCY_FORMATTERS[currency ?? "USD"].format(value);
        case "percent":
            return PERCENT_FORMATTER.format(value / 100);
        case "days":
            return `${NUMBER_FORMATTER.format(value)} j`;
        case "ratio":
            return `${value.toFixed(2)}×`;
        case "count":
        default:
            return NUMBER_FORMATTER.format(value);
    }
}

/** Formate le delta (ex: +12,3 % / −4,1 %) */
export function formatDelta(delta?: number): string {
    if (delta === undefined || delta === null) return "—";
    const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
    return `${sign}${Math.abs(delta).toFixed(1)} %`;
}

/** Détermine si la variation est "positive" du point de vue métier */
export function isPositiveDelta(kpi: KpiData): boolean {
    if (kpi.delta === undefined) return false;
    const upIsGood = kpi.upIsGood ?? true;
    return upIsGood ? kpi.delta > 0 : kpi.delta < 0;
}

/** Sélectionne la couleur de statut selon les seuils */
export function getStatusColor(status?: KpiData["status"]): string {
    switch (status) {
        case "good":
            return "text-emerald-600 dark:text-emerald-400";
        case "warning":
            return "text-amber-600 dark:text-amber-400";
        case "critical":
            return "text-rose-600 dark:text-rose-400";
        default:
            return "text-muted-foreground";
    }
}

/** Libellé lisible d'un preset de période */
export const PERIOD_LABELS: Record<string, string> = {
    today: "Aujourd'hui",
    week: "Cette semaine",
    month: "Ce mois",
    quarter: "Ce trimestre",
    year: "Cette année",
    custom: "Personnalisé",
};