"use server";
import { odooClient } from "@/lib/odoo/odoo-json2-client";
import { format, isBefore, parseISO, startOfMonth, startOfDay } from "date-fns";

const REPORT_START_DATE = "2026-04-01 00:00:00";

/**
 * Récupère les boutiques basées sur les configurations POS
 */
export async function getFinanceMetadata() {
  const posConfigs = await odooClient.searchRead<any>("pos.config", {
    fields: ["id", "name"],
    domain: [
        ["active", "=", true],
        ["name", "not ilike", "zarina"],
        ["name", "not ilike", "facturation"],
    ]
  });

  return {
    shops: posConfigs.map((c: any) => ({
      id: c.id,
      name: c.name.replace("Boutique ", "").replace("POS ", ""), // Nettoyage du nom
    }))
  };
}       

/**
 * Helper pour initialiser la structure des résultats avec toutes les boutiques à zéro
 */
function createEmptyStructure(shops: any[]) {
  const shopIds = shops.map(s => s.id);
  const base = () => ({
    total: 0,
    shops: Object.fromEntries(shopIds.map(id => [id, 0]))
  });

  return {
    so: base(),
    entree: base(),
    objectif: base()
  };
}

/**
 * Calcule les statistiques de Cash Flow
 */
export async function getCashFlowStats(dateRange: { from: Date; to: Date }) {
  const startStr = REPORT_START_DATE;
  const endStr = format(dateRange.to, "yyyy-MM-dd 23:59:59");
  const daySelectionStart = startOfDay(dateRange.from);

  const { shops } = await getFinanceMetadata();
  const result: any = {
    global: createEmptyStructure(shops),
    femme: createEmptyStructure(shops),
    beauty: createEmptyStructure(shops),
    enfant: createEmptyStructure(shops),
  };

  const lines = await odooClient.searchRead<any>("pos.order.line", {
    domain: [
      ["order_id.date_order", ">=", startStr],
      ["order_id.date_order", "<=", endStr],
      ["order_id.state", "in", ["paid", "done", "invoiced"]]
    ],
    fields: ["price_unit", "qty", "order_id", "product_id", "create_date"]
  });

  if (lines.length === 0) return result;

  // Mappings (Identique à votre logique actuelle)
  const orderIds = Array.from(new Set(lines.map(l => l.order_id[0])));
  const orders = await odooClient.searchRead<any>("pos.order", {
    domain: [["id", "in", orderIds]], fields: ["id", "config_id"]
  });
  const orderToConfigMap = new Map(orders.map(o => [o.id, o.config_id[0]]));

  const productIds = Array.from(new Set(lines.map(l => l.product_id[0])));
  const products = await odooClient.searchRead<any>("product.product", {
    domain: [["id", "in", productIds]], fields: ["id", "x_studio_segment"]
  });
  const productSegmentMap = new Map(products.map(p => [p.id, p.x_studio_segment || "Autre"]));

  lines.forEach(line => {
    const amount = line.price_unit * line.qty;
    const lineDate = parseISO(line.create_date);
    const configId = orderToConfigMap.get(line.order_id[0]);
    const segment = (productSegmentMap.get(line.product_id[0]) || "Autre").toLowerCase();
    
    // LOGIQUE CUMULÉE : Avant aujourd'hui = S.O (Cumul depuis Avril), Aujourd'hui = Entrée
    const isOpeningBalance = isBefore(lineDate, daySelectionStart);
    const targetType = isOpeningBalance ? "so" : "entree";

    if (configId && result.global[targetType]) {
      result.global[targetType].total += amount;
      result.global[targetType].shops[configId] += amount;

      if (result[segment]) {
        result[segment][targetType].total += amount;
        result[segment][targetType].shops[configId] += amount;
      }
    }
  });

  return result;
}

/**
 * Calcule la Trésorerie Réelle (Tableau 2)
 */
export async function getCaissePrincipaleStats(dateRange: { from: Date; to: Date }) {
  const startStr = REPORT_START_DATE;
  const endStr = format(dateRange.to, "yyyy-MM-dd 23:59:59");
  const daySelectionStart = startOfDay(dateRange.from);

  const { shops } = await getFinanceMetadata();
  const initType = () => ({ 
    so: { total: 0, shops: Object.fromEntries(shops.map(s => [s.id, 0])) }, 
    entree: { total: 0, shops: Object.fromEntries(shops.map(s => [s.id, 0])) }, 
    depense: { total: 0, shops: Object.fromEntries(shops.map(s => [s.id, 0])) },
    epargne: { total: 0, shops: Object.fromEntries(shops.map(s => [s.id, 0])) },
    sortie: { total: 0, shops: Object.fromEntries(shops.map(s => [s.id, 0])) },
    sf: { total: 0, shops: Object.fromEntries(shops.map(s => [s.id, 0])) }
  });

  const result: any = { cash: initType(), mobile: initType(), bank: initType() };

  const posConfigs = await odooClient.searchRead<any>("pos.config", { fields: ["id", "journal_id"] });
  const journalToConfigMap = new Map(posConfigs.map(c => [c.journal_id[0], c.id]));

  // 1. Fetch PAIEMENTS cumulés (Entrées)
  const payments = await odooClient.searchRead<any>("pos.payment", {
    domain: [
      ["payment_date", ">=", startStr],
      ["payment_date", "<=", endStr],
      ["pos_order_id.state", "in", ["paid", "done", "invoiced"]]
    ],
    fields: ["amount", "payment_method_id", "pos_order_id", "payment_date"]
  });

  // 2. Fetch DÉPENSES cumulées (Sorties de caisse manuelles)
  const expenseLines = await odooClient.searchRead<any>("hr.expense", {
    domain: [
      ["date", ">=", "2026-04-01"],
      ["date", "<=", format(dateRange.to, "yyyy-MM-dd")],
    ],
    // fields: [],
    fields: [
      "id", "name", "company_id", "product_id", "state", "journal_id", "approval_state",
      "total_amount", "currency_id", "date", "employee_id", "payment_method_line_id"
    ],
  });

  // Logic identification méthode de paiement (Cash/Mobile/Bank)
  const methods = await odooClient.searchRead<any>("pos.payment.method", { fields: ["id", "name", "is_cash_count"] });
  const methodMap = new Map(methods.map(m => {
    const n = m.name.toLowerCase();
    if (m.is_cash_count || n.includes("cash")) return [m.id, "cash"];
    if (n.includes("pesa") || n.includes("orange") || n.includes("airtel")) return [m.id, "mobile"];
    return [m.id, "bank"];
  }));

  const orderIds = Array.from(new Set(payments.map(p => p.pos_order_id[0])));
  const orders = await odooClient.searchRead<any>("pos.order", { domain: [["id", "in", orderIds]], fields: ["id", "config_id"] });
  const orderToConfig = new Map(orders.map(o => [o.id, o.config_id[0]]));

  // Agrégation des Entrées
  payments.forEach(p => {
    const type = methodMap.get(p.payment_method_id[0]) || "bank";
    const configId = orderToConfig.get(p.pos_order_id[0]);
    if (!configId) return;

    const isOpening = isBefore(parseISO(p.payment_date), daySelectionStart);
    const target = isOpening ? "so" : "entree";
    
    result[type][target].total += p.amount;
    result[type][target].shops[configId] += p.amount;
  });

  // Agrégation des Dépenses (uniquement sur le Cash)
  expenseLines.forEach(line => {
    // const configId = journalToConfigMap.get(line.journal_id[0]);
    // if (!configId) return;

    const isOpening = isBefore(parseISO(line.date), daySelectionStart);
    if (isOpening) {
      // Les dépenses passées depuis Avril diminuent le S.O actuel
      result.cash.so.total -= line.total_amount;
      // result.cash.so.shops[configId] -= line.total_amount;
    } else {
      result.cash.depense.total += line.total_amount;
      // result.cash.depense.shops[configId] += line.total_amount;
    }
  });

  ["cash", "mobile", "bank"].forEach(type => {
    const t = result[type];
    
    // Calcul pour chaque shop individuellement
    shops.forEach(shop => {
      const id = shop.id;
      const closing = (t.so.shops[id] || 0) + 
        (t.entree.shops[id] || 0) - 
        (t.depense.shops[id] || 0) - 
        (t.epargne.shops[id] || 0) - 
        (t.sortie.shops[id] || 0);
      
      t.sf.shops[id] = closing;
    });

    // Calcul du total global pour ce type
    t.sf.total = t.so.total + t.entree.total - t.depense.total - t.epargne.total - t.sortie.total;
  });

  return result;
}

function emptyCashFlow(shops: any[]) {
    const base = () => ({ total: 0, shops: Object.fromEntries(shops.map(s => [s.id, 0])) });
    return {
        global: { so: base(), entree: base(), objectif: base() },
        femme: { so: base(), entree: base(), objectif: base() },
        beauty: { so: base(), entree: base(), objectif: base() },
        enfant: { so: base(), entree: base(), objectif: base() },
    };
}