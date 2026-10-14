// app/api/finance/cashflow/route.ts
import { NextRequest, NextResponse } from "next/server";
import { odooClient } from "@/lib/odoo/odoo-json2-client";
import { buildDomain } from "@/lib/odoo/domain";
import { createClient } from "@/lib/supabase/server";
import {
    SALES_METHODS,
    SALES_METHOD_LABELS,
    EXPENSE_METHODS,
    EXPENSE_METHOD_LABELS,
    resolveSalesMethod,
    type SalesMethod,
    type ExpenseMethod,
} from "@/app/finance/_lib/cashflow-mapping";
import type {
    CashflowCompany,
    CashflowMethodRow,
    CashflowReportData,
} from "@/app/finance/_lib/types";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

const COMPANY_LABEL: Record<number, string> = {
    1: "P.24",
    4: "P.LMB",
    6: "P.MTO",
    5: "P.KTM",
    8: "P.ONL", // BC
};

/** Ordre d'affichage des companies dans les colonnes */
const COMPANY_ORDER = [1, 4, 6, 5, 8]; // P.24, P.LMB, P.MTO, P.KTM, P.ONL

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const pad = (n: number) => String(n).padStart(2, "0");

function getTodayKinshasa(): string {
    const now = new Date();
    const k = new Date(now.getTime() + 60 * 60 * 1000);
    return `${k.getUTCFullYear()}-${pad(k.getUTCMonth() + 1)}-${pad(k.getUTCDate())}`;
}

const EMPTY_PAYLOAD: CashflowReportData = {
    period: { from: "", to: "" },
    companies: [],
    sales: { rows: [], grandTotal: 0 },
    expenses: { rows: [], grandTotal: 0 },
};

// ─────────────────────────────────────────────────────────────────────────
// GET
// ─────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        const today = getTodayKinshasa();
        const fromRaw = searchParams.get("from");
        const toRaw = searchParams.get("to");

        const from = fromRaw && ISO_DATE.test(fromRaw) ? fromRaw : today;
        const to = toRaw && ISO_DATE.test(toRaw) ? toRaw : today;

        if (from > to) {
            return NextResponse.json(
                { error: "`from` doit être ≤ `to`" },
                { status: 400 },
            );
        }

        // ─── 1. Companies depuis shops (Supabase) ─────────────────────
        const supabase = await createClient();
        const { data: shops, error: shopErr } = await supabase
            .from("shops")
            .select("name, odoo_company_id")
            .not("odoo_company_id", "is", null);

        if (shopErr) {
            return NextResponse.json(
                { error: `shops fetch: ${shopErr.message}` },
                { status: 500 },
            );
        }

        // Filtrer et ordonner selon COMPANY_ORDER
        const shopsByOdooId = new Map(
            (shops ?? []).map((s) => [s.odoo_company_id as number, s.name]),
        );

        const companies: CashflowCompany[] = COMPANY_ORDER
            .filter((id) => shopsByOdooId.has(id))
            .map((id) => ({
                id,
                name: COMPANY_LABEL[id] ?? shopsByOdooId.get(id) ?? `Company ${id}`,
                shopName: shopsByOdooId.get(id) ?? "",
            }));

        if (companies.length === 0) {
            return NextResponse.json(EMPTY_PAYLOAD);
        }

        const companyIds = companies.map((c) => c.id);

        // ─── 2. Journaux Odoo ─────────────────────────────────────────
        const journals = await odooClient.searchRead<{
            id: number;
            name: string;
            code: string;
            type: string;
            company_id: [number, string] | false;
        }>("account.journal", {
            domain: [["company_id", "in", companyIds]],
            fields: ["name", "code", "type", "company_id"],
            limit: 1000,
            order: "code asc, company_id asc",
        });

        // journalId → { code, type, companyId }
        const journalMeta = new Map<
            number,
            { code: string; type: string; companyId: number; name: string }
        >();
        for (const j of journals) {
            const companyId = Array.isArray(j.company_id) ? j.company_id[0] : 0;
            if (!companyId) continue;
            journalMeta.set(j.id, {
                code: j.code.trim(),
                type: j.type,
                companyId,
                name: j.name,
            });
        }

        const allJournalIds = Array.from(journalMeta.keys());

        if (allJournalIds.length === 0) {
            return NextResponse.json({
                ...EMPTY_PAYLOAD,
                period: { from, to },
                companies,
            });
        }

        // ─── 3. Soldes d'ouverture (debit - credit avant `from`) ──────
        const openingGroups = await odooClient.readGroup<{
            journal_id: [number, string] | false;
            debit: number;
            credit: number;
        }>("account.move.line", {
            domain: buildDomain(
                ["journal_id", "in", allJournalIds],
                ["date", "<", from],
                ["parent_state", "=", "posted"],
                ["account_id.account_type", "=", "asset_cash"],
            ),
            fields: ["debit:sum", "credit:sum"],
            groupby: ["journal_id"],
            lazy: false,
        });

        const openingByJournal = new Map<number, number>();
        for (const g of openingGroups) {
            const jId = Array.isArray(g.journal_id) ? g.journal_id[0] : 0;
            if (!jId) continue;
            openingByJournal.set(
                jId,
                Number(g.debit ?? 0) - Number(g.credit ?? 0),
            );
        }

        // ─── 4. Mouvements de la période (from ≤ date ≤ to) ───────────
        const periodGroups = await odooClient.readGroup<{
            journal_id: [number, string] | false;
            debit: number;
            credit: number;
        }>("account.move.line", {
            domain: buildDomain(
                ["journal_id", "in", allJournalIds],
                ["date", ">=", from],
                ["date", "<=", to],
                ["parent_state", "=", "posted"],
                ["account_id.account_type", "=", "asset_cash"],
            ),
            fields: ["debit:sum", "credit:sum"],
            groupby: ["journal_id"],
            lazy: false,
        });

        const periodByJournal = new Map<
            number,
            { debit: number; credit: number }
        >();
        for (const g of periodGroups) {
            const jId = Array.isArray(g.journal_id) ? g.journal_id[0] : 0;
            if (!jId) continue;
            periodByJournal.set(jId, {
                debit: Number(g.debit ?? 0),
                credit: Number(g.credit ?? 0),
            });
        }

        // ─── 5. Agrégation par méthode ────────────────────────────────
        type Agg = {
            opening: number;
            byCompany: Record<number, number>;
        };

        const emptyAgg = (): Agg => ({
            opening: 0,
            byCompany: Object.fromEntries(companyIds.map((id) => [id, 0])),
        });

        const salesByMethod: Record<SalesMethod, Agg> = {
            TMB: emptyAgg(),
            RAWBANK: emptyAgg(),
            MPESA: emptyAgg(),
            CASH: emptyAgg(),
        };

        // Période : débits (ventes) vs crédits (dépenses)
        const salesByMethodPeriod: Record<SalesMethod, Agg> = {
            TMB: emptyAgg(),
            RAWBANK: emptyAgg(),
            MPESA: emptyAgg(),
            CASH: emptyAgg(),
        };

        const salesByMethodDebit: Record<SalesMethod, Agg> = {
            TMB: emptyAgg(),
            RAWBANK: emptyAgg(),
            MPESA: emptyAgg(),
            CASH: emptyAgg(),
        };

        const expenseDebit: Agg = emptyAgg(); // global dépenses (toutes méthodes)
        const expenseOpening: Agg = emptyAgg();

        for (const [journalId, meta] of journalMeta.entries()) {
            const method = resolveSalesMethod(meta.code, meta.type);
            if (!method) continue;

            const opening = openingByJournal.get(journalId) ?? 0;
            const period = periodByJournal.get(journalId) ?? {
                debit: 0,
                credit: 0,
            };

            // VENTE = débits
            salesByMethodDebit[method].opening += opening;
            salesByMethodDebit[method].byCompany[meta.companyId] =
                (salesByMethodDebit[method].byCompany[meta.companyId] ?? 0) +
                period.debit;

            // DEPENSE = crédits
            expenseOpening.opening += opening;
            expenseOpening.byCompany[meta.companyId] =
                (expenseOpening.byCompany[meta.companyId] ?? 0) + 0; // S.O. séparé
            expenseDebit.byCompany[meta.companyId] =
                (expenseDebit.byCompany[meta.companyId] ?? 0) + period.credit;
            expenseDebit.opening += 0;
        }

        // ─── 6. Construire les lignes VENTE ───────────────────────────
        const salesRows: CashflowMethodRow[] = [];

        // Ligne TOTAL
        const salesTotalRow: CashflowMethodRow = {
            key: "TOTAL",
            label: "TOTAL",
            isTotal: true,
            openingBalance: 0,
            byCompany: Object.fromEntries(companyIds.map((id) => [id, 0])),
            total: 0,
            cumul: 0,
        };

        for (const method of SALES_METHODS) {
            const agg = salesByMethodDebit[method];
            for (const cid of companyIds) {
                salesTotalRow.byCompany[cid] += agg.byCompany[cid] ?? 0;
            }
            salesTotalRow.openingBalance += agg.opening;
        }
        salesTotalRow.total = Object.values(salesTotalRow.byCompany).reduce(
            (s, v) => s + v,
            0,
        );
        salesTotalRow.cumul = salesTotalRow.openingBalance + salesTotalRow.total;

        salesRows.push(salesTotalRow);

        // Lignes par méthode
        for (const method of SALES_METHODS) {
            const agg = salesByMethodDebit[method];
            const total = Object.values(agg.byCompany).reduce(
                (s, v) => s + v,
                0,
            );
            salesRows.push({
                key: method,
                label: SALES_METHOD_LABELS[method],
                isTotal: false,
                openingBalance: agg.opening,
                byCompany: { ...agg.byCompany },
                total,
                cumul: agg.opening + total,
            });
        }

        // ─── 7. Construire les lignes DEPENSE ─────────────────────────
        // V1 : une seule ligne "AUTRES" (E.PDV / E.BC / E.STK en suspens)
        const expenseRows: CashflowMethodRow[] = [];

        // Ligne TOTAL
        const expenseTotal: CashflowMethodRow = {
            key: "TOTAL",
            label: "TOTAL",
            isTotal: true,
            openingBalance: 0,
            byCompany: { ...expenseDebit.byCompany },
            total: Object.values(expenseDebit.byCompany).reduce(
                (s, v) => s + v,
                0,
            ),
            cumul: 0,
        };
        // Cumul dépenses = solde final = SO ventes - total dépenses
        expenseTotal.cumul =
            salesTotalRow.cumul - expenseTotal.total;

        expenseRows.push(expenseTotal);

        // Ligne AUTRES (provisoire — sera séparée en E.PDV/E.BC/E.STK plus tard)
        expenseRows.push({
            key: "AUTRES",
            label: EXPENSE_METHOD_LABELS.AUTRES,
            isTotal: false,
            openingBalance: 0,
            byCompany: { ...expenseDebit.byCompany },
            total: expenseTotal.total,
            cumul: 0,
        });

        // ─── 8. Payload ───────────────────────────────────────────────
        const salesGrandTotal = salesTotalRow.total;
        const expenseGrandTotal = expenseTotal.total;

        const payload: CashflowReportData = {
            period: { from, to },
            companies,
            sales: {
                rows: salesRows,
                grandTotal: salesGrandTotal,
            },
            expenses: {
                rows: expenseRows,
                grandTotal: expenseGrandTotal,
            },
        };

        return NextResponse.json(payload);
    } catch (error) {
        console.error("[CASHFLOW_API] error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Erreur serveur" },
            { status: 500 },
        );
    }
}