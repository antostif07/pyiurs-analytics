export const ODOO_FIELDS = {
    template: {
        name: 'name',
        description: 'description_sale',
        hsCode: 'hs_code',
        brand: 'x_studio_many2one_field_21bvh',
    },
    variant: {
        barcode: 'barcode',
        defaultCode: 'default_code',
        color: 'x_studio_many2one_field_Arl5D',
        size: 'x_studio_many2one_field_QyelN',
        price: 'list_price',
    },
    company: {
        name: 'name',
    },
    warehouse: {
        name: 'name',
        code: 'code',
        companyId: 'company_id',
    },
} as const;

export const ODOO_MODELS = {
    variant: 'product.product',
    template: 'product.template',
    quant: 'stock.quant',
    location: 'stock.location',
    warehouse: 'stock.warehouse',
    company: 'res.company',
} as const;

/** Base URL pour les images produits (ex: cdn.exemple.com/produits). */
export const IMAGES_BASE = process.env.NEXT_PUBLIC_IMAGES_DIR ?? '';