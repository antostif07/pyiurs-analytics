export interface Variant {
    id: string;
    size: string;
    color: string;
    colorHex: string;
    barcode: string;
    quantity: number;
    price?: number;
}

export interface Store {
    id: string;
    name: string;
    /** Optionnels : à brancher quand tu auras les champs côté res.company */
    address?: string;
    city?: string;
    managerName?: string;
    managerPhone?: string;
    variants: Variant[];
}

export interface Product {
    id: string;
    name: string;
    brand: string;
    description: string;
    barcode: string;
    hsCode?: string;
    image: string;
    stores: Store[];
}