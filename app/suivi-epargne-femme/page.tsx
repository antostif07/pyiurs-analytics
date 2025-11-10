import { Suspense } from "react"
import SuiviEpargneFemme from "./page.client"
import { POSConfig, POSOrderLine } from "../types/pos"

export const dynamic = 'force-dynamic'

export interface BoutiqueSalesData {
    date: string;
    total_qty: number;
    total_sales: number;
    items: POSOrderLine[];
    total_expense: number;
}

/**
 * Regroupe les lignes POS par jour (YYYY-MM-DD)
 * et calcule le total des ventes et des quantités
 */
function groupOrdersByDay(records: POSOrderLine[]): { date: string; total_qty: number; total_sales: number; items: POSOrderLine[] }[] {
  const grouped = records.reduce((acc, record) => {
    const date = record.create_date.split(' ')[0]; // extrait 'YYYY-MM-DD'

    if (!acc[date]) {
      acc[date] = {
        date,
        total_qty: record.qty,
        total_sales: record.qty * record.price_unit,
        items: [record],
      };
    } else {
      acc[date].total_qty += record.qty;
      acc[date].total_sales += record.qty * record.price_unit;
      acc[date].items.push(record);
    }

    return acc;
  }, {} as Record<string, { date: string; total_qty: number; total_sales: number; items: POSOrderLine[] }>);

  // Transformer l’objet en tableau trié par date
  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
}

async function getExpenseNotes(month?: string, year?: string, selectedBoutique?: string) {
  const m = month || (new Date().getMonth() + 1).toString().padStart(2, '0');
  const y = year || new Date().getFullYear().toString();
  const date = `${y}-${m}-01`;
  const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();

  let societe;

  switch (selectedBoutique) {
    case "1": societe = 1; break;
    case "13": societe = 4; break;
    case "14": societe = 5; break;
    case "15": societe = 6; break;
    case "17": societe = 8; break;
    default: societe = undefined;
  }

  let domain = `[["create_date", ">=", "${date}"], ["create_date", "<=", "${y}-${m}-${lastDay}"], ["product_id", "ilike", "epargne marchandise"], ["sheet_id.payment_method_line_id.journal_id", "not ilike", "sortie"]]`;

  if (societe) {
    domain = `[["create_date", ">=", "${date}"], ["create_date", "<=", "${y}-${m}-${lastDay}"], ["product_id", "ilike", "epargne marchandise"], ["sheet_id.payment_method_line_id.journal_id", "not ilike", "sortie"], ["company_id", "=", ${societe}]]`;
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/hr.expense?domain=${domain}`,
    { next: { revalidate: 300 } }
  );

  if (!res.ok) throw new Error("Erreur API Odoo - Notes de frais");

  return res.json();
}

async function getPOSOrderLines(month?: string, year?: string, selectedBoutique?: string) {
  const m = month || (new Date().getMonth() + 1).toString().padStart(2, '0');
  const y = year || new Date().getFullYear().toString();
  const date = `${y}-${m}-01`;
  const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();

  let domain = `[["create_date", ">=", "${date} 00:01:00"], ["create_date", "<=", "${y}-${m}-${lastDay} 23:59:59"], ["product_id.categ_id", "ilike", "fashion"], ["product_id.categ_id", "ilike", "vetement"]]`;

  if (selectedBoutique) {
    domain = `[["create_date", ">=", "${date} 00:01:00"], ["create_date", "<=", "${y}-${m}-${lastDay} 23:59:59"], ["order_id.config_id.id","=","${selectedBoutique}"], ["product_id.categ_id", "ilike", "fashion"], ["product_id.categ_id", "ilike", "vetement"]]`;
  }

  // 1️⃣ Récupération des lignes POS
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order.line?fields=id,qty,name,product_id,price_unit,full_product_name,order_id,create_date&domain=${domain}`,
    { next: { revalidate: 300 } }
  );

  if (!res.ok) throw new Error("Erreur API Odoo - Lignes de commande POS");

  const orderLines = await res.json();

  return orderLines;
}

// Générer des données mockées réalistes
async function getData(selectedMonth?: string, selectedYear?: string, selectedBoutique?: string) {
  // 🧾 Récupération des ventes POS
  const posOrderLines = await getPOSOrderLines(selectedMonth, selectedYear, selectedBoutique);
  const groupedSales = groupOrdersByDay(posOrderLines.records);

  // 💸 Récupération des notes de frais
  const expenseNotes = await getExpenseNotes(selectedMonth, selectedYear, selectedBoutique);

  // 🗓️ Grouper aussi les dépenses par jour
interface ExpenseRecord {
    date: string;
    total_amount: number;
}

const groupedExpenses: Record<string, number> = expenseNotes.records.reduce((acc: Record<string, number>, exp: ExpenseRecord) => {
    const date: string = exp.date;
    if (!acc[date]) acc[date] = 0;
    acc[date] += exp.total_amount;
    return acc;
}, {} as Record<string, number>);

  // 📊 Fusionner ventes + dépenses dans un seul tableau
  const mergedData = groupedSales.map(day => ({
    ...day,
    total_expense: groupedExpenses[day.date] || 0,
    net_sales: day.total_sales - (groupedExpenses[day.date] || 0)
  }));
  
  return mergedData;
}


// Composant pour les indicateurs de performance
// function PerformanceIndicator({ actual, theoretical }: { actual: number; theoretical: number }) {
//   const percentage = theoretical > 0 ? (actual / theoretical) * 100 : 0
//   const isGood = percentage >= 80
//   const isWarning = percentage >= 50 && percentage < 80
//   const isBad = percentage < 50

//   let bgColor = "bg-gray-100"
//   let textColor = "text-gray-700"

//   if (isGood) {
//     bgColor = "bg-green-100"
//     textColor = "text-green-700"
//   } else if (isWarning) {
//     bgColor = "bg-yellow-100"
//     textColor = "text-yellow-700"
//   } else if (isBad) {
//     bgColor = "bg-red-100"
//     textColor = "text-red-700"
//   }

//   return (
//     <Badge variant="secondary" className={`${bgColor} ${textColor} font-medium`}>
//       {percentage.toFixed(1)}%
//     </Badge>
//   )
// }

// Composant principal
async function SalesDashboardContent({ 
  searchParams 
}: { 
  searchParams: Promise<{ month?: string; year?:string; boutique?: string }> 
}) {
    const params = await searchParams
    const selectedMonth = params.month
    const selectedYear = params.year
    const boutiqueId = params.boutique;
    const posConfigData = await getPOSConfig();
    const boutiques = posConfigData.records.map((config: POSConfig) => ({
        id: config.id,
        name: config.name
    } as POSConfig));
    const posData = await getData(selectedMonth, selectedYear, boutiqueId)

  return (
    <SuiviEpargneFemme
        boutiques={boutiques}
        selectedBoutiqueId={boutiqueId}
        month={selectedMonth}
        year={selectedYear}
        data={posData}
    />
  )
}

// Composant de fallback pour le loading
function SalesDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        {/* Squelette pour le reste du contenu */}
      </div>
    </div>
  )
}

// Page principale
export default async function SalesDashboardPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ month?: string; boutiques?: string }> 
}) {
  return (
    <Suspense fallback={<SalesDashboardSkeleton />}>
      <SalesDashboardContent searchParams={searchParams} />
    </Suspense>
  )
}

async function getPOSConfig() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.config?fields=id,name`,
    { next: { revalidate: 300 } }
  );
  if (!res.ok) throw new Error("Erreur API Odoo - Configuration POS");
  return res.json();
}