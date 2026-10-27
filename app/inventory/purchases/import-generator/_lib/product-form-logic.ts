// app/inventory/purchases/import-generator/_lib/product-form-logic.ts

import type { ProductFormState } from "../import-types";
import type { Departement } from "../_components/global-params-section";

// ─── Type du produit retourné par getLastProductByHsCode ────

export interface MatchedHsCodeProduct {
    nom?: string | null;
    description?: string | null;
    categorie?: string | null;
    prix?: number | null;
    pu?: number | null;
    marque?: string | null;
    famille?: string | null;
    couleur?: string | null;
    taille?: string | null;
    categorie_article?: string | null;
    categorie_pdv?: string | null;
    caa?: number | null;
}

// ─── Pur · computeDescriptionAndName ────────────────────────

export function computeDescriptionAndName(
    departement: Departement,
    codeHs: string,
    codeRemise: string,
    marque: string,
    famille: string,
    couleur: string,
    taille: string,
): { description: string; nom: string } {
    const cleanHs = codeHs.trim();
    const cleanMarque = marque.trim() ? marque.trim() : "";

    if (departement === "Beauty") {
        const desc = `${cleanMarque} [${cleanHs}]`;
        return { description: desc, nom: desc };
    }

    const desc = `${codeRemise} - ${famille.trim()} ${couleur.trim()} - ${cleanHs}`
        .replace(/\s+/g, " ")
        .trim();
    const nom = `${desc} - ${taille.trim()}`.replace(/\s+/g, " ").trim();
    return { description: desc, nom };
}

export function applyHsCodeMatch(
    currentForm: ProductFormState,
    matched: MatchedHsCodeProduct,
    departement: Departement,
    currentCodeRemise: string,
    cleanHs: string,
): Partial<ProductFormState> {
    const marqueVal = matched.marque ?? currentForm.marque ?? "";
    const familleVal = matched.famille ?? currentForm.famille ?? "";
    const couleurVal = matched.couleur ?? currentForm.couleur ?? "";
    const tailleVal = matched.taille ?? currentForm.taille ?? "";

    let description: string;
    let nom: string;

    if (departement === "Beauty") {
        // ✅ Beauty : description = nom Odoo sans la partie [codeHS]
        // (peut être vide). Nom = description + [codeHS] (ou juste [codeHS]).
        description = matched.nom ? matched.nom.split("[")[0].trim() : "";
        nom = description ? `${description} [${cleanHs}]` : `[${cleanHs}]`;
    } else {
        // Femme / Enfant : inchangé
        description =
            matched.description ??
            `${currentCodeRemise} - ${familleVal} ${couleurVal} - ${cleanHs}`
                .replace(/\s+/g, " ")
                .trim();
        nom = `${description} - ${tailleVal}`.trim();
    }

    return {
        codeHs: cleanHs,
        nom,
        description,
        categorie: matched.categorie ?? "",
        prix: matched.prix ?? currentForm.prix,
        pu: matched.pu ?? currentForm.pu,
        marque: marqueVal,
        famille: familleVal,
        couleur: couleurVal,
        taille: tailleVal,
        categorieArticle: matched.categorie_article ?? "",
        categoriePdv: matched.categorie_pdv ?? "",
        caa: matched.caa ?? currentForm.caa ?? 1.0,
        codeFournisseur: departement === "Femme" ? marqueVal : "",
    };
}

// ─── Pur · Pas de match → patch 4 champs ────────────────────

export function applyHsCodeNoMatch(
    currentForm: ProductFormState,
    cleanHs: string,
    departement: Departement,
    currentCodeRemise: string,
): Partial<ProductFormState> {
    const { description, nom } = computeDescriptionAndName(
        departement,
        cleanHs,
        currentCodeRemise,
        currentForm.marque,
        currentForm.famille,
        currentForm.couleur,
        currentForm.taille,
    );

    return {
        codeHs: cleanHs,
        description,
        nom,
        codeFournisseur: departement === "Femme" ? currentForm.marque : "",
    };
}