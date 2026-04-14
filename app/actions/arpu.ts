"use server";
import { odooClient, OdooDomain } from "@/lib/odoo/odoo-json2-client";
import { format, startOfWeek, parseISO, getMonth, startOfYear, endOfYear, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

/* ================= NORMALISATION PHONE ================= */
function normalizePhone(phone?: string): string | null {
  if (!phone) return null;
  let cleaned = phone.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
  if (cleaned.startsWith("0")) cleaned = "+243" + cleaned.slice(1);
  if (cleaned.startsWith("243")) cleaned = "+" + cleaned;
  return cleaned.length > 5 ? cleaned : null;
}

/* ================= MAIN FUNCTION ================= */
export async function getArpuStats(
  dateRange: { from: Date; to: Date },
  selectedSegments: string[]
) {
  const yearStart = startOfYear(dateRange.from);
  const yearEnd = endOfYear(dateRange.from);

  const lineDomain: OdooDomain = [
    ["order_id.date_order", ">=", format(yearStart, "yyyy-MM-dd 00:00:00")],
    ["order_id.date_order", "<=", format(yearEnd, "yyyy-MM-dd 23:59:59")],
    ["order_id.state", "in", ["paid", "done", "invoiced"]],
  ];

  if (selectedSegments.length > 0) {
    lineDomain.push(["product_id.x_studio_segment", "in", selectedSegments]);
  }

  const lines = await odooClient.searchRead<any>("pos.order.line", {
    domain: lineDomain,
    fields: ["price_unit", "qty", "order_id", "product_id", "create_date"],
    limit: 100000,
  });

  if (lines.length === 0) return emptyResult();

  const orderIds = Array.from(new Set(lines.map(l => l.order_id[0])));
  const orders = await odooClient.searchRead<any>("pos.order", {
    domain: [["id", "in", orderIds]], fields: ["id", "partner_id"]
  });
  const orderToPartnerMap = new Map(orders.map(o => [o.id, o.partner_id?.[0]]));
  const partnerIds = Array.from(new Set(orders.map(o => o.partner_id?.[0]).filter(Boolean)));

  // 1. RÉCUPÉRATION DES PARTENAIRES
  const partners = await odooClient.searchRead<any>("res.partner", {
    domain: [["id", "in", partnerIds]], 
    fields: ["id", "phone", "create_date"]
  });

  // 2. AGRÉGATION PAR TÉLÉPHONE POUR TROUVER LA DATE DE CRÉATION LA PLUS ANCIENNE
  const phoneToEarliestDate = new Map<string, Date>();
  partners.forEach(p => {
    const phone = normalizePhone(p.phone);
    if (phone) {
      const pDate = parseISO(p.create_date);
      if (!phoneToEarliestDate.has(phone) || pDate < phoneToEarliestDate.get(phone)!) {
        phoneToEarliestDate.set(phone, pDate);
      }
    }
  });

  // 3. MAPPING FINAL DU PARTENAIRE VERS SON INFO "CLIENT UNIQUE"
  const partnerInfoMap = new Map(partners.map(p => {
    const phone = normalizePhone(p.phone);
    // Si téléphone, on prend la date la plus ancienne du groupe téléphone, sinon sa propre date
    const finalCreatedAt = phone ? phoneToEarliestDate.get(phone) : parseISO(p.create_date);
    return [p.id, { phone, created_at: finalCreatedAt }];
  }));

  const productIds = Array.from(new Set(lines.map(l => l.product_id[0])));
  const products = await odooClient.searchRead<any>("product.product", {
    domain: [["id", "in", productIds]], fields: ["id", "x_studio_segment"]
  });
  const productToSegmentMap = new Map(products.map(p => [p.id, p.x_studio_segment || "Autre"]));

  // --- STRUCTURES ---
  const monthsMatrix = Array.from({ length: 12 }, (_, i) => ({
    monthIndex: i, revenue: 0, customers: new Set<string>(),
    femme: 0, enfant: 0, beauty: 0, acqCount: new Set<string>(), acqRev: 0,
    recCount: new Set<string>(), recRev: 0,
  }));

  const weeklyAggregator = new Map<string, { revenue: number; phones: Set<string> }>();
  const customerRevenueMap = new Map<string, number>(); 
  const customerOrderCountMap = new Map<string, number>();

  const filterFrom = dateRange.from;
  const filterTo = dateRange.to;
  let periodRevenue = 0;
  const periodSegments: any = { Femme: 0, Enfant: 0, Beauty: 0 };
  const periodPhones = new Set<string>();

  // --- TRAITEMENT ---
  lines.forEach(line => {
    const amount = line.price_unit * line.qty;
    const lineDate = parseISO(line.create_date);
    const mIndex = getMonth(lineDate);
    
    const orderId = line.order_id[0];
    const partnerId = orderToPartnerMap.get(orderId);
    const partnerInfo = partnerId ? partnerInfoMap.get(partnerId) : null;
    
    const customerKey = partnerInfo?.phone 
        ? `PHONE-${partnerInfo.phone}` 
        : (partnerId ? `PARTNER-${partnerId}` : `GUEST-${orderId}`);

    // LOGIQUE ACQUISITION BASÉE SUR LA DATE LA PLUS ANCIENNE DU CLIENT UNIQUE
    const monthStart = startOfMonth(new Date(yearStart.getFullYear(), mIndex));
    const monthEnd = endOfMonth(new Date(yearStart.getFullYear(), mIndex));
    
    const isAcquisitionInMonth = partnerInfo?.created_at 
        ? (partnerInfo.created_at >= monthStart && partnerInfo.created_at <= monthEnd)
        : true; // Les Guests ou sans infos sont traités comme nouveaux

    const segment = productToSegmentMap.get(line.product_id[0]);

    // 1. Matrix Mensuelle
    monthsMatrix[mIndex].revenue += amount;
    monthsMatrix[mIndex].customers.add(customerKey);
    if (segment === "Femme") monthsMatrix[mIndex].femme += amount;
    if (segment === "Enfant") monthsMatrix[mIndex].enfant += amount;
    if (segment === "Beauty") monthsMatrix[mIndex].beauty += amount;

    if (isAcquisitionInMonth) {
      monthsMatrix[mIndex].acqCount.add(customerKey);
      monthsMatrix[mIndex].acqRev += amount;
    } else {
      monthsMatrix[mIndex].recCount.add(customerKey);
      monthsMatrix[mIndex].recRev += amount;
    }

    // 2. Période sélectionnée
    if (lineDate >= filterFrom && lineDate <= filterTo) {
      periodRevenue += amount;
      periodPhones.add(customerKey);
      if (segment && periodSegments[segment] !== undefined) periodSegments[segment] += amount;
      
      customerRevenueMap.set(customerKey, (customerRevenueMap.get(customerKey) || 0) + amount);
      customerOrderCountMap.set(customerKey, (customerOrderCountMap.get(customerKey) || 0) + 1);

      const weekStart = startOfWeek(lineDate, { weekStartsOn: 1 });
      const weekKey = format(weekStart, "yyyy-MM-dd");
      if (!weeklyAggregator.has(weekKey)) {
        weeklyAggregator.set(weekKey, { revenue: 0, phones: new Set() });
      }
      const wStats = weeklyAggregator.get(weekKey)!;
      wStats.revenue += amount;
      wStats.phones.add(customerKey);
    }
  });

  // --- FORMATAGE FINAL ---
  const chartData = Array.from(weeklyAggregator.entries())
    .map(([date, stats]) => ({
      date,
      displayDate: `Sem. ${format(parseISO(date), "II", { locale: fr })}`,
      revenue: stats.revenue,
      arpu: stats.phones.size > 0 ? stats.revenue / stats.phones.size : 0
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    globalArpu: periodPhones.size > 0 ? periodRevenue / periodPhones.size : 0,
    totalRevenue: periodRevenue,
    totalCustomers: periodPhones.size,
    segmentsMix: formatSegmentsMix(periodSegments, periodRevenue),
    yearlySummary: monthsMatrix.map(m => ({
        label: format(new Date(yearStart.getFullYear(), m.monthIndex), "MMM", { locale: fr }),
        revenue: m.revenue,
        arpu: m.customers.size > 0 ? m.revenue / m.customers.size : 0,
        base: m.customers.size,
        femme: m.femme, enfant: m.enfant, beauty: m.beauty,
        acqCount: m.acqCount.size, acqRev: m.acqRev,
        recCount: m.recCount.size, recRev: m.recRev
    })),
    chartData,
    customerList: Array.from(customerRevenueMap.entries())
      .map(([id, rev]) => ({ id, revenue: rev, orderCount: customerOrderCountMap.get(id) || 0, arpu: rev }))
      .sort((a, b) => b.revenue - a.revenue).slice(0, 10),
  };
}

function formatSegmentsMix(segments: any, total: number) {
  const mix: any = {};
  Object.keys(segments).forEach(key => {
    mix[key] = { revenue: segments[key], percent: total > 0 ? Math.round((segments[key] / total) * 100) : 0 };
  });
  return mix;
}

function emptyResult() {
    return { globalArpu: 0, totalRevenue: 0, totalCustomers: 0, segmentsMix: {}, chartData: [], customerList: [], yearlySummary: [] };
}