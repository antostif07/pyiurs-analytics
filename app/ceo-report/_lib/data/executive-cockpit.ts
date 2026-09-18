import { ReportFilter } from "../types/reports";
import { executiveAlerts, salesData } from "./demo-data";

export type ExecutiveCockpitData = {
    sales: typeof salesData;
    alerts: typeof executiveAlerts;
    // plus tard : customers, cash, stock…
};

export async function getExecutiveCockpitData(filters: ReportFilter): Promise<ExecutiveCockpitData> {
    // TODO: brancher Supabase + Odoo avec filters
    return { sales: salesData, alerts: executiveAlerts };
}