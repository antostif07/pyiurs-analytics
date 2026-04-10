import { odooClient } from "@/lib/odoo/xmlrpc";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

// ============================================================================
// TYPES STRICTS
// ============================================================================
export interface TopProduct {
  id: string; // La nouvelle clé unique : hs_code_color
  productId: number;
  name: string;
  color: string;
  qtySold: number;
  revenue: number;
  imageUrl: string;
}

export interface DailySale {
  date: string;
  revenue: number;
}

export interface FemmeDashboardStats {
  currentMonth: {
    revenue: number;
    unitsSold: number;
    averageOrderValue: number;
  };
  previousMonth: {
    revenue: number;
    unitsSold: number;
  };
  trends: {
    revenueGrowth: number; // en %
    unitsGrowth: number;   // en %
  };
  topProducts: TopProduct[];
  flopProducts: TopProduct[];
  dailySales: DailySale[];
}

export type OdooDomainCondition = [string, string, any];

export async function getFemmeDashboardData(): Promise<FemmeDashboardStats> {
  const now = new Date();
  const startCurrent = format(startOfMonth(now), "yyyy-MM-dd HH:mm:ss");
  const endCurrent = format(endOfMonth(now), "yyyy-MM-dd HH:mm:ss");
  
  const lastMonth = subMonths(now, 1);
  const startPrevious = format(startOfMonth(lastMonth), "yyyy-MM-dd HH:mm:ss");
  const endPrevious = format(endOfMonth(lastMonth), "yyyy-MM-dd HH:mm:ss");

  const baseDomain: OdooDomainCondition[] = [
    ['order_id.state', 'in',['paid', 'done', 'invoiced']],['product_id.x_studio_segment', 'ilike', 'femme']
  ];

  try {
    const [currentStatsRaw, previousStatsRaw, productSalesRaw] = await Promise.all([
      // 1. Stats du mois en cours
      odooClient.execute('pos.order.line', 'read_group', [], {
        domain: [
            ...baseDomain,
            ['order_id.date_order', '>=', startCurrent],
            ['order_id.date_order', '<=', endCurrent],
            ["product_id.id", "!=", 325965]
        ],
        fields: ['price_subtotal_incl', 'qty', 'order_id'],
        groupby:[], // On groupe tout ensemble pour avoir le total absolu
        lazy: false
      }),
      
      // 2. Stats du mois précédent (Pour calculer la croissance)
      odooClient.execute('pos.order.line', 'read_group', [], {
        domain: [
            ...baseDomain,['order_id.date_order', '>=', startPrevious],
            ['order_id.date_order', '<=', endPrevious],
            ["product_id.id", "!=", 325965]
        ],
        fields: ['price_subtotal_incl', 'qty'],
        groupby:[],
        lazy: false
      }),

      // 3. Top 5 Produits du mois
      odooClient.execute('pos.order.line', 'read_group', [], {
        domain: [
            ...baseDomain,['order_id.date_order', '>=', startCurrent],
            ['order_id.date_order', '<=', endCurrent],
            ["product_id.id", "!=", 325965]
        ],
        fields: ['price_subtotal_incl', 'qty', 'product_id'],
        groupby: ['product_id'],
        lazy: false
      })
    ]);

    const dailySalesRaw = await odooClient.execute('pos.order.line', 'read_group', [], {
        domain: [...baseDomain, ['order_id.date_order', '>=', startCurrent], ['order_id.date_order', '<=', endCurrent]],
        fields:['price_subtotal_incl'],
        groupby: ['create_date:day'],
        lazy: false
    })

    // --- CALCUL DES KPIS GLOBAUX ---
    const currentData = (currentStatsRaw as any[])[0] || {};
    const previousData = (previousStatsRaw as any[])[0] || {};

    const currentRevenue = currentData.price_subtotal_incl || 0;
    const currentUnits = currentData.qty || 0;
    const orderCount = currentData.__count || 1; 

    const prevRevenue = previousData.price_subtotal_incl || 0;
    const prevUnits = previousData.qty || 0;

    const revenueGrowth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 100;
    const unitsGrowth = prevUnits > 0 ? ((currentUnits - prevUnits) / prevUnits) * 100 : 100;

    // --- ÉTAPE 2 : AGRÉGATION INTELLIGENTE PAR HS_CODE ---
    
    // On extrait la liste unique des IDs de produits vendus ce mois-ci
    const salesArray = productSalesRaw as any[];
    const productIds = salesArray.map(p => p.product_id ? p.product_id[0] : null).filter(Boolean);

    let topProducts: TopProduct[] =[];
    let flopProducts: TopProduct[] =[];

    if (productIds.length > 0) {
      const productsInfo = await odooClient.searchRead('product.product', {
        domain: [['id', 'in', productIds]],
        fields:['id', 'name', 'hs_code', 'x_studio_many2one_field_Arl5D']
      }) as any[];

      const productDict = new Map(productsInfo.map(p => [p.id, p]));
      const hsCodeMap = new Map<string, TopProduct>();

      for (const sale of salesArray) {
        if (!sale.product_id) continue;
        
        const prodId = sale.product_id[0];
        const prodInfo = productDict.get(prodId);
        
        if (!prodInfo) continue;

        const hsCode = prodInfo.hs_code || `NO_HS_${prodId}`;
        const prodName = prodInfo.name.split('[')[0].trim().split(" - ")[1];

        const colorData = prodInfo.x_studio_many2one_field_Arl5D;
        const colorName = colorData ? colorData[1] : 'Standard';

        const groupKey = `${hsCode}_${colorName}`;

        if (hsCodeMap.has(groupKey)) {
          const existing = hsCodeMap.get(groupKey)!;
          existing.qtySold += (sale.qty || 0);
          existing.revenue += (sale.price_subtotal_incl || 0);
        } else {
          hsCodeMap.set(groupKey, {
            id: groupKey, 
            productId: prodId,
            name: `${prodName || ""} - ${hsCode}`, 
            color: colorName,
            qtySold: sale.qty || 0,
            revenue: sale.price_subtotal_incl || 0,
            imageUrl: `http://${process.env.NEXT_PUBLIC_IMAGES_DIR}/${groupKey}.jpg`
          });
        }
      }

      const allAggregatedProducts = Array.from(hsCodeMap.values());
      // ÉTAPE 3 : Tri JavaScript (très rapide) pour obtenir le Top 5 final
    topProducts = [...allAggregatedProducts]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5); 

    flopProducts = [...allAggregatedProducts]
        .sort((a, b) => a.revenue - b.revenue)
        .slice(0, 5);
    }

    const dailySales: DailySale[] = (dailySalesRaw as any[]).map(day => {
      // Odoo renvoie souvent "01 Mar 2026", on nettoie ça pour le graphique
      const rawDate = day['create_date:day'] || '';

      if (!rawDate) return { date: 'Inconnu', revenue: day.price_subtotal_incl || 0 };

      return {
        date: rawDate.split(' ')[0] + ' ' + rawDate.split(' ')[1], // Ex: "15 Mar"
        revenue: day.price_subtotal_incl || 0
      };
    });

    return {
      currentMonth: {
        revenue: currentRevenue,
        unitsSold: currentUnits,
        averageOrderValue: currentUnits > 0 ? currentRevenue / orderCount : 0
      },
      previousMonth: {
        revenue: prevRevenue,
        unitsSold: prevUnits
      },
      trends: {
        revenueGrowth,
        unitsGrowth
      },
      topProducts,
      flopProducts,
      dailySales
    };

  } catch (error) {
    console.error("[FEMME_DASHBOARD_ERROR]", error);
    throw new Error("Impossible de récupérer les statistiques Odoo.");
  }
}