// app/api/ceo-report/finance/route.ts
import { NextResponse } from "next/server";
import type { FinanceResponse } from "@/app/ceo-report/finance/_lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
    // ⚠️ Data hardcodée : miroir exact de l'ancien finance-client.
    // À remplacer par un fetch DB / Odoo quand la source sera disponible.
    const data: FinanceResponse = {
        kpis: {
            invoicedOdoo: 40500,
            poCommitted: 42000,
            paid: 34500,
            remainingToPay: 6000,
            remainingCategory: "Achats Femme",
            landedCosts: 7800,
            landedCostsPercent: 18.57,
            priceRequest: 49000,
            negotiatedSavings: 7000,
        },
        paymentComparison: [
            {
                category: "Femme",
                invoicedOdoo: 22000,
                paid: 16000,
                remaining: 6000,
            },
            {
                category: "Kids",
                invoicedOdoo: 6500,
                paid: 6500,
                remaining: 0,
            },
            {
                category: "Beauty",
                invoicedOdoo: 12000,
                paid: 12000,
                remaining: 0,
            },
        ],
        landedCosts: [
            { label: "Frets du mois", amount: 3800, percentPo: 9.05 },
            { label: "Douanes & Dédouanement", amount: 2900, percentPo: 6.9 },
            { label: "Transports sur achats", amount: 1100, percentPo: 2.62 },
        ],
        landedCostsTotal: {
            amount: 7800,
            percentPo: 18.57,
        },
        auditRows: [
            {
                category: "Achats Femme",
                priceRequest: 25000,
                poAmount: 22000,
                receivedAmount: 22000,
                reliquatAmount: 0,
                soldAmount: 11500,
                invoicedOdoo: 22000,
                paymentStatus: "Partiel",
                paidAmount: 16000,
            },
            {
                category: "Achats Kids",
                priceRequest: 10000,
                poAmount: 8000,
                receivedAmount: 8000,
                reliquatAmount: 0,
                soldAmount: 3800,
                invoicedOdoo: 6500,
                paymentStatus: "Total",
                paidAmount: 6500,
            },
            {
                category: "Achats Beauty",
                priceRequest: 14000,
                poAmount: 12000,
                receivedAmount: 10500,
                reliquatAmount: 1500,
                soldAmount: 7200,
                invoicedOdoo: 12000,
                paymentStatus: "Total",
                paidAmount: 12000,
            },
        ],
        auditTotals: {
            category: "TOTAL COMPTA",
            priceRequest: 49000,
            poAmount: 42000,
            receivedAmount: 40500,
            reliquatAmount: 1500,
            soldAmount: 22500,
            invoicedOdoo: 40500,
            status: "Contrôle Odoo",
            paidAmount: 34500,
        },
    };

    return NextResponse.json(data);
}