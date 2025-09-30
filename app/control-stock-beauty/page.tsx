import { ControlStockBeautyModel } from "../types/ControlStockBeautyModel";
import { POSOrderLine } from "../types/pos";
import { mapOdooProduct, Product } from "../types/product_template";
import { PurchaseOrderLine } from "../types/purchase";
import { controlStockBeautyColumns } from "./columns";
import { DataTable } from "./data-table";

export const dynamic = 'force-dynamic'

// Cache en mémoire avec invalidation après 5 minutes
let cachedData: {
  data: ControlStockBeautyModel[];
  timestamp: number;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getProducts() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/product.template?fields=id,name,list_price,categ_id,hs_code,product_variant_id,x_studio_many2one_field_21bvh,x_studio_many2one_field_QyelN,x_studio_many2one_field_Arl5D,description_pickingin&domain=[[\"categ_id\",\"ilike\",\"beauty\"]]`,
    { 
      next: { 
        revalidate: 300 // 5 minutes en secondes pour ISR
      } 
    }
  );

  if (!res.ok) {
    throw new Error("Erreur API Odoo - Produits");
  }

  return res.json();
}

async function getPurchaseOrderLines() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/purchase.order.line?fields=id,product_id,product_qty,qty_received,price_unit&domain=[["partner_id", "not in", [24099, 23705, 1, 23706, 23707, 23708, 27862]]]`,
    { 
      next: { 
        revalidate: 300 // 5 minutes
      } 
    }
  );

  if (!res.ok) {
    throw new Error("Erreur API Odoo - Commandes d'achat");
  }

  return res.json();
}

async function getPOSOrderLines() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order.line?fields=id,qty,product_id,qty`,
    { 
      next: { 
        revalidate: 300 // 5 minutes
      } 
    }
  );

  if (!res.ok) {
    throw new Error("Erreur API Odoo - Ventes POS");
  }

  return res.json();
}

async function getControlStockData(): Promise<ControlStockBeautyModel[]> {
  // Vérifier le cache en mémoire
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    console.log("📦 Utilisation des données en cache");
    return cachedData.data;
  }

  console.log("🔄 Chargement des données fraîches...");
  
  const [products, purchaseOrderLines, posOrderLines] = await Promise.all([
    getProducts(),
    getPurchaseOrderLines(),
    getPOSOrderLines()
  ]);

  const data = products.records.map(mapOdooProduct);
  const groupedData: ControlStockBeautyModel[] = [];
  const groupedMap = new Map<string, Product[]>();

  data.forEach((product: Product) => {
    const key = product.hs_code || "UNKNOWN";
    if (!groupedMap.has(key)) groupedMap.set(key, []);
    groupedMap.get(key)!.push(product);
  });

  groupedMap.forEach((productsGroup, hs_code) => {
    const label = productsGroup[0].name;
    const cleanName = label.split("[").shift()?.trim();
    const name = `${cleanName} - ${hs_code} - (${productsGroup[0].listPrice}$)`;

    const relatedLines = purchaseOrderLines.records.filter(
      (line: PurchaseOrderLine) =>
        line.product_id &&
        productsGroup.some((p) => p.productVariantId === line.product_id[0])
    );

    const relatedPosLines = posOrderLines.records.filter(
      (line: POSOrderLine) =>
        line.product_id &&
        productsGroup.some((p) => p.productVariantId === line.product_id[0])
    );

    const product_qty = relatedLines.reduce(
      (sum: number, line: PurchaseOrderLine) => sum + (line.product_qty || 0),
      0
    );
    const qty_received = relatedLines.reduce(
      (sum: number, line: PurchaseOrderLine) => sum + (line.qty_received || 0),
      0
    );
    const not_received = product_qty - qty_received;
    const qty_sold = relatedPosLines.reduce(
      (sum: number, line: POSOrderLine) => sum + (line.qty || 0),
      0
    );
    const qty_available = qty_received - qty_sold;

    groupedData.push({
      hs_code,
      name,
      product_qty,
      qty_received,
      not_received,
      qty_sold,
      qty_available
    });
  });

  // Mettre en cache
  cachedData = {
    data: groupedData,
    timestamp: Date.now()
  };

  return groupedData;
}

export default async function ControlStockBeautyPage() {
  const data = await getControlStockData();

  // Calcul des métriques globales
  const totalProducts = data.length;
//   const totalAvailable = data.reduce((sum, item) => sum + item.qty_available, 0);
//   const totalSold = data.reduce((sum, item) => sum + item.qty_sold, 0);
//   const totalPending = data.reduce((sum, item) => sum + item.not_received, 0);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Control Stock Beauty
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Gestion et analyse du stock produits beauté
              </p>
            </div>
            
            {/* Stats */}
            {/* <div className="flex flex-wrap gap-4 mt-4 lg:mt-0">
              <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg">
                <p className="text-sm text-blue-600 dark:text-blue-400">Produits</p>
                <p className="text-xl font-semibold text-blue-700 dark:text-blue-300">{totalProducts}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400">Disponible</p>
                <p className="text-xl font-semibold text-green-700 dark:text-green-300">{totalAvailable}</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 px-4 py-2 rounded-lg">
                <p className="text-sm text-orange-600 dark:text-orange-400">Vendus</p>
                <p className="text-xl font-semibold text-orange-700 dark:text-orange-300">{totalSold}</p>
              </div>
            </div> */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Table Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 sm:mb-0">
                Inventaire des Produits
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Données en temps réel</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="p-6">
            <DataTable columns={controlStockBeautyColumns} data={data} />
          </div>

          {/* Table Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {totalProducts} produits trouvés • Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR')}
            </p>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">💡 Conseil</h3>
            <p className="text-blue-700 dark:text-blue-400">
              Les données sont mises en cache pendant 5 minutes pour optimiser les performances.
            </p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-800 dark:text-purple-300 mb-1">🔄 Actualisation</h3>
            <p className="text-purple-700 dark:text-purple-400">
              Recharger la page pour obtenir les données les plus récentes.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}