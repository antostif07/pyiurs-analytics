export interface WarehouseItem {
    id: number;
    name: string;
    code?: string;
}

export interface CategoryItem {
    id: number | string;
    name: string;
}

export interface InventoryItem {
    warehouses: WarehouseItem[];
    categories: CategoryItem[];
}