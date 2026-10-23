// app/revenue/arpu/_lib/types.ts
import type { ArpuSegment } from "./constants";

export interface ArpuFlowPoint {
    date: string;
    displayDate: string;
    revenue: number;
    arpu: number;
}

export interface ArpuSegmentStats {
    revenue: number;
    percent: number;
}

export interface ArpuMonthlyRow {
    label: string;
    revenue: number;
    arpu: number;
    base: number;
    femme: number;
    enfant: number;
    beauty: number;
    acqCount: number;
    acqRev: number;
    recCount: number;
    recRev: number;
}

export interface ArpuStatsData {
    globalArpu: number;
    totalRevenue: number;
    totalCustomers: number;
    chartData: ArpuFlowPoint[];
    segmentsMix: Record<string, ArpuSegmentStats>;
    yearlySummary: ArpuMonthlyRow[];
    customerList: unknown[];
}

export interface ArpuRequestParams {
    from: string;   // ISO yyyy-MM-dd
    to: string;     // ISO yyyy-MM-dd
    segments: ArpuSegment[];
}