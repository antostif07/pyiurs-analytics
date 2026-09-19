import { SalesMatrixData } from "./types";

export const SALES_MATRIX_INITIAL_DATA: SalesMatrixData = {
    periodLabel: "Mois en cours",
    stores: [
        { id: "p24", code: "P24 ($)", name: "Boutique P24" },
        { id: "p_mto", code: "P.MTO ($)", name: "Boutique MTO" },
        { id: "p_lmb", code: "P.LMB ($)", name: "Boutique LMB" },
        { id: "p_ktm", code: "P.KTM ($)", name: "Boutique KTM" },
        { id: "p_onl", code: "P.ONL ($)", name: "Vente En Ligne" },
    ],
    rows: [
        {
            categoryId: "femme",
            categoryName: "Femme",
            storeValues: { p24: 12500, p_mto: 9800, p_lmb: 7200, p_ktm: 6500, p_onl: 14000 },
            totalRealized: 50000,
            budgetTarget: 47500,
            varianceAmount: 2500,
            variancePercent: 5.3,
        },
        {
            categoryId: "kids",
            categoryName: "Kids",
            storeValues: { p24: 4200, p_mto: 3100, p_lmb: 2800, p_ktm: 2400, p_onl: 5500 },
            totalRealized: 18000,
            budgetTarget: 19000,
            varianceAmount: -1000,
            variancePercent: -5.3,
        },
        {
            categoryId: "beauty",
            categoryName: "Beauty",
            storeValues: { p24: 6800, p_mto: 5400, p_lmb: 4100, p_ktm: 3700, p_onl: 8000 },
            totalRealized: 28000,
            budgetTarget: 26200,
            varianceAmount: 1800,
            variancePercent: 6.9,
        },
    ],
    totals: {
        totalRealizedByStore: {
            p24: 23500,
            p_mto: 18300,
            p_lmb: 14100,
            p_ktm: 12600,
            p_onl: 27500,
        },
        totalRealizedGlobal: 96000,
        varianceAmountByStore: {
            p24: 1200,
            p_mto: -700,
            p_lmb: 500,
            p_ktm: -200,
            p_onl: 2500,
        },
        totalVarianceGlobal: 3300,
        totalVariancePercentGlobal: 3.6,
    },
};