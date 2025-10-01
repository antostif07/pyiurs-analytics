export interface OdooPartner {
    id: number;
    name: string;
    phone: string;
    email: string;
}

export type CustomerCategory = "GOLD" | "SILVER" | "PYIURS" | "NORMAL";

export interface Customer {
    id: number;
    name: string
    category: CustomerCategory;
    phone: string;
}