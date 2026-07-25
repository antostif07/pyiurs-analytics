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

export const INITIAL_PRODUCT_FORM: ProductFormState = {
    nom: "",
    codeHs: "",
    quantity: 1,
    pu: 0,
    caa: 1.0,
    prix: 0,
    marque: "",
    categorie: "",
    famille: "",
    couleur: "",
    taille: "",
    categorieArticle: "",
    categoriePdv: "",
    description: "",
    codeRemise: "",
    codeFournisseur: "",
    hsPlus: "",
    dateExpiration: "",
};

export type ProductFormAction =
    | { type: "UPDATE_FIELD"; field: keyof ProductFormState; value: any }
    | { type: "SET_FIELDS"; fields: Partial<ProductFormState> }
    | { type: "RESET_FORM" };

export function productFormReducer(
    state: ProductFormState,
    action: ProductFormAction
): ProductFormState {
    switch (action.type) {
        case "UPDATE_FIELD":
            return {
                ...state,
                [action.field]: action.value,
            };
        case "SET_FIELDS":
            return {
                ...state,
                ...action.fields,
            };
        case "RESET_FORM":
            return INITIAL_PRODUCT_FORM;
        default:
            return state;
    }
}

/**
 * Calcule le numéro de semaine ISO
 */
export function getWeekNumber(dateStr: string): string {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return String(weekNo).padStart(2, "0");
}