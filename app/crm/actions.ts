"use server";

import { odooClient } from "@/lib/odoo/odoo-json2-client";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export async function getCRMDashboardData() {
  const now = new Date();
  const startMonth = format(startOfMonth(now), "yyyy-MM-dd HH:mm:ss");
  const startPrevMonth = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd HH:mm:ss");
  const endPrevMonth = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd HH:mm:ss");

  try {
    // 1. Statistiques Globales Clients
    const totalCustomers = await odooClient.searchCount("res.partner", [["customer_rank", ">", 0]]);
    const newCustomers = await odooClient.searchCount("res.partner", [["create_date", ">=", startMonth]]);

    // 2. Données pour la Rétention (Objectif 80%)
    const cohortRef = await odooClient.searchRead<{ partner_id: [number, string] }>("pos.order", {
      domain: [["date_order", ">=", startPrevMonth], ["date_order", "<=", endPrevMonth], ["partner_id", "!=", false]],
      fields: ["partner_id"]
    });

    const cohortCurrent = await odooClient.searchRead<{ partner_id: [number, string] }>("pos.order", {
      domain: [["date_order", ">=", startMonth], ["partner_id", "!=", false]],
      fields: ["partner_id"]
    });

    const refIds = new Set(cohortRef.map(o => o.partner_id[0]));
    const currentIds = new Set(cohortCurrent.map(o => o.partner_id[0]));
    
    const returned = Array.from(refIds).filter(id => currentIds.has(id)).length;
    const retentionRate = refIds.size > 0 ? Math.round((returned / refIds.size) * 100) : 0;

    // 3. Pipeline (Leads/Opportunités si utilisé dans Odoo)
    const activeLeads = await odooClient.searchCount("crm.lead", [["type", "=", "opportunity"], ["probability", "<", 100]]);

    return {
      kpis: {
        totalCustomers,
        newCustomers,
        retentionRate,
        activeLeads
      },
      retention: {
        totalRef: refIds.size,
        returned,
        rate: retentionRate
      }
    };
  } catch (error) {
    console.error("CRM Dashboard Error:", error);
    return null;
  }
}