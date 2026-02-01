'use server';

import { getMonthDates } from "@/lib/date-utils"; 
import { odooClient } from "@/lib/odoo/xmlrpc";

// --- TYPES ---
export interface BrandData {
  id: string;
  name: string;
  type: 'brand';
  totalAmount: number;
  totalQuantity: number;
  dailySales: Record<string, { amount: number, quantity: number }>;
}

export interface BeautyBrandsData {
  brands: BrandData[];
  hsCodeGroups: any[]; // Tu peux typer plus précisément si besoin
  products: any[];
  dateRange: string[];
}

// --- FONCTION PRINCIPALE OPTIMISÉE ---
export async function getBeautyBrandsData(boutiqueId?: string, month?: string, year?: string): Promise<BeautyBrandsData> {
  // 1. Définition de la période
  const { firstDay, lastDay } = getMonthDates(month, year); // Doit renvoyer 'YYYY-MM-DD'

  // 2. Construction du Domain (Filtre SQL Odoo)
  const domain = [
    ['order_id.date_order', '>=', firstDay],
    ['order_id.date_order', '<=', lastDay],
    ['order_id.state', 'in', ['paid', 'done', 'invoiced']],
    ['product_id.x_studio_segment', 'ilike', 'beauty'],
  ];
  
  if (boutiqueId && boutiqueId !== 'all') {
    domain.push(['order_id.config_id.id', '=', boutiqueId]);
  } else {
    // Exclusion des shops de test/historique si nécessaire
    domain.push(['order_id.config_id.id', '!=', "19"]); 
  }

  try {
    const lines = await odooClient.searchRead('pos.order.line', {
      domain,
      fields: ['create_date', 'product_id', 'qty', 'price_unit', 'price_subtotal_incl'],
      order: 'create_date asc'
    }) as any[];

    if (lines.length === 0) {
      return { brands: [], hsCodeGroups: [], products: [], dateRange: [] };
    }

    // 4. RÉCUPÉRATION DES PRODUITS UNIQUES (Pour Marque & HS Code)
    const productIds = [...new Set(lines.map(l => l.product_id[0]))];
    
    // On récupère les métadonnées produits en une seule requête
    const productsInfo = await odooClient.searchRead('product.product', {
      domain: [['id', 'in', productIds]],
      fields: ['id', 'name', 'hs_code', 'x_studio_many2one_field_21bvh', 'default_code'] 
    }) as any[];

    // Création d'une Map pour accès instantané (O(1))
    const productMap = new Map();
    productsInfo.forEach((p: any) => {
        // Gestion sécurisée du champ Marque (Many2one est souvent [ID, "Nom"])
        let brandName = 'Autres';
        if (p.x_studio_many2one_field_21bvh) {
            brandName = Array.isArray(p.x_studio_many2one_field_21bvh) 
                ? p.x_studio_many2one_field_21bvh[1] 
                : p.x_studio_many2one_field_21bvh; // Cas rare où ce serait une string
        }

        productMap.set(p.id, {
            name: p.name,
            hsCode: p.hs_code || 'SANS_HS_CODE',
            brand: brandName
        });
    });

    // 5. AGRÉGATION EN MÉMOIRE (Le cœur de la logique)
    const brandsMap = new Map<string, BrandData>();
    const hsCodeMap = new Map<string, any>();
    const productsMap = new Map<string, any>();
    const dateSet = new Set<string>();

    lines.forEach((line: any) => {
        const pId = line.product_id[0];
        const info = productMap.get(pId);
        
        // Si le produit n'est pas trouvé dans la map (cas rare d'incohérence), on saute
        if (!info) return;

        // Extraction Date (YYYY-MM-DD)
        const date = line.create_date.split(' ')[0];
        dateSet.add(date);

        const qty = line.qty || 0;
        const amount = line.price_subtotal_incl || 0;

        // A. NIVEAU MARQUE
        const brandId = `brand-${info.brand}`;
        if (!brandsMap.has(brandId)) {
            brandsMap.set(brandId, {
                id: brandId,
                name: info.brand,
                type: 'brand',
                dailySales: {},
                totalAmount: 0,
                totalQuantity: 0
            });
        }
        const brandData = brandsMap.get(brandId)!;
        brandData.totalAmount += amount;
        brandData.totalQuantity += qty;
        if (!brandData.dailySales[date]) brandData.dailySales[date] = { amount: 0, quantity: 0 };
        brandData.dailySales[date].amount += amount;
        brandData.dailySales[date].quantity += qty;

        // B. NIVEAU HS CODE (Modèle)
        const hsCodeId = `hscode-${brandId}-${info.hsCode}`;
        if (!hsCodeMap.has(hsCodeId)) {
            // Helper pour nettoyer le nom (garder logique existante)
            const cleanName = info.name.split('(')[0].trim(); 
            hsCodeMap.set(hsCodeId, {
                id: hsCodeId,
                name: `${cleanName} (${info.hsCode})`,
                type: 'hscode',
                parentId: brandId,
                dailySales: {},
                totalAmount: 0,
                totalQuantity: 0,
                hsCode: info.hsCode
            });
        }
        const hsData = hsCodeMap.get(hsCodeId)!;
        hsData.totalAmount += amount;
        hsData.totalQuantity += qty;
        if (!hsData.dailySales[date]) hsData.dailySales[date] = { amount: 0, quantity: 0 };
        hsData.dailySales[date].amount += amount;
        hsData.dailySales[date].quantity += qty;

        // C. NIVEAU PRODUIT
        const prodId = `product-${pId}`;
        if (!productsMap.has(prodId)) {
            productsMap.set(prodId, {
                id: prodId,
                name: info.name,
                type: 'product',
                parentId: hsCodeId,
                dailySales: {},
                totalAmount: 0,
                totalQuantity: 0
            });
        }
        const prodData = productsMap.get(prodId)!;
        prodData.totalAmount += amount;
        prodData.totalQuantity += qty;
        if (!prodData.dailySales[date]) prodData.dailySales[date] = { amount: 0, quantity: 0 };
        prodData.dailySales[date].amount += amount;
        prodData.dailySales[date].quantity += qty;
    });

    // 6. FORMATAGE FINAL
    const dateRange = Array.from(dateSet).sort();

    return {
      brands: Array.from(brandsMap.values()).sort((a, b) => b.totalAmount - a.totalAmount),
      hsCodeGroups: Array.from(hsCodeMap.values()),
      products: Array.from(productsMap.values()),
      dateRange
    };

  } catch (error) {
    console.error("❌ Erreur BeautyBrandsData:", error);
    // Retour vide propre en cas d'erreur pour ne pas crasher l'UI
    return { brands: [], hsCodeGroups: [], products: [], dateRange: [] };
  }
}

// --- FONCTION CONFIG (Simple) ---
export async function getPOSConfig() {
    try {
        const records = await odooClient.searchRead('pos.config', {
            fields: ['id', 'name'],
            // domain: [['id', 'not in', [19]]] // Ajoute si besoin
        });
        return { records };
    } catch (e) {
        console.error("Erreur Config POS", e);
        return { records: [] };
    }
}