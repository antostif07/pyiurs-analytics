// app/api/inventory/rebalancing/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { odooClient } from "@/lib/odoo/odoo-json2-client";
import { fetchRebalancingData } from "@/app/inventory/rebalancing/_lib/fetch-rebalancing";
import {
    classifyRows,
    groupForSaleOrders,
    groupForPickings,
    buildInternalFilename,
    buildSaleFilename,
} from "@/app/inventory/rebalancing/_lib/export-helpers";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ROLES = [
    "admin",
    "manager",
    "inventory_manager",
    "inventory-manager",
];

const HARDCODED_SALE_USER = "Carmel Fwamini - BC";
const HARDCODED_PICKING_PARTNER = "Djodjo Nge - BC";

function nowSqlDatetime(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export async function GET(request: NextRequest) {
    try {
        // ─── Auth ────────────────────────────────────────────────
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (!profile || !ALLOWED_ROLES.includes(profile.role ?? "")) {
            return NextResponse.json(
                { error: "Permissions insuffisantes" },
                { status: 403 },
            );
        }

        // ─── Params ──────────────────────────────────────────────
        const { searchParams } = new URL(request.url);
        const companyParam = searchParams.get("company");
        const typeParam = searchParams.get("type");

        const companyId = companyParam ? Number(companyParam) : null;
        if (!companyId || !Number.isFinite(companyId)) {
            return NextResponse.json(
                { error: "Company requise" },
                { status: 400 },
            );
        }

        if (typeParam !== "internal" && typeParam !== "inter_company") {
            return NextResponse.json(
                { error: "Type invalide (internal | inter_company)" },
                { status: 400 },
            );
        }

        // ─── Fetch + classify ────────────────────────────────────
        const { rows } = await fetchRebalancingData(supabase, companyId);
        const classified = classifyRows(rows, companyId);

        // ─── Nom de la company dest ──────────────────────────────
        const destCompanies = await odooClient.searchRead<{
            id: number;
            name: string;
        }>("res.company", {
            domain: [["id", "=", companyId]],
            fields: ["name"],
            limit: 1,
        });
        const destCompanyName = destCompanies[0]?.name ?? `Company ${companyId}`;

        /* ═══════════════════════════════════════════════════════════
         * EXPORT INTERNAL (stock.picking — move_line_ids)
         * ═══════════════════════════════════════════════════════════ */
        if (typeParam === "internal") {
            const groups = groupForPickings(classified);
            if (groups.length === 0) {
                return NextResponse.json(
                    { error: "Aucun transfert interne à exporter" },
                    { status: 400 },
                );
            }

            const header = [
                "id",
                "priority",
                "location_id",
                "location_dest_id",
                "partner_id",
                "scheduled_date",
                "origin",
                "move_line_ids/product_id",
                "move_line_ids/qty_done",
                "move_line_ids/picked",
            ];

            const rowsData: (string | number | boolean)[][] = [header];
            const scheduledDate = nowSqlDatetime();

            for (const g of groups) {
                let first = true;
                for (const line of g.lines) {
                    rowsData.push([
                        "",
                        first ? "Normal" : "",
                        first ? g.sourceLocationCompleteName : "",
                        first ? g.destLocationCompleteName : "",
                        first ? HARDCODED_PICKING_PARTNER : "",
                        first ? scheduledDate : "",
                        first ? "Correction" : "",
                        line.productName,
                        line.quantity,
                        true,
                    ]);
                    first = false;
                }
            }

            const ws = XLSX.utils.aoa_to_sheet(rowsData);
            ws["!cols"] = [
                { wch: 44 },
                { wch: 10 },
                { wch: 22 },
                { wch: 22 },
                { wch: 22 },
                { wch: 20 },
                { wch: 14 },
                { wch: 70 },
                { wch: 22 },
                { wch: 22 },
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

            const buffer = XLSX.write(wb, {
                type: "buffer",
                bookType: "xlsx",
            });
            const filename = buildInternalFilename(
                destCompanyName,
                groups,
            );

            return new NextResponse(buffer, {
                status: 200,
                headers: {
                    "Content-Type":
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "Content-Disposition": `attachment; filename="${filename}"`,
                },
            });
        }

        /* ═══════════════════════════════════════════════════════════
         * EXPORT INTER-COMPANY (sale.order)
         * ═══════════════════════════════════════════════════════════ */
        const groups = groupForSaleOrders(classified, destCompanyName);
        if (groups.length === 0) {
            return NextResponse.json(
                { error: "Aucune vente inter-company à exporter" },
                { status: 400 },
            );
        }

        const header = [
            "id",
            "name",
            "partner_id",
            "user_id",
            "company_id",
            "order_line/product_id",
            "order_line/product_uom_qty",
        ];

        const rowsData: (string | number)[][] = [header];

        for (const g of groups) {
            let first = true;
            for (const line of g.lines) {
                rowsData.push([
                    "",
                    "",
                    first ? g.destCompanyName : "",
                    first ? HARDCODED_SALE_USER : "",
                    first ? g.sourceCompanyName : "",
                    line.productName,
                    line.quantity,
                ]);
                first = false;
            }
        }

        const ws = XLSX.utils.aoa_to_sheet(rowsData);
        ws["!cols"] = [
            { wch: 44 },
            { wch: 12 },
            { wch: 20 },
            { wch: 28 },
            { wch: 20 },
            { wch: 70 },
            { wch: 26 },
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        const filename = buildSaleFilename(destCompanyName, groups);

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("[REBALANCING_EXPORT]", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Erreur serveur",
            },
            { status: 500 },
        );
    }
}