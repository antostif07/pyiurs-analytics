import { OdooPurchaseOrderOption } from "../_components/purchase-order-selector";
import { OdooOption } from "../import-actions";

export interface ProductLine {
    id: string;
    nom: string;
    code_hs: string;
    quantity: number;
    pu: number;
    caa: number;
    prix: number;
    marque: string;
    categorie: string;
    famille: string;
    couleur: string;
    taille: string;
    categorie_article: string;
    categorie_pdv: string;
    description: string;
    code_remise: string;
    code_fournisseur: string;
    hs_plus: string;
    date_expiration: string;
}

export interface ProductFormState {
    nom: string;
    codeHs: string;
    quantity: number;
    pu: number;
    caa: number;
    prix: number;
    marque: string;
    categorie: string;
    famille: string;
    couleur: string;
    taille: string;
    categorieArticle: string;
    categoriePdv: string;
    description: string;
    codeRemise: string;
    codeFournisseur: string;
    hsPlus: string;
    dateExpiration: string;
}

export interface GlobalConfigProps {
    polog: string;
    setPolog: (val: string) => void;
    dateChargement: string;
    setDateChargement: (val: string) => void;
    departement: string;
    setDepartement: (val: string) => void;
    logPurchaseOrders: OdooOption[];
}

export interface ProductFormProps {
    form: ProductFormState;
    dispatch: React.Dispatch<ProductFormAction>;
    autoFilling: boolean;
    autoFillSuccess: boolean | null;
    odooProductCategories: OdooOption[];
    odooPosCategories: OdooOption[];
    onSubmit: (e: React.FormEvent) => void;
    onHsCodeBlur: () => void;
}

export type ProductFormAction =
    | { type: "UPDATE_FIELD"; field: keyof ProductFormState; value: any }
    | { type: "SET_FIELDS"; fields: Partial<ProductFormState> }
    | { type: "RESET_FORM" };

export interface ProductTableProps {
    products: ProductLine[];
    onRemove: (id: string) => void;
    onExport: () => void;
    polog: string;
    dateChargement: string;
}

export interface OdooMetaPanelProps {
    selectedPo: OdooPurchaseOrderOption | null;
}