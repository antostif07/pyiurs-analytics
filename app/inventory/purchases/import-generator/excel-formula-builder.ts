import { ProductLine, getWeekNumber } from "./import-types";
import { OdooPurchaseOrderOption } from "../_components/purchase-order-selector";

export interface ExcelCell {
    v: string | number;
    f?: string;
    t: "s" | "n";
}

export interface CalculatedRowData {
    puCell: ExcelCell;
    pDollarCell: ExcelCell;
    caaCell: ExcelCell;
    coutCell: ExcelCell;
    prixPublicCell: ExcelCell;
    prixOdooCell: ExcelCell;
    margeCell: ExcelCell;
    descriptionCell: ExcelCell;
    nomCell: ExcelCell;

    preview: {
        barcode: string;
        pDollar: number;
        cout: number;
        calculatedPublicPrice: number;
        prixOdoo: number;
        marge: number;
        description: string;
        formattedProductName: string;
        remiseValue: string;
    };
}

export function buildCalculatedRow(
    product: ProductLine,
    selectedPo: OdooPurchaseOrderOption,
    dateChargement: string,
    departement: string,
    rowIndex: number,      // Numéro de ligne Excel (ex: 2)
    globalCounter: number  // Numéro séquentiel
): CalculatedRowData {
    const formattedDate = dateChargement.replace(/-/g, "");

    // 1. Calculs financiers
    const calculatedPublicPrice = departement === "Beauty"
        ? product.prix
        : Number((product.prix * 1.25).toFixed(2));

    const pDollar = Number((product.pu * 1.2).toFixed(2));
    const cout = Number((product.pu * product.caa).toFixed(2));
    const prixOdoo = Number(((calculatedPublicPrice + 10) / 1.25).toFixed(2));
    const marge = Number((prixOdoo - cout).toFixed(2));

    let barcode = `${selectedPo.name}${formattedDate}${globalCounter}`;
    let descValue = product.description;
    let remiseValue = product.code_remise;

    let nomFormula: string;
    let formattedProductName: string;

    // ✅ RÈGLE SPÉCIFIQUE FEMME / ENFANT
    if (departement === "Femme" || departement === "Enfant") {
        const supplierCode = selectedPo.supplierName.includes("-")
            ? selectedPo.supplierName.split("-")[1].trim()
            : selectedPo.supplierName.trim();

        const poClean = selectedPo.name.replace(/^P/, "");
        const yearLastTwo = dateChargement.split("-")[0]?.slice(-2) || "";
        const weekStr = dateChargement ? getWeekNumber(dateChargement) : "";

        const baseCode = `${supplierCode}${poClean}${yearLastTwo}${weekStr}`;
        remiseValue = baseCode;

        barcode = `${selectedPo.name}${formattedDate.substring(1)}${globalCounter}`;

        // Description = coderemise - famille couleur - hscode
        const familleVal = product.famille || "";
        const couleurVal = product.couleur || "";
        descValue = `${baseCode} - ${familleVal} ${couleurVal} - ${product.code_hs}`.replace(/\s+/g, " ").trim();

        // ✅ FORMULE EXCEL DU NOM : Description (Z) - Taille (L) - [Codebarre (D)]
        nomFormula = `Z${rowIndex}&" - "&L${rowIndex}&" ["&D${rowIndex}&"]"`;
        formattedProductName = `${descValue} - ${product.taille || ""} [${barcode}]`;
    } else {
        // Mode Beauty
        const marqueTxt = product.marque && product.marque.trim() ? product.marque.trim() : "A remplacer";
        descValue = `marque : ${marqueTxt} [${product.code_hs}]`;

        // Formule Excel du Nom Beauty = Description (Z) & " [" & Codebarre (D) & "]"
        nomFormula = `Z${rowIndex}&" ["&D${rowIndex}&"]"`;
        formattedProductName = `${descValue} [${barcode}]`;
    }

    return {
        puCell: { v: product.pu, t: "n" },
        pDollarCell: { f: `N${rowIndex}*1.2`, v: pDollar, t: "n" },
        caaCell: { v: product.caa, t: "n" },
        coutCell: { f: `N${rowIndex}*P${rowIndex}`, v: cout, t: "n" },
        prixPublicCell: { v: calculatedPublicPrice, t: "n" },
        prixOdooCell: { f: `(R${rowIndex}+10)/1.25`, v: prixOdoo, t: "n" },
        margeCell: { f: `S${rowIndex}-Q${rowIndex}`, v: marge, t: "n" },
        descriptionCell: { v: descValue, t: "s" }, // Restera tel quel dans la colonne Z
        nomCell: {
            f: nomFormula, // ✅ Formule Excel demandée =Z2&" - "&L2&" ["&D2&"]"
            v: formattedProductName,
            t: "s"
        },
        preview: {
            barcode,
            pDollar,
            cout,
            calculatedPublicPrice,
            prixOdoo,
            marge,
            description: descValue,
            formattedProductName,
            remiseValue,
        },
    };
}