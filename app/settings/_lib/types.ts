// app/settings/_lib/types.ts

export interface Shop {
    id: string;
    name: string;
    odoo_company_id: number | null;
    odoo_pos_ids: number[] | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface ShopLocation {
    id: string;
    shop_id: string;
    odoo_location_id: number;
    odoo_location_name: string;
    odoo_location_complete_name: string | null;
    odoo_usage: string | null;
    odoo_company_id: number | null;
    label: string | null;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    created_by: string | null;
    updated_at: string;
}

export interface OdooLocation {
    id: number;
    name: string;
    complete_name: string | null;
    usage: string;
    company_id: [number, string] | false;
}

export interface ShopWithStats extends Shop {
    locations_count: number;
    active_locations_count: number;
}