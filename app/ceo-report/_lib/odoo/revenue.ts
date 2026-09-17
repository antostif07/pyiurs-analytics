import { odooClient, OdooDomain } from "@/lib/odoo/odoo-json2-client";

interface RevenueParams {
    from: string; // "YYYY-MM-DD"
    to: string;
    companyId?: number;
}

interface RevenueResult {
    ttc: number;
    ht: number;
    tax: number;
}

export async function fetchRevenue({
    from,
    to,
    companyId,
}: RevenueParams): Promise<RevenueResult> {
    const domain: OdooDomain = [
        ["state", "in", ["paid", "done", "invoiced"]],
        ["date_order", ">=", `${from} 00:00:00`],
        ["date_order", "<=", `${to} 23:59:59`],
    ];

    if (companyId) domain.push(["company_id", "=", companyId]);

    const context = companyId ? { allowed_company_ids: [companyId] } : {};

    const result = await odooClient.readGroup<{
        amount_total: number;
        amount_tax: number;
    }>("pos.order", {
        domain,
        fields: ["amount_total:sum", "amount_tax:sum"],
        context,
    });

    const ttc = result[0]?.amount_total ?? 0;
    const tax = result[0]?.amount_tax ?? 0;

    return { ttc, ht: ttc - tax, tax };
}