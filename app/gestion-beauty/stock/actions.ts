'use server'

import { odooClient } from "@/lib/odoo/xmlrpc";

export interface InventoryGroup {
  hsCode: string;
  totalStock: number;
  productCount: number;
  firstName: string; // Nom du premier produit trouvé
  brand: string;     // Valeur du champ x_studio_many2one_field_21bvh,
  gamme?: string;    // Valeur du champ x_studio_many2one_field_Arl5D,
  totalPurchased: number;
  totalReceived: number;
  totalResidual: number;
  totalSold: number;
  stock_24: number;
  stock_lmb: number;
  stock_mto: number;
  stock_ktm: number;
  stock_onl: number;
  stock_pbc: number;
}

export async function getPaginatedInventory(
    page: number, 
    pageSize: number,
    sortBy: string = 'totalStock', // Par défaut sur le stock
    sortDesc: boolean = true
) {
  try {
    const beautyDomain = [["x_studio_segment", "=", "Beauty"]];

    const allProducts = await odooClient.searchRead("product.product", {
      domain: beautyDomain,
      fields: ["hs_code", "qty_available", "name", "x_studio_many2one_field_21bvh", "x_studio_many2one_field_Arl5D", "x_studio_many2one_field_QyelN"],
    }) as any[];

    const purchaseData = await odooClient.execute("purchase.order.line", "read_group", [
      [
        ["product_id.x_studio_segment", "=", "Beauty"],
        ["state", "in", ["purchase", "done"]],
        ["company_id", "=", 8]
      ],
      ["product_qty", "product_id", "qty_received"], 
      ["product_id"]
    ]) as any[];

    const salesData = await odooClient.execute("pos.order.line", "read_group", [
      [["product_id.x_studio_segment", "=", "Beauty"], ["order_id.state", "in", ["paid", "done"]]],
      ["qty", "product_id"],
      ["product_id"]
    ]) as any[];

    // 2. STOCKS PAR EMPLACEMENT (Source de vérité physique)
    const stockQuants = await odooClient.execute("stock.quant", "read_group", [
      [
        ["product_id.x_studio_segment", "=", "Beauty"],
        ["location_id", "in", [226,232,180,170,293,89]] // Uniquement les stocks internes/boutiques
      ],
      ["quantity", "location_id", "product_id"], 
      ["product_id", "location_id"],
      0, 1000000, "" // On récupère tout pour le calcul global
    ]) as any[];

    // 2. Groupement manuel par HS Code
    const grouped = allProducts.reduce<Record<string, InventoryGroup>>((acc, product) => {
      let code = product.hs_code;
      if (Array.isArray(code)) code = code[1];
      if (!code) code = "Sans Code";

      if (!acc[code]) {
        // Extraction de la marque (Many2one renvoie [id, "nom"] ou false)
        const brandLabel = Array.isArray(product.x_studio_many2one_field_21bvh) 
          ? product.x_studio_many2one_field_21bvh[1] 
          : "Sans Marque";

        acc[code] = { 
            hsCode: code, 
            totalStock: 0, 
            productCount: 0,
            firstName: product.name, // On garde le nom du premier produit
            brand: brandLabel,
            gamme: Array.isArray(product.x_studio_many2one_field_Arl5D) ? product.x_studio_many2one_field_Arl5D[1] : "Sans Gamme",
            totalPurchased: 0,
            totalReceived: 0, totalResidual: 0, totalSold: 0, stock_pbc: 0,
            stock_24: 0, stock_ktm: 0, stock_lmb: 0, stock_mto:0, stock_onl:0
        };
      }
      
      acc[code].totalStock += (product.qty_available || 0);
      acc[code].productCount += 1;

      const productStocks = stockQuants.filter(s => s.product_id[0] === product.id);
      productStocks.forEach(s => {
        const qty = s.quantity || 0;
        const locId = s.location_id[0];

        // Cumul Dispo (Somme de tous les emplacements internes)
        acc[code].totalStock += qty;

        // Stock spécifique P.BC (ID 226)
        if (locId === 226) {
          acc[code].stock_pbc += qty;
        }
        if (locId === 232) {
          acc[code].stock_onl += qty;
        }
        if (locId === 180) {
          acc[code].stock_mto += qty;
        }
        if (locId === 170) {
          acc[code].stock_ktm += qty;
        }
        if (locId === 293) {
          acc[code].stock_lmb += qty;
        }
        if (locId === 89) {
          acc[code].stock_24 += qty;
        }
        
      });

      const pPurchase = purchaseData.find(p => p.product_id[0] === product.id);
      if (pPurchase) {
        acc[code].totalPurchased += pPurchase.product_qty;
        acc[code].totalReceived += pPurchase.qty_received;

        const diff = acc[code].totalPurchased - acc[code].totalReceived;
        acc[code].totalResidual = diff > 0 ? diff : 0;
      }

      const pSales = salesData.find(s => s.product_id[0] === product.id);
      if (pSales) {
        acc[code].totalSold += pSales.qty;
      }

      return acc;
    }, {});

    let allGroups = Object.values(grouped);

    allGroups.sort((a, b) => {
      if (sortBy === 'firstName') return sortDesc ? b.firstName.localeCompare(a.firstName) : a.firstName.localeCompare(b.firstName);
      return sortDesc ? b[sortBy as keyof InventoryGroup] as number - (a[sortBy as keyof InventoryGroup] as number) : (a[sortBy as keyof InventoryGroup] as number) - (b[sortBy as keyof InventoryGroup] as number);
    });
    
    const start = page * pageSize;
    const paginatedData = allGroups.slice(start, start + pageSize);

    return {
      data: paginatedData,
      totalCount: allGroups.length, // Très important pour react-table
    };
  } catch (error) {
    console.error("Erreur fetch inventory:", error);
    return { data: [], totalCount: 0 };
  }
}