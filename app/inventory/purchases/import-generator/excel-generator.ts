import * as XLSX from "xlsx";
import { ProductLine } from "./import-types";
import { buildCalculatedRow } from "./excel-formula-builder";
import { OdooPurchaseOrderOption } from "../_components/purchase-order-selector";

interface ExportExcelParams {
    selectedPo: OdooPurchaseOrderOption;
    polog: string;
    dateChargement: string;
    departement: string;
    products: ProductLine[];
}

export function generateImportExcel({
    selectedPo,
    polog,
    dateChargement,
    departement,
    products,
}: ExportExcelParams) {
    if (!selectedPo || !polog.trim() || !dateChargement) return;

    const formattedDate = dateChargement.replace(/-/g, "");
    const descriptionLivraison = `${polog.trim()}_${selectedPo.name}_${selectedPo.supplierRef || ""}`;

    const productsSheetData: any[] = [];
    const ordersSheetData: any[] = [];

    let globalCounter = 1;
    let rowIndex = 2; // La ligne 1 est réservée aux en-têtes Excel

    products.forEach((product) => {
        for (let i = 0; i < product.quantity; i++) {

            const calculated = buildCalculatedRow(
                product,
                selectedPo,
                dateChargement,
                departement,
                rowIndex,
                globalCounter
            );

            // ✅ MAPPING EXACT DES COLONNES EXCEL (A à Z)
            productsSheetData.push({
                "Comptage": globalCounter,                 // Col A
                "Date de chargement": formattedDate,       // Col B
                "Description Livraison": descriptionLivraison, // Col C
                "Codebarre": calculated.preview.barcode,   // Col D (Utilisé dans la formule =Z2&"["&D2&"]")
                "Departement": departement,                // Col E
                "Segment": departement,                    // Col F
                "Marque": product.marque,                  // Col G
                "Categorie": product.categorie,            // Col H
                "Famille": product.famille,                // Col I
                "Couleur": product.couleur,                // Col J
                "Code HS": product.code_hs,                // Col K
                "Taille": product.taille,                  // Col L
                "Qte": product.quantity,                   // Col M
                "PU": calculated.puCell,                   // Col N
                "P$": calculated.pDollarCell,              // Col O (=N2*1.2)
                "CAA": calculated.caaCell,                 // Col P
                "Cout": calculated.coutCell,               // Col Q (=N2*P2)
                "Prix Vente Public": calculated.prixPublicCell, // Col R (Achat * 1.25 si Femme/Enfant)
                "Prix Odoo": calculated.prixOdooCell,      // Col S (=(R2+10)/1.25)
                "Marge": calculated.margeCell,             // Col T (=S2-Q2)
                "ID Externe": calculated.preview.barcode,  // Col U
                "Nom": calculated.nomCell,                 // Col V (Formule =Z2&"["&D2&"]")
                "Catégorie d'article": product.categorie_article, // Col W
                "Catégorie PdV": product.categorie_pdv,    // Col X
                "Politique de contrôle": "On ordered quantities", // Col Y
                "Description": calculated.descriptionCell, // Col Z (Utilisé dans la formule =Z2&"["&D2&"]")
                "Type d'article": "Goods",                 // Col AA
                "Disponible dans le Pdv": 1,
                "Peut être vendu": 1,
                "Description achat": selectedPo.name,
                "Description pour les réceptions": polog,
                "Code remise": calculated.preview.remiseValue,
                "Code Fournisseur": product.code_fournisseur,
                "Description du prélèvement": selectedPo.supplierRef || "",
                "Hs+": product.hs_plus,
                "Suivi": 1,
                "Date d'expiration": product.date_expiration,
            });

            // 2. FEUILLE : COMMANDES (Importation Odoo purchase.order.line)
            ordersSheetData.push({
                "id": selectedPo.externalId,
                "partner_id": selectedPo.supplierName,
                "order_line/product_id": calculated.preview.formattedProductName,
                "order_line/product_qty": 1,
                "order_line/price_unit": product.pu,
            });

            globalCounter++;
            rowIndex++;
        }
    });

    const wb = XLSX.utils.book_new();

    const wsProducts = XLSX.utils.json_to_sheet(productsSheetData);
    XLSX.utils.book_append_sheet(wb, wsProducts, "Produits");

    const wsOrders = XLSX.utils.json_to_sheet(ordersSheetData);
    XLSX.utils.book_append_sheet(wb, wsOrders, "Commandes");

    const supplierPart = selectedPo.supplierName.split(' - ')[1] || selectedPo.supplierName;
    const fileName = `${formattedDate} - ${polog} - ${selectedPo.name} - ${supplierPart}${selectedPo.supplierRef || ""}.xlsx`;

    XLSX.writeFile(wb, fileName);
}