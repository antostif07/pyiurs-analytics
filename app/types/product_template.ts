export interface OdooProductTemplate {
    id: number;
    name: string;
    list_price: number;
    categ_id: [number, string];
    hs_code?: string;
    product_variant_id?: [number, string];
    x_studio_many2one_field_21bvh?: [number, string];
    x_studio_many2one_field_QyelN?: [number, string];
    x_studio_many2one_field_Arl5D?: [number, string];
    description_pickingin?: string;
}

export interface Product {
    id: number;
    name: string;
    listPrice: number;
    categoryId: number;
    categoryName: string;
    hs_code: string;
    productVariantId?: number;
    taille?: string;
    couleur?: string;
    marque?: string;
}

export function mapOdooProduct(product: OdooProductTemplate): Product {
  return {
    id: product.id,
    name: product.name,
    listPrice: product.list_price,
    categoryId: product.categ_id?.[0] ?? 0,
    categoryName: product.categ_id?.[1] ?? "",
    hs_code: product.hs_code ?? "",
    productVariantId: product.product_variant_id ? product.product_variant_id[0] : undefined,
    taille: product.x_studio_many2one_field_QyelN ? product.x_studio_many2one_field_QyelN[1] : undefined,
    couleur: product.x_studio_many2one_field_Arl5D ? product.x_studio_many2one_field_Arl5D[1] : undefined,
  };
}