'use server'

import { parseOdooFrenchDate } from "@/app/api/webhook/utils";
import { odooClient } from "@/lib/odoo/xmlrpc";
import { createClient } from "@/lib/supabase/server";
import { subDays, format } from "date-fns";

export async function getHSCodeDetails(hsCode: string) {
    const supabase = await createClient();
    const startDate = format(subDays(new Date(), 60), 'yyyy-MM-dd HH:mm:ss');

    // 1. Récupérer les données du Tracker (Supabase)
    const { data: tracker } = await supabase
        .from('beauty_inventory_tracker')
        .select('*')
        .eq('hs_code', hsCode)
        .single();

    // 2. Récupérer les ventes chronologiques (Odoo)
    const salesRaw = await odooClient.execute("pos.order.line", "read_group", [
        [
            ["product_id.hs_code", "=", hsCode],
            ["order_id.state", "in", ["paid", "done", "invoiced"]],
            ["create_date", ">=", startDate]
        ],
        ["qty"], ["create_date:day"], 0, 100, "create_date:day asc"
    ]) as any[];

    // 3. Récupérer le stock par emplacement (Odoo)
    const stockByLocation = await odooClient.execute("stock.quant", "read_group", [
        [
            ["product_id.hs_code", "=", hsCode],
            ["location_id.usage", "=", "internal"]
        ],
        ["quantity", "location_id"], ["location_id"]
    ]) as any[];

    const chartData = salesRaw.map(s => ({
        date: parseOdooFrenchDate(s['create_date:day']),
        ventes: s.qty
    }));

    return {
        tracker,
        chartData,
        locations: stockByLocation.map(l => ({
            name: l.location_id[1],
            qty: l.quantity
        }))
    };
}