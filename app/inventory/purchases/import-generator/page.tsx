// app/inventory/purchases/import-generator/page.tsx

'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    FileSpreadsheet,
    Sparkles,
    Clock,
    User,
    Hash,
    AlertCircle,
    Plus,
    Trash2,
    DownloadCloud,
    CalendarDays,
    Tag,
} from "lucide-react";
import * as XLSX from "xlsx";
import PurchaseOrderSelector, { OdooPurchaseOrderOption } from "../_components/purchase-order-selector";
import {
    getLastProductByHsCode,
    getOdooPurchaseOrdersForImport,
    getOdooLogPurchaseOrders,
    getOdooProductCategories,
    getOdooPosCategories,
    OdooOption
} from "../import-actions";
import NormalSelector from "../_components/normal-selector";
import { format } from "date-fns";

interface ProductLine {
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

// Fonction utilitaire pour calculer le numéro de semaine ISO
function getWeekNumber(dateStr: string): string {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return String(weekNo).padStart(2, "0");
}

export default function PurchaseImportGeneratorPage() {
    const [purchaseOrders, setPurchaseOrders] = useState<OdooPurchaseOrderOption[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Listes d'options dynamiques Odoo
    const [logPurchaseOrders, setLogPurchaseOrders] = useState<OdooOption[]>([]);
    const [odooProductCategories, setOdooProductCategories] = useState<OdooOption[]>([]);
    const [odooPosCategories, setOdooPosCategories] = useState<OdooOption[]>([]);

    const [selectedPoId, setSelectedPoId] = useState<number | null>(null);
    const [selectedPo, setSelectedPo] = useState<OdooPurchaseOrderOption | null>(null);

    // Champs Globaux
    const [polog, setPolog] = useState<string>("");
    const [dateChargement, setDateChargement] = useState<string>("");
    const [departement, setDepartement] = useState<string>("Beauty");

    // Liste des produits
    const [products, setProducts] = useState<ProductLine[]>([]);

    // États de saisie individuels du produit
    const [nom, setNom] = useState("");
    const [codeHs, setCodeHs] = useState("");
    const [quantity, setQuantity] = useState<number>(1);
    const [pu, setPu] = useState<number>(0);
    const [caa, setCaa] = useState<number>(1.0);
    const [prix, setPrix] = useState<number>(0);
    const [marque, setMarque] = useState("");
    const [categorie, setCategorie] = useState("");
    const [famille, setFamille] = useState("");
    const [couleur, setCouleur] = useState("");
    const [taille, setTaille] = useState("");
    const [categorieArticle, setCategorieArticle] = useState("");
    const [categoriePdv, setCategoriePdv] = useState("");
    const [description, setDescription] = useState("");
    const [codeRemise, setCodeRemise] = useState("");
    const [codeFournisseur, setCodeFournisseur] = useState("");
    const [hsPlus, setHsPlus] = useState("");
    const [dateExpiration, setDateExpiration] = useState("");

    // États d'autocomplétion
    const [autoFilling, setAutoFilling] = useState<boolean>(false);
    const [autoFillSuccess, setAutoFillSuccess] = useState<boolean | null>(null);

    // Chargement parallèle des options Odoo au montage
    useEffect(() => {
        async function loadOdooOrders() {
            try {
                setLoading(true);
                const [poData, logPoData, prodCatData, posCatData] = await Promise.all([
                    getOdooPurchaseOrdersForImport(),
                    getOdooLogPurchaseOrders(),
                    getOdooProductCategories(),
                    getOdooPosCategories()
                ])

                const reallyProdCatData = prodCatData.filter((cat) => cat.name.split("/").length < 4)
                setPurchaseOrders(poData);
                setLogPurchaseOrders(logPoData);
                setOdooProductCategories(reallyProdCatData);
                setOdooPosCategories(posCatData);
            } catch (err) {
                console.error("Erreur :", err);
                setError("Impossible de récupérer les structures de données Odoo.");
            } finally {
                setLoading(false);
            }
        }
        loadOdooOrders();
    }, []);

    // Fonction déclenchée lors de la perte de focus du Code HS
    const handleHsCodeBlur = async () => {
        if (!codeHs.trim()) return;

        try {
            setAutoFilling(true);
            setAutoFillSuccess(null);

            // Appel de l'action serveur d'Odoo
            const matchedProduct = await getLastProductByHsCode(codeHs.trim());
            const poClean = selectedPo?.name.replace(/^P/, "")
            const yearLastTwo = dateChargement.split("-")[0].slice(-2);
            const weekStr = getWeekNumber(dateChargement);

            const codeRemise = `${selectedPo?.supplierName.split("-")[1].trim()}${poClean}${yearLastTwo}${weekStr}`

            if (matchedProduct) {
                const desc = departement === "Beauty" ? matchedProduct.description : `${codeRemise} - ${matchedProduct.famille} ${matchedProduct.couleur} - ${codeHs}`
                const productName = departement === "Beauty" ? matchedProduct.nom : `${desc} ${matchedProduct.taille}`
                setNom(productName);
                setCategorie(matchedProduct.categorie);
                setPrix(matchedProduct.prix * 1.25 - 10);
                setPu(matchedProduct.pu);
                setDescription(desc);
                setMarque(matchedProduct.marque);
                setFamille(matchedProduct.famille);
                setCouleur(matchedProduct.couleur);
                setTaille(matchedProduct.taille);

                // Préremplissage avec fallbacks propres
                setCategorieArticle(matchedProduct.categorie_article || "");
                setCategoriePdv(matchedProduct.categorie_pdv || "");
                setCaa(matchedProduct.caa);
                setCodeFournisseur(matchedProduct.code_fournisseur);

                setAutoFillSuccess(true);
            } else {
                setAutoFillSuccess(false);
            }
        } catch (err) {
            console.error("Erreur de préremplissage :", err);
            setAutoFillSuccess(false);
        } finally {
            setAutoFilling(false);
            setTimeout(() => setAutoFillSuccess(null), 3000);
        }
    };

    const handleSelectPo = (po: OdooPurchaseOrderOption | null) => {
        if (po) {
            setSelectedPoId(po.id);
            setSelectedPo(po);
        } else {
            setSelectedPoId(null);
            setSelectedPo(null);
            setProducts([]);
        }
    };

    const handleAddProduct = (e: React.FormEvent) => {
        e.preventDefault();
        if (!codeHs.trim() || quantity <= 0) return;

        const newLine: ProductLine = {
            id: Math.random().toString(36).substr(2, 9),
            nom,
            code_hs: codeHs.trim(),
            quantity,
            pu,
            caa,
            prix,
            marque,
            categorie,
            famille,
            couleur,
            taille,
            categorie_article: categorieArticle,
            categorie_pdv: categoriePdv,
            description,
            code_remise: codeRemise,
            code_fournisseur: codeFournisseur,
            hs_plus: hsPlus,
            date_expiration: dateExpiration
        };

        setProducts([...products, newLine]);

        // Réinitialisation des états
        setNom("");
        setCodeHs("");
        setQuantity(1);
        setPu(0);
        setCaa(1.0);
        setPrix(0);
        setMarque("");
        setCategorie("");
        setFamille("");
        setCouleur("");
        setTaille("");
        setCategorieArticle("");
        setCategoriePdv("");
        setDescription("");
        setCodeRemise("");
        setCodeFournisseur("");
        setHsPlus("");
        setDateExpiration("");
    };

    const handleRemoveProduct = (id: string) => {
        setProducts(products.filter(p => p.id !== id));
    };

    const handleExportExcel = () => {
        if (!selectedPo || !polog.trim() || !dateChargement) return;

        const formattedDate = dateChargement.replace(/-/g, "");
        const descriptionLivraison = `${polog.trim()}_${selectedPo.name}_${selectedPo.supplierRef || ""}`;

        // Initialisation des deux feuilles de données
        const productsSheetData: any[] = [];
        const ordersSheetData: any[] = [];
        let globalCounter = 1;

        products.forEach((product) => {
            // Boucle pour sérialiser chaque unité physique de produit
            for (let i = 0; i < product.quantity; i++) {

                // Calculs financiers de base
                const pDollar = Number((pu * 1.2).toFixed(2));
                const cout = Number((pu * caa).toFixed(2));
                const marge = Number((prix - cout).toFixed(2));

                // --- ALGORITHME DE FORMULATION DES CHAMPS ---
                let barcode = `${selectedPo.name}${formattedDate}${globalCounter}`;
                let formattedProductName = `${product.nom} [${barcode}]`;
                let descValue = product.description;
                let remiseValue = product.code_remise;

                if (departement === "Femme" || departement === "Enfant") {
                    // 1. Code fournisseur (ex: "P.FEM - BSP" -> "BSP")
                    const supplierCode = selectedPo.supplierName.includes("-")
                        ? selectedPo.supplierName.split("-")[1].trim()
                        : selectedPo.supplierName.trim();

                    // 2. PO sans la lettre "P" (ex: "P0422" -> "0422")
                    const poClean = selectedPo.name.replace(/^P/, "");

                    // 3. Année et Semaine de chargement
                    const yearLastTwo = dateChargement.split("-")[0].slice(-2);
                    const weekStr = getWeekNumber(dateChargement);

                    // 4. Base Code & Code Remise
                    const baseCode = `${supplierCode}${poClean}${yearLastTwo}${weekStr}`;
                    remiseValue = baseCode;

                    // 5. Code-barres spécifique sérialisé (ex: P04221202605251)
                    barcode = `${selectedPo.name}${formattedDate.substring(1)}${globalCounter}`;

                    // 6. Extraction du dernier élément de catégorie après split /
                    const lastCatElement = product.categorie_article.includes("/")
                        ? product.categorie_article.split("/").pop()?.trim()
                        : product.categorie_article.trim();

                    // 7. Description formatée
                    descValue = `${baseCode} - ${lastCatElement} ${product.couleur} - ${product.code_hs}`;

                    // 8. Nom de produit unitaire
                    formattedProductName = `${descValue} - ${product.taille} [${barcode}]`;
                }

                // 1. FEUILLE : PRODUITS (Ligne unitaire)
                productsSheetData.push({
                    "Comptage": globalCounter,
                    "Date de chargement": formattedDate,
                    "Description Livraison": descriptionLivraison,
                    "Codebarre": barcode,
                    "Departement": departement,
                    "Segment": departement,
                    "Marque": product.marque,
                    "Categorie": product.categorie,
                    "Famille": product.famille,
                    "Couleur": product.couleur,
                    "Code HS": product.code_hs,
                    "Taille": product.taille,
                    "Qte": product.quantity, // Quantité globale
                    "PU": pu,
                    "P$": pDollar,
                    "CAA": caa,
                    "Cout": cout,
                    "Prix": (prix + 10) / 1.25,
                    "Marge": marge,
                    "ID Externe": barcode,
                    "Nom": formattedProductName,
                    "Catégorie d'article": product.categorie_article,
                    "Catégorie PdV": product.categorie_pdv,
                    "Description": descValue,
                    "Politique de contrôle": "On ordered quantities",
                    "Type d'article": "Goods",
                    "Disponible dans le Pdv": 1,
                    "Peut être vendu": 1,
                    "Description achat": selectedPo.name,
                    "Description pour les réceptions": polog,
                    "Code remise": remiseValue,
                    "Code Fournisseur": product.code_fournisseur,
                    "Description du prélèvement": selectedPo.supplierRef || "",
                    "Hs+": product.hs_plus,
                    "Suivi": 1,
                    "Date d'expiration": product.date_expiration
                });

                // 2. FEUILLE : COMMANDES (Même structure de ligne unitaire)
                ordersSheetData.push({
                    "id": selectedPo.externalId,
                    "partner_id": selectedPo.supplierName,
                    "order_line/product_id": formattedProductName,
                    "order_line/product_qty": 1,
                    "order_line/price_unit": product.pu
                });

                globalCounter++;
            }
        });

        // Compilation du classeur binaire (.xlsx)
        const wb = XLSX.utils.book_new();

        // Ajout de la Feuille 1 (Produits)
        const wsProducts = XLSX.utils.json_to_sheet(productsSheetData);
        XLSX.utils.book_append_sheet(wb, wsProducts, "Produits");

        // Ajout de la Feuille 2 (Commandes)
        const wsOrders = XLSX.utils.json_to_sheet(ordersSheetData);
        XLSX.utils.book_append_sheet(wb, wsOrders, "Commandes");

        // Génération du fichier final
        const fileName = `${formattedDate} - ${polog} - ${selectedPo.name} - ${selectedPo.supplierName.split(' - ')[1]}${selectedPo.supplierRef}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    return (
        <div className="space-y-8 pb-12 bg-slate-50/50 dark:bg-slate-900/10 min-h-screen p-4">

            {/* 1. HEADER */}
            <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
                <Link
                    href="/inventory/purchases"
                    className="inline-flex items-center gap-1.5 text-slate-400 hover:text-indigo-600 text-[10px] font-black uppercase tracking-wider mb-3 transition-colors"
                >
                    <ArrowLeft size={12} /> Retour aux réceptions
                </Link>
                <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 italic uppercase tracking-tighter">
                    Générateur de Fichiers d'Importation <span className="text-indigo-600">Excel</span>
                </h1>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

                {/* Formulaire */}
                <div className="xl:col-span-7 space-y-6">

                    {/* Sélection du PO */}
                    <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
                        <div className="border-b border-slate-100 dark:border-slate-900 pb-3 flex items-center gap-2">
                            <FileSpreadsheet className="text-indigo-600 w-4 h-4" />
                            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                Informations d'Origine Commande
                            </h2>
                        </div>
                        {loading ? (
                            <div className="py-6 text-center text-xs font-bold text-slate-400">Récupération d'Odoo...</div>
                        ) : (
                            <PurchaseOrderSelector
                                purchaseOrders={purchaseOrders}
                                selectedPoId={selectedPoId}
                                onSelectPo={handleSelectPo}
                            />
                        )}
                    </div>

                    {/* Configuration Globale */}
                    {selectedPo && (
                        <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
                            <div className="border-b border-slate-100 dark:border-slate-900 pb-3 flex items-center gap-2">
                                <CalendarDays className="text-indigo-600 w-4 h-4" />
                                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                    Paramètres Globaux d'Importation
                                </h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* POLOG (PO contenant LOG) */}
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase text-slate-400">POLOG (PO contenant LOG)</label>
                                    <select
                                        value={polog}
                                        onChange={(e) => setPolog(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-semibold outline-none h-10 cursor-pointer"
                                    >
                                        <option value="">Sélectionner un PO LOG...</option>
                                        {logPurchaseOrders.map((po) => (
                                            // @ts-ignore
                                            <option key={po.id} value={po.name}>{po.name} ({po.partner_id[1]})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase text-slate-400">Date de Chargement</label>
                                    <input type="date" value={dateChargement} onChange={(e) => setDateChargement(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium outline-none h-10" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase text-slate-400">Département (Segment)</label>
                                    <select value={departement} onChange={(e) => setDepartement(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-semibold outline-none h-10">
                                        <option value="Beauty">Beauty</option>
                                        <option value="Femme">Femme</option>
                                        <option value="Enfant">Enfant</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Saisie Produit */}
                    {selectedPo && (
                        <form onSubmit={handleAddProduct} className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
                            <div className="border-b border-slate-100 dark:border-slate-900 pb-3 flex items-center gap-2">
                                <Plus className="text-indigo-600 w-4 h-4" />
                                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                    Ajouter un produit (Feuille : Produits)
                                </h2>
                            </div>

                            {/* SECTION A: Saisie brute */}
                            <div className="space-y-4">
                                <h3 className="text-[9px] font-black text-indigo-500 uppercase">1. Saisie Code HS & Quantités</h3>
                                <div className="sm:col-span-7 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                            Code HS / Code Douanier
                                        </label>
                                        {autoFilling && (
                                            <span className="text-[8px] font-black uppercase text-indigo-500 animate-pulse">
                                                Recherche Odoo...
                                            </span>
                                        )}
                                        {autoFillSuccess === true && (
                                            <span className="text-[8px] font-black uppercase text-emerald-500">
                                                Prerempli depuis Odoo ✓
                                            </span>
                                        )}
                                        {autoFillSuccess === false && (
                                            <span className="text-[8px] font-bold uppercase text-slate-400">
                                                Nouveau produit (Saisie manuelle)
                                            </span>
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex: 3304.99.00 (Cosmétiques)"
                                        value={codeHs}
                                        onChange={(e) => setCodeHs(e.target.value)}
                                        onBlur={handleHsCodeBlur}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs font-medium outline-none text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 h-10 transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-slate-400">Nom du Produit</label>
                                        <input type="text" required value={nom} onChange={(e) => setNom(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-slate-400">Quantité physique</label>
                                        <input type="number" required min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION B: Caractéristiques et Dimensions */}
                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-900">
                                <h3 className="text-[9px] font-black text-indigo-500 uppercase">2. Caractéristiques & Typologie</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-slate-400">Marque</label>
                                        <input type="text" value={marque} onChange={(e) => setMarque(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-slate-400">Catégorie</label>
                                        <input type="text" value={categorie} onChange={(e) => setCategorie(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-slate-400">Famille</label>
                                        <input type="text" value={famille} onChange={(e) => setFamille(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-slate-400">Couleur</label>
                                        <input type="text" value={couleur} onChange={(e) => setCouleur(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-slate-400">Taille</label>
                                        <input type="text" value={taille} onChange={(e) => setTaille(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                                    </div>

                                    {/* CATEGORIE D'ARTICLE SELECT */}
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-slate-400">Catégorie Article</label>
                                        <NormalSelector
                                            data={odooProductCategories}
                                            selected={categorieArticle}
                                            onSelect={(value) => setCategorieArticle(value.name)}
                                        />
                                        {/* <select
                                            value={categorieArticle}
                                            onChange={(e) => setCategorieArticle(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-semibold h-9 outline-none cursor-pointer"
                                        >
                                            <option value="">Sélectionner une catégorie...</option>
                                            {odooProductCategories.map((cat) => (
                                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                                            ))}
                                        </select> */}
                                    </div>

                                    {/* CATEGORIE PDV SELECT */}
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-slate-400">Catégorie PdV</label>
                                        <select
                                            value={categoriePdv}
                                            onChange={(e) => setCategoriePdv(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-semibold h-9 outline-none cursor-pointer"
                                        >
                                            <option value="">Sélectionner une catégorie PdV...</option>
                                            {odooPosCategories.map((cat) => (
                                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-slate-400">Date Expiration</label>
                                        <input type="text" placeholder="Ex: 2026-12" value={dateExpiration} onChange={(e) => setDateExpiration(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase text-slate-400">Description</label>
                                    <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                                </div>
                            </div>

                            {/* SECTION C: Tarification, Taxes & Codes */}
                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-900">
                                <h3 className="text-[9px] font-black text-indigo-500 uppercase">3. Tarification, Codes & Remises</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-slate-400">Prix d'Achat (PU)</label>
                                        <input type="number" step="0.01" value={pu} onChange={(e) => setPu(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-slate-400">Coeff (CAA)</label>
                                        <input type="number" step="0.01" value={caa} onChange={(e) => setCaa(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-slate-400">Prix de vente public</label>
                                        <input type="number" step="0.01" value={prix} onChange={(e) => setPrix(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-slate-400">Code Remise</label>
                                        <input type="text" value={codeRemise} onChange={(e) => setCodeRemise(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-slate-400">Code Fournisseur</label>
                                        <input type="text" value={codeFournisseur} onChange={(e) => setCodeFournisseur(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-slate-400">HS +</label>
                                        <input type="text" value={hsPlus} onChange={(e) => setHsPlus(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Validation d'ajout du produit */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-900 flex justify-end">
                                <button type="submit" className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-xs font-bold shadow-sm">
                                    <Plus size={14} /> Ajouter cette ligne de produit
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Tableau Récapitulatif */}
                    {selectedPo && products.length > 0 && (
                        <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
                            <div className="border-b border-slate-100 dark:border-slate-900 pb-3 flex items-center gap-2">
                                <Tag className="text-indigo-600 w-4 h-4" />
                                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                    Lignes de produits enregistrées ({products.length})
                                </h2>
                            </div>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-left text-[11px] border-collapse">
                                    <thead className="bg-slate-900 text-slate-200">
                                        <tr>
                                            <th className="px-3 py-2">Nom</th>
                                            <th className="px-3 py-2">Code HS</th>
                                            <th className="px-3 py-2 text-right">Qté Globale</th>
                                            <th className="px-3 py-2 text-right">PU</th>
                                            <th className="px-3 py-2 text-right">Cout Calc.</th>
                                            <th className="px-3 py-2 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                                        {products.map((p) => (
                                            <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                                                <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-200">{p.nom}</td>
                                                <td className="px-3 py-2 font-mono text-slate-500">{p.code_hs}</td>
                                                <td className="px-3 py-2 text-right font-black italic">{p.quantity}</td>
                                                <td className="px-3 py-2 text-right font-mono">${p.pu}</td>
                                                <td className="px-3 py-2 text-right font-mono">${(p.pu * p.caa).toFixed(2)}</td>
                                                <td className="px-3 py-2 text-center">
                                                    <button type="button" onClick={() => handleRemoveProduct(p.id)} className="text-rose-500 hover:text-rose-600 p-1">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Exportation Excel */}
                            <div className="flex justify-end pt-4 border-t border-slate-100">
                                <button
                                    onClick={handleExportExcel}
                                    disabled={!polog.trim() || !dateChargement}
                                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-wider shadow-md transition-all"
                                >
                                    <DownloadCloud size={14} /> Générer le fichier Excel final
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Panneau de Synthèse Métadonnées Odoo */}
                <div className="xl:col-span-5 space-y-6">
                    <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
                        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">
                            Données de Contrôle Odoo (Résolues)
                        </h3>
                        {selectedPo ? (
                            <div className="space-y-4">
                                <div className="flex items-start gap-3 text-xs">
                                    <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-lg"><Hash size={14} /></div>
                                    <div>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase block">ID Externe</span>
                                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedPo.externalId}</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 text-xs">
                                    <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-lg"><User size={14} /></div>
                                    <div>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Fournisseur</span>
                                        <span className="font-black text-slate-900 dark:text-slate-100">{selectedPo.supplierName}</span>
                                        <span className="text-[10px] text-slate-400 block mt-0.5">ID Odoo : {selectedPo.supplierId}</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 text-xs">
                                    <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-lg"><FileSpreadsheet size={14} /></div>
                                    <div>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Référence Fournisseur</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{selectedPo.supplierRef || "N/D"}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-8 text-center text-xs text-slate-400 italic">Sélectionnez un bon de commande à gauche pour visualiser les métadonnées.</div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}