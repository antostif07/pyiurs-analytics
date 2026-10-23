// app/api/ceo-report/hr/route.ts
import { NextResponse } from "next/server";
import type { HrResponse } from "@/app/ceo-report/hr/_lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
    // ⚠️ Data hardcodée pour l'instant : miroir exact de l'ancien hr-client.
    // À remplacer par un fetch DB / Odoo quand la source sera disponible.
    const data: HrResponse = {
        kpis: {
            activeStaff: 15,
            staffInShops: 11,
            staffInHQ: 4,
            payrollLoaded: 8400,
            baseSalaryTotal: 6600,
            perksTotal: 1800,
            rentPaidYtd: 68200,
            monthlyRent: 7800,
            leavesTotal: 61,
        },
        payroll: [
            { team: "P.BC (Admin/Stock)", baseSalary: 2100, perks: 650, total: 2750 },
            { team: "Vente P24", baseSalary: 1200, perks: 300, total: 1500 },
            { team: "Vente P.ONL", baseSalary: 900, perks: 250, total: 1150 },
            { team: "Vente P.MTO", baseSalary: 800, perks: 200, total: 1000 },
            { team: "Vente P.LMB", baseSalary: 800, perks: 200, total: 1000 },
            { team: "Vente P.KTM", baseSalary: 800, perks: 200, total: 1000 },
        ],
        leases: [
            { site: "P24", rent: 2200, paidMonths: 9, partialAmount: null, totalPaid: 19800 },
            { site: "P.MTO", rent: 1800, paidMonths: 9, partialAmount: null, totalPaid: 16200 },
            {
                site: "P.LMB",
                rent: 1400,
                paidMonths: 7,
                partialAmount: { month: "AOÛ", val: 800 },
                totalPaid: 10600,
            },
        ],
        leaseTotals: {
            rentMonthly: 7800,
            paidYtd: 68200,
        },
        hr: [
            { team: "Vente P24", staff: 3, baseSalary: 1200, perks: 300, totalCost: 1500, leaves: 12 },
            { team: "Vente P.MTO", staff: 2, baseSalary: 800, perks: 200, totalCost: 1000, leaves: 8 },
            { team: "Vente P.LMB", staff: 2, baseSalary: 800, perks: 200, totalCost: 1000, leaves: 6 },
            { team: "Vente P.KTM", staff: 2, baseSalary: 800, perks: 200, totalCost: 1000, leaves: 10 },
            { team: "P.ONL (Vente En Ligne)", staff: 2, baseSalary: 900, perks: 250, totalCost: 1150, leaves: 7 },
            { team: "P.BC (Admin, Stock, Compta)", staff: 4, baseSalary: 2100, perks: 650, totalCost: 2750, leaves: 18 },
        ],
        hrTotals: {
            staff: 15,
            baseSalary: 6600,
            perks: 1800,
            totalCost: 8400,
            leaves: 61,
        },
    };

    return NextResponse.json(data);
}