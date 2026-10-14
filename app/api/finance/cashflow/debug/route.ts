// app/api/finance/cashflow/debug/route.ts
import { NextResponse } from "next/server";
import { odooClient } from "@/lib/odoo/odoo-json2-client";

export const dynamic = "force-dynamic";

export async function GET() {
    const results: Record<string, unknown> = {};

    try {
        // ─── Test 1 : infos du journal 50 (Espèces) ──────────────────
        const journal = await odooClient.searchRead<Record<string, unknown>>(
            "account.journal",
            {
                domain: [["id", "=", 50]],
                fields: [
                    "name",
                    "code",
                    "type",
                    "default_account_id",
                ],
                limit: 1,
            },
        );
        results.journal50 = journal;

        // ─── Test 2 : readGroup filtré par account_type ──────────────
        const gCash = await odooClient.readGroup<Record<string, unknown>>(
            "account.move.line",
            {
                domain: [
                    ["parent_state", "=", "posted"],
                    ["journal_id", "=", 50],
                    ["account_id.account_type", "=", "asset_cash"],
                ],
                fields: ["debit:sum", "credit:sum"],
                groupby: ["journal_id"],
                lazy: false,
            },
        );
        results.test1_assetCash = gCash;

        // ─── Test 3 : avec default_account_id du journal ─────────────
        // (testé après avoir récupéré l'ID)
        const defaultAccId = Array.isArray(journal[0]?.default_account_id)
            ? (journal[0].default_account_id as [number, string])[0]
            : null;

        if (defaultAccId) {
            const gDefault = await odooClient.readGroup<Record<string, unknown>>(
                "account.move.line",
                {
                    domain: [
                        ["parent_state", "=", "posted"],
                        ["journal_id", "=", 50],
                        ["account_id", "=", defaultAccId],
                    ],
                    fields: ["debit:sum", "credit:sum"],
                    groupby: ["journal_id"],
                    lazy: false,
                },
            );
            results.test2_defaultAccount = gDefault;
        }

        // ─── Test 4 : regarder les types de comptes utilisés dans ce journal ─
        const accountsUsed = await odooClient.readGroup<Record<string, unknown>>(
            "account.move.line",
            {
                domain: [
                    ["parent_state", "=", "posted"],
                    ["journal_id", "=", 50],
                ],
                fields: ["debit:sum"],
                groupby: ["account_id"],
                lazy: false,
                limit: 20,
            },
        );
        results.test3_accountsUsed = accountsUsed;

        return NextResponse.json(results);
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "Erreur",
                partial: results,
            },
            { status: 500 },
        );
    }
}