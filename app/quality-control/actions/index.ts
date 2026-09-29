'use server';

import { odooClient, OdooDomainCondition } from '@/lib/odoo/xmlrpc';

const SEGMENT_FIELD = 'x_studio_segment';       // Champ sur le template
const SUPPLIER_FIELD = 'x_studio_many2one_field_21bvh';
const COLOR_FIELD = 'x_studio_many2one_field_Arl5D';

/** Sentinelle partagée URL ↔ domaine pour "pas de fournisseur". */
const UNDEFINED_SUPPLIER_ID = -1;
const UNDEFINED_LABEL = 'Indéfini';

export type ProductQC = {
  db_id: number;
  xml_id: string;
  name: string;
  default_code: string;
  hs_code: string;
  segment: string;
  create_date: string;
  color: string | null;
  supplier: string | null;         // NEW : nom du fournisseur (display_name)
};

export type FilterOption = { value: string; label: string; count: number };

export type AvailableFilters = {
  hsCodes: FilterOption[];         // value = code HS (ou "Indéfini")
  suppliers: FilterOption[];       // value = id (string), "Indéfini" => "-1"
};

// ─────────────────────────────────────────────────────────────
// 1) FETCH PRODUITS FILTRÉS (utilisé par QCTable)
// ─────────────────────────────────────────────────────────────

export async function getProductQualityData(
  from: string,
  to: string,
  segment: string = 'femme',
  hsCodes: string[] = [],
  supplierIds: string[] = []
): Promise<ProductQC[]> {
  try {
    const domain: any[] = [
      [SEGMENT_FIELD, 'ilike', segment],
      ['create_date', '>=', from],
      ['create_date', '<=', `${to} 23:59:59`],
      ['image_1920', '=', false],
    ];

    // ── Filtre HS codes (inchangé) ──────────────────────────
    if (hsCodes.length > 0) {
      const hasUndefined = hsCodes.includes(UNDEFINED_LABEL);
      const cleanCodes = hsCodes.filter(c => c !== UNDEFINED_LABEL);

      if (hasUndefined && cleanCodes.length > 0) {
        domain.push('|',
          ['hs_code', 'in', cleanCodes as any],
          ['hs_code', '=', false]
        );
      } else if (hasUndefined) {
        domain.push(['hs_code', '=', false]);
      } else {
        domain.push(['hs_code', 'in', cleanCodes as any]);
      }
    }

    // ── Filtre Fournisseurs (nouveau) ───────────────────────
    if (supplierIds.length > 0) {
      const hasUndefined = supplierIds.includes(String(UNDEFINED_SUPPLIER_ID));
      const cleanIds = supplierIds
        .filter(id => id !== String(UNDEFINED_SUPPLIER_ID))
        .map(Number)
        .filter(n => Number.isFinite(n));

      if (hasUndefined && cleanIds.length > 0) {
        domain.push('|',
          [SUPPLIER_FIELD, 'in', cleanIds],
          [SUPPLIER_FIELD, '=', false]
        );
      } else if (hasUndefined) {
        domain.push([SUPPLIER_FIELD, '=', false]);
      } else {
        domain.push([SUPPLIER_FIELD, 'in', cleanIds]);
      }
    }

    const templates = await odooClient.searchRead('product.template', {
      domain,
      fields: ['name', 'default_code', 'hs_code', 'create_date', COLOR_FIELD, SUPPLIER_FIELD],
      limit: 2000,
      order: 'create_date desc',
    }) as any[];

    if (templates.length === 0) return [];

    const templateIds = templates.map(t => t.id);

    const irModelData = await odooClient.searchRead('ir.model.data', {
      domain: [
        ['model', '=', 'product.template'],
        ['res_id', 'in', templateIds],
      ],
      fields: ['name', 'module', 'res_id'],
    }) as any[];

    const xmlIdMap = new Map<number, string>();
    irModelData.forEach((d: any) => {
      xmlIdMap.set(d.res_id, `${d.module}.${d.name}`);
    });

    return templates.map(t => {
      const supplier = t[SUPPLIER_FIELD] as [number, string] | false | null;
      const color = t[COLOR_FIELD] as [number, string] | false | null;

      return {
        db_id: t.id,
        xml_id: xmlIdMap.get(t.id) || '',
        name: t.name,
        default_code: t.default_code || '',
        hs_code: t.hs_code || '',
        segment,
        create_date: t.create_date,
        color: color ? color[1] : null,
        supplier: supplier ? supplier[1] : null,
      };
    });
  } catch (error) {
    console.error('QC Error:', error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// 2) FILTRES DISPONIBLES (HS + Fournisseurs en un seul appel)
// ─────────────────────────────────────────────────────────────
// Cross-filtering : si un filtre est actif, on n'expose que les
// options qui produiraient au moins un résultat avec ce filtre.

export async function getAvailableFilters(
  from: string,
  to: string,
  segment: string,
  activeHsCodes: string[] = [],
  activeSupplierIds: string[] = []
): Promise<AvailableFilters> {
  try {
    const domain: OdooDomainCondition[] = [
      [SEGMENT_FIELD, 'ilike', segment],
      ['create_date', '>=', from],
      ['create_date', '<=', `${to} 23:59:59`],
      ['image_1920', '=', false],
    ];

    const results = await odooClient.searchRead('product.template', {
      domain,
      fields: ['hs_code', SUPPLIER_FIELD],
      limit: 5000,
    }) as any[];

    // Prépare les prédicats de "matche" pour le cross-filtering
    const hsSet = new Set(activeHsCodes);
    const supplierSet = new Set(activeSupplierIds);

    const matchesSupplierFilter = (supplierId: number | null) => {
      if (activeSupplierIds.length === 0) return true;
      if (supplierId === null) return supplierSet.has(String(UNDEFINED_SUPPLIER_ID));
      return supplierSet.has(String(supplierId));
    };

    const matchesHsFilter = (hsCode: string | false) => {
      if (activeHsCodes.length === 0) return true;
      if (!hsCode) return hsSet.has(UNDEFINED_LABEL);
      return hsSet.has(hsCode);
    };

    const hsCounts = new Map<string, number>();
    const supplierCounts = new Map<string, { label: string; count: number }>();

    for (const p of results) {
      const hsCode: string = p.hs_code || UNDEFINED_LABEL;
      const rawSupplier = p[SUPPLIER_FIELD] as [number, string] | false;
      const supplierId = rawSupplier ? rawSupplier[0] : null;
      const supplierLabel = rawSupplier ? rawSupplier[1] : UNDEFINED_LABEL;

      // Compte le HS seulement s'il respecte le filtre fournisseur actif
      if (matchesSupplierFilter(supplierId)) {
        hsCounts.set(hsCode, (hsCounts.get(hsCode) || 0) + 1);
      }

      // Compte le fournisseur seulement s'il respecte le filtre HS actif
      if (matchesHsFilter(p.hs_code)) {
        const key = String(supplierId ?? UNDEFINED_SUPPLIER_ID);
        const existing = supplierCounts.get(key);
        if (existing) existing.count += 1;
        else supplierCounts.set(key, { label: supplierLabel, count: 1 });
      }
    }

    const hsCodes: FilterOption[] = Array.from(hsCounts.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count);

    const suppliers: FilterOption[] = Array.from(supplierCounts.entries())
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => b.count - a.count);

    return { hsCodes, suppliers };
  } catch (error) {
    console.error('getAvailableFilters Error:', error);
    return { hsCodes: [], suppliers: [] };
  }
}