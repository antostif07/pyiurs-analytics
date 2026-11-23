import type { ProductFormState } from "../import-types";
import type { Departement } from "../_components/global-params-section";

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

export function computeDescriptionAndName(
    departement: Departement,
    codeHs: string,
    codeRemise: string,
    marque: string,
    famille: string,
    couleur: string,
    taille: string,
    beautyDescription = "",
): { description: string; nom: string } {
    const cleanHs = codeHs.trim();

    if (departement === "Beauty") {
        const cleanMarque = marque.trim() || "A remplacer";
        const cleanDesc = beautyDescription.trim();
        const nom = cleanDesc
            ? `${cleanMarque} : ${cleanDesc} [${cleanHs}]`
            : `${cleanMarque} [${cleanHs}]`;
        return { description: cleanDesc, nom };
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
        const baseBeforeBrackets = matched.nom
            ? matched.nom.split("[")[0].trim()
            : "";

        // Formule actuelle conservée pour le nom
        nom = baseBeforeBrackets
            ? `${baseBeforeBrackets} [${cleanHs}]`
            : `[${cleanHs}]`;

        // Description = split sur ':' et prise de la 2e partie
        const colonIdx = baseBeforeBrackets.indexOf(":");
        description =
            colonIdx !== -1
                ? baseBeforeBrackets.slice(colonIdx + 1).trim()
                : (matched.description ?? baseBeforeBrackets);
    } else {
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
        currentForm.description,
    );

    return {
        codeHs: cleanHs,
        description,
        nom,
        codeFournisseur: departement === "Femme" ? currentForm.marque : "",
    };
}