import { odooClient } from "@/lib/odoo/odoo-json2-client"; // ou odoo-json2-client selon ta config

export interface CatalogFilterParams {
  query?: string; posCategoryId?: number; color?: string;
  size?: string; hsCode?: string; barcode?: string; categoryId?: number;
}

export interface InternalCategory {
  id: number;
  name: string;
}

export interface ProductCategory {
  id: number;
  name: string;
}

export async function getFemmeInternalCategories(posCategoryId: number): Promise<InternalCategory[]> {
  const domain: any[] =[
    ['x_studio_segment', 'ilike', 'femme'],['sale_ok', '=', true],
    ['pos_categ_ids', 'in', [posCategoryId]]
  ];

  try {
    const result = await odooClient.readGroup('product.product', {
      domain,
      fields: ['categ_id'],
      groupby: ['categ_id'],
      lazy: false
    });

    return (result as any[])
      .filter(r => r.categ_id) // On ignore les produits sans catégorie
      .map(r => ({
        id: r.categ_id[0],
        name: r.categ_id[1]
      }))
      // Tri alphabétique pour le confort de lecture
      .sort((a, b) => a.name.localeCompare(b.name));

  } catch (error) {
    console.error("[INTERNAL_CATEG_FETCH_ERROR]", error);
    return[];
  }
}

export interface PosCategory {
  id: number;
  name: string;
}

export interface CatalogProduct {
  id: string; // Deviendra hs_code_color
  name: string;
  price: number;
  hsCode: string;
  color: string;
  sizes: string[]; // ✅ NOUVEAU: Liste des tailles dispos pour ce modèle
  category: string;
  stockAvailable: number;
  imageUrl: string;
}

export interface PaginatedCatalog {
  products: CatalogProduct[];
  total: number;
}

export async function getFemmePosCategories(): Promise<PosCategory[]> {
  try {
    // On cherche les catégories POS dont le nom contient "femme"
    const categories = await odooClient.searchRead('pos.category', {
      domain: [['name', 'ilike', 'femme']],
      fields: ['id', 'name'],
      order: 'name asc'
    });
    return categories as PosCategory[];
  } catch (error) {
    console.error("[POS_CATEG_FETCH_ERROR]", error);
    return[]; // Fallback vide
  }
}

export async function getFemmeCatalog(params: CatalogFilterParams): Promise<PaginatedCatalog> {
  const domain: any[] = [['x_studio_segment', 'ilike', 'femme'], ['sale_ok', '=', true]];

  if (params.posCategoryId) {
    domain.push(['pos_categ_ids', 'in', [params.posCategoryId]]);
  }

  if (params.categoryId) domain.push(['categ_id', '=', params.categoryId]);

  if (params.query) domain.push(['name', 'ilike', params.query]);
  if (params.hsCode) domain.push(['hs_code', 'ilike', params.hsCode]);
  if (params.barcode) domain.push(['barcode', '=', params.barcode]);
  if (params.color) domain.push(['x_studio_many2one_field_Arl5D', 'ilike', params.color]);
  if (params.size) domain.push(['x_studio_many2one_field_QyelN', 'ilike', params.size]); 

  try {
    const rawProducts = await odooClient.searchRead('product.product', {
      domain,
      fields:[
        'id', 'name', 'list_price', 'hs_code', 'qty_available', 'pos_categ_ids',
        'categ_id', 'x_studio_many2one_field_Arl5D', 'x_studio_many2one_field_QyelN'
      ],
      order: 'name asc'
    }) as any[];

    // 2. Groupement par hs_code + Couleur
    const groupMap = new Map<string, CatalogProduct>();

    for (const p of rawProducts) {
      const hsCode = p.hs_code || `NO_HS_${p.id}`;
      const color = p.x_studio_many2one_field_Arl5D ? p.x_studio_many2one_field_Arl5D[1] : 'Standard';
      const category = p.categ_id ? p.categ_id[1] : 'Non classé';
      const sizeRaw = p.x_studio_many2one_field_QyelN;
      const size = sizeRaw ? (Array.isArray(sizeRaw) ? sizeRaw[1] : sizeRaw) : 'Unique';
      
      const qty = p.qty_available || 0;
      const price = (p.list_price * 1.25) || 0; // Calcul de marge à la volée
      
      const groupKey = `${hsCode}_${color}`;

      if (groupMap.has(groupKey)) {
        const existing = groupMap.get(groupKey)!;
        existing.stockAvailable += qty; // On additionne les stocks des différentes tailles
        // On ajoute la taille si elle n'y est pas encore
        if (!existing.sizes.includes(size)) {
          existing.sizes.push(size);
        }
      } else {
        // ✅ NOUVEAU: Formatage sécurisé pour l'URL de l'image FTP
        // Remplace les espaces par des tirets pour éviter les %20 dans les URLs
        const safeHsCode = hsCode.replace(/\s+/g, '_');
        const safeColor = color.replace(/\s+/g, '_');

        groupMap.set(groupKey, {
          id: groupKey,
          name: p.name.split('[')[0].trim().split(" - ")[1] +" - "+ hsCode, // Retire le [REF] du nom
          price,
          hsCode,
          color,
          category: "Catégorie POS",
          sizes: [size],
          stockAvailable: qty,
          // ✅ NOUVEAU: Appel direct au serveur statique FTP
          imageUrl: `http://images.bybkm.fr/${safeHsCode}_${safeColor}.jpg`
        });
      }
    }

    // 3. Transformation en tableau et Pagination JavaScript
    let groupedProducts = Array.from(groupMap.values());
    groupedProducts.sort((a, b) => b.stockAvailable - a.stockAvailable);

    return {
      products: groupedProducts,
      total: groupedProducts.length,
    };

  } catch (error) {
    console.error("[CATALOG_FETCH_ERROR]", error);
    throw new Error("Impossible de charger le catalogue.");
  }
}