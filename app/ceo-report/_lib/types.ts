import type { KpiCode } from "./kpi-codes";
import type { LucideIcon } from "lucide-react";

export type KpiUnit = "currency" | "percent" | "count" | "days" | "ratio";
export type KpiStatus = "good" | "warning" | "critical" | "neutral";
export type DomainId = "stock" | "sales" | "finance" | "operations" | "hr";

export interface KpiSecondary {
    label: string;
    value: string;
}

export interface KpiData {
    code: KpiCode;
    label: string;
    value: number;
    unit: KpiUnit;
    currency?: "USD" | "CDF";

    // Contexte
    hint?: string;
    icon?: LucideIcon;

    // Comparaison
    delta?: number;
    deltaLabel?: string;   // ex: "vs mois dernier"
    upIsGood?: boolean;

    // Statut
    status?: KpiStatus;

    // Info secondaire affichée en bas
    secondary?: KpiSecondary;
}

export interface DomainSummary {
    id: DomainId;
    label: string;
    description: string;
    href: string;
    icon: LucideIcon;
    kpis: KpiData[];
    alertCount?: number;
}