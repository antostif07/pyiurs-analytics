// app/api/ceo-report/customers/segmentation/route.ts
import { NextRequest, NextResponse } from "next/server";
import { odooClient as odooJsonClient } from "@/lib/odoo/odoo-json2-client";
import { format, startOfMonth, endOfMonth, subDays } from "date-fns";

export const dynamic = "force-dynamic";

export interface CustomerSegmentRow {
    segment: "Platinum" | "Gold" | "Silver" | "Autres Clients";
    totalCustomers: number;
    grossAdds: number;
    churn30d: number;
    acqRevenue: number;
    recRevenue: number;
    arpu: number;
}

// Seuils stricts appliqués sur la période sélectionnée
function getCustomerTier(periodSpent: number): CustomerSegmentRow["segment"] {
    if (periodSpent > 300) return "Platinum";
    if (periodSpent >= 151) return "Gold";
    if (periodSpent >= 50) return "Silver";
    return "Autres Clients";
}

function cleanPhone(raw: string | false | null | undefined): string | null {
    if (!raw) return null;
    const digits = raw.replace(/[\s\-\.\(\)\+]/g, "").trim();
    return digits.length >= 6 ? digits : null;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const selectedDate = new Date(currentYear, currentMonth - 1, 1);

        const fromDate = searchParams.get("from")
            ? `${searchParams.get("from")} 00:00:00`
            : format(startOfMonth(selectedDate), "yyyy-MM-dd 00:00:00");

        const toDate = searchParams.get("to")
            ? `${searchParams.get("to")} 23:59:59`
            : format(endOfMonth(selectedDate), "yyyy-MM-dd 23:59:59");

        const fromDateObj = new Date(fromDate);
        const toDateObj = new Date(toDate);
        const thirtyDaysBeforeEnd = subDays(toDateObj, 30);

        // ────────────────────────────────────────────────────────────────────────
        // 1. RÉCUPÉRATION DE TOUTES LES COMMANDES HISTORIQUES (Jusqu'à toDate)
        // ────────────────────────────────────────────────────────────────────────
        const BATCH_SIZE = 5000;
        let offset = 0;
        let allOrders: Array<{
            id: number;
            partner_id: [number, string] | false;
            amount_total: number;
            date_order: string;
        }> = [];

        while (true) {
            const batch = await odooJsonClient.searchRead<{
                id: number;
                partner_id: [number, string] | false;
                amount_total: number;
                date_order: string;
            }>("pos.order", {
                domain: [
                    ["date_order", "<=", toDate],
                    ["state", "in", ["paid", "done", "invoiced"]],
                ],
                fields: ["id", "partner_id", "amount_total", "date_order"],
                limit: BATCH_SIZE,
                offset,
                order: "id asc",
            });

            allOrders = allOrders.concat(batch);
            if (batch.length < BATCH_SIZE) break;
            offset += BATCH_SIZE;
        }

        if (allOrders.length === 0) {
            return NextResponse.json({
                kpis: { parcTotal: 0, parcActif: 0, grossAdds: 0, churn30d: 0, arpuGlobal: 0, arpuActif: 0 },
                rows: [],
                totals: { segment: "TOTAL CLIENTS", totalCustomers: 0, grossAdds: 0, churn30d: 0, acqRevenue: 0, recRevenue: 0, arpu: 0 },
            });
        }

        // ────────────────────────────────────────────────────────────────────────
        // 2. DÉDOUBLONNAGE PAR TÉLÉPHONE DANS 'res.partner'
        // ────────────────────────────────────────────────────────────────────────
        const partnerIds = Array.from(
            new Set(allOrders.map((o) => (Array.isArray(o.partner_id) ? o.partner_id[0] : 0)).filter(Boolean))
        );

        const partnerPhoneMap = new Map<number, string>();
        const PARTNER_CHUNK = 1000;
        for (let i = 0; i < partnerIds.length; i += PARTNER_CHUNK) {
            const chunk = partnerIds.slice(i, i + PARTNER_CHUNK);
            const partners = await odooJsonClient.searchRead<{
                id: number;
                phone: string | false;
            }>("res.partner", {
                domain: [["id", "in", chunk]],
                fields: ["id", "phone"],
                limit: chunk.length,
            });

            for (const p of partners) {
                const phone = cleanPhone(p.phone);
                if (phone) {
                    partnerPhoneMap.set(p.id, phone);
                }
            }
        }

        // ────────────────────────────────────────────────────────────────────────
        // 3. TRAITEMENT DE TOUTE LA BASE : PROFILS HISTORIQUES & PROFILS ACTIFS
        // ────────────────────────────────────────────────────────────────────────
        interface CustomerAggregated {
            uniqueKey: string;
            firstOrderDate: Date;
            lastOrderDate: Date;
            periodSpent: number; // Achats faits sur la période sélectionnée
            periodOrdersCount: number;
        }

        const allCustomersMap = new Map<string, CustomerAggregated>();
        let totalAllTimeSales = 0;
        let totalPeriodSales = 0;

        for (const ord of allOrders) {
            const amount = Number(ord.amount_total || 0);
            totalAllTimeSales += amount;

            const pId = Array.isArray(ord.partner_id) ? ord.partner_id[0] : 0;
            const phone = pId ? partnerPhoneMap.get(pId) : null;

            // On ne retient que les clientes identifiées (téléphone prioritaire, sinon partnerId)
            if (!phone && !pId) continue;

            const uniqueKey = phone ? `PHONE_${phone}` : `PARTNER_${pId}`;
            const ordDate = new Date(ord.date_order);
            const isInCurrentPeriod = ordDate >= fromDateObj && ordDate <= toDateObj;

            if (isInCurrentPeriod) {
                totalPeriodSales += amount;
            }

            const existing = allCustomersMap.get(uniqueKey);
            if (existing) {
                if (isInCurrentPeriod) {
                    existing.periodSpent += amount;
                    existing.periodOrdersCount += 1;
                }
                if (ordDate < existing.firstOrderDate) {
                    existing.firstOrderDate = ordDate;
                }
                if (ordDate > existing.lastOrderDate) {
                    existing.lastOrderDate = ordDate;
                }
            } else {
                allCustomersMap.set(uniqueKey, {
                    uniqueKey,
                    firstOrderDate: ordDate,
                    lastOrderDate: ordDate,
                    periodSpent: isInCurrentPeriod ? amount : 0,
                    periodOrdersCount: isInCurrentPeriod ? 1 : 0,
                });
            }
        }

        // ── Les 2 Parcs Clients ──
        const parcTotal = allCustomersMap.size; // Toute l'histoire
        const activeCustomers = Array.from(allCustomersMap.values()).filter((c) => c.periodSpent > 0);
        const parcActif = activeCustomers.length; // Clientes ayant acheté sur la période

        // ── Les 2 Calculs d'ARPU ──
        // ARPU Global = Toutes les ventes / Total de commandes historiques
        const totalAllTimeOrdersCount = allOrders.length;
        const arpuGlobal = totalAllTimeOrdersCount > 0 ? Number((totalAllTimeSales / totalAllTimeOrdersCount).toFixed(2)) : 0;

        // ARPU Actif = Ventes période / Clientes actives de la période
        const arpuActif = parcActif > 0 ? Number((totalPeriodSales / parcActif).toFixed(2)) : 0;

        // ── Flux Globaux ──
        let totalGrossAdds = 0;
        let totalChurn30d = 0;

        for (const cust of allCustomersMap.values()) {
            if (cust.firstOrderDate >= fromDateObj && cust.firstOrderDate <= toDateObj) {
                totalGrossAdds += 1;
            }
            if (cust.lastOrderDate < thirtyDaysBeforeEnd) {
                totalChurn30d += 1;
            }
        }

        // ────────────────────────────────────────────────────────────────────────
        // 4. LE TABLEAU (POINT 2) & CHART : BASÉS UNIQUEMENT SUR LA PÉRIODE
        // ────────────────────────────────────────────────────────────────────────
        const tiersAggregation: Record<
            CustomerSegmentRow["segment"],
            {
                totalCustomers: number;
                grossAdds: number;
                churn30d: number;
                acqRevenue: number;
                recRevenue: number;
            }
        > = {
            Platinum: { totalCustomers: 0, grossAdds: 0, churn30d: 0, acqRevenue: 0, recRevenue: 0 },
            Gold: { totalCustomers: 0, grossAdds: 0, churn30d: 0, acqRevenue: 0, recRevenue: 0 },
            Silver: { totalCustomers: 0, grossAdds: 0, churn30d: 0, acqRevenue: 0, recRevenue: 0 },
            "Autres Clients": { totalCustomers: 0, grossAdds: 0, churn30d: 0, acqRevenue: 0, recRevenue: 0 },
        };

        // On ventile UNIQUEMENT les clientes actives de la période
        for (const cust of activeCustomers) {
            const tier = getCustomerTier(cust.periodSpent);
            const bucket = tiersAggregation[tier];

            bucket.totalCustomers += 1;

            // NOUVELLE CLIENTE (Gross Add) : Sa toute 1ère commande a eu lieu sur cette période
            const isGrossAdd = cust.firstOrderDate >= fromDateObj && cust.firstOrderDate <= toDateObj;

            if (isGrossAdd) {
                bucket.grossAdds += 1;
                bucket.acqRevenue += cust.periodSpent;
            } else {
                bucket.recRevenue += cust.periodSpent;
            }

            if (cust.lastOrderDate < thirtyDaysBeforeEnd) {
                bucket.churn30d += 1;
            }
        }

        const tierOrder: CustomerSegmentRow["segment"][] = ["Platinum", "Gold", "Silver", "Autres Clients"];

        const rows: CustomerSegmentRow[] = tierOrder.map((segName) => {
            const b = tiersAggregation[segName];
            const tierRevenue = b.acqRevenue + b.recRevenue;
            const arpu = b.totalCustomers > 0 ? Number((tierRevenue / b.totalCustomers).toFixed(2)) : 0;

            return {
                segment: segName,
                totalCustomers: b.totalCustomers,
                grossAdds: b.grossAdds,
                churn30d: b.churn30d,
                acqRevenue: Math.round(b.acqRevenue),
                recRevenue: Math.round(b.recRevenue),
                arpu,
            };
        });

        const totals = {
            segment: "TOTAL CLIENTS",
            totalCustomers: parcActif,
            grossAdds: rows.reduce((acc, r) => acc + r.grossAdds, 0),
            churn30d: rows.reduce((acc, r) => acc + r.churn30d, 0),
            acqRevenue: rows.reduce((acc, r) => acc + r.acqRevenue, 0),
            recRevenue: rows.reduce((acc, r) => acc + r.recRevenue, 0),
            arpu: arpuActif, // L'ARPU moyen des clientes actives de la période
        };

        return NextResponse.json({
            kpis: {
                parcTotal,
                parcActif,
                grossAdds: totalGrossAdds,
                churn30d: totalChurn30d,
                arpuGlobal,
                arpuActif,
            },
            rows,
            totals,
        });
    } catch (error) {
        console.error("[CUSTOMERS_SEGMENTATION_ERROR]:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Erreur interne" },
            { status: 500 }
        );
    }
}