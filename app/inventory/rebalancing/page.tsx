// app/inventory/rebalancing/page.tsx
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import RebalancingClient from "./rebalancing-client";
import type { RebalancingCompany } from "./_lib/types";

export const metadata: Metadata = {
    title: "Rééquilibrage | Stock",
    description:
        "Aligner le stock physique avec les ventes inter-boutiques.",
};

export const dynamic = "force-dynamic";

export default async function RebalancingPage() {
    const supabase = await createClient();

    const { data: shops, error } = await supabase
        .from("shops")
        .select("id, name, odoo_company_id")
        .not("odoo_company_id", "is", null)
        .order("name");

    if (error) {
        console.warn("[REBALANCING] shops fetch failed:", error.message);
    }

    const companies: RebalancingCompany[] = (shops ?? [])
        .filter((s) => s.odoo_company_id != null)
        .map((s) => ({
            id: s.id,
            name: s.name,
            odooCompanyId: s.odoo_company_id as number,
        }));

    return <RebalancingClient companies={companies} />;
}