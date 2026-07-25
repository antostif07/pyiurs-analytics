'use client';

import React, { useState, useEffect, useReducer } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    FileSpreadsheet,
    Plus,
    Trash2,
    DownloadCloud,
    CalendarDays,
    Tag,
    Hash,
    User,
} from "lucide-react";
import { toast } from "sonner";

import PurchaseOrderSelector, { OdooPurchaseOrderOption } from "../_components/purchase-order-selector";
import NormalSelector from "../_components/normal-selector";
import {
    getLastProductByHsCode,
    getOdooPurchaseOrdersForImport,
    getOdooLogPurchaseOrders,
    getOdooProductCategories,
    getOdooPosCategories,
    OdooOption
} from "../import-actions";

import {
    ProductLine,
    ProductFormState,
    INITIAL_PRODUCT_FORM,
    productFormReducer,
    getWeekNumber
} from "./import-types";
import { generateImportExcel } from "./excel-generator";

interface LogPurchaseOrderOption extends OdooOption {
    partner_id?: [number, string];
}

function calculateCodeRemise(po: OdooPurchaseOrderOption | null, dateStr: string): string {
    if (!po || !dateStr) return "";

    const supplierPart = po.supplierName?.includes("-")
        ? po.supplierName.split("-")[1].trim()
        : po.supplierName?.trim() || "";

    const poClean = po.name ? po.name.replace(/^P/, "") : "";
    const yearLastTwo = dateStr ? dateStr.split("-")[0]?.slice(-2) || "" : "";
    const weekStr = dateStr ? getWeekNumber(dateStr) : "";

    return `${supplierPart}${poClean}${yearLastTwo}${weekStr}`;
}

function computeDescriptionAndName(
    departement: string,
    codeHs: string,
    codeRemise: string,
    marque: string,
    famille: string,
    couleur: string,
    taille: string
) {
    const cleanHs = codeHs.trim();
    const cleanMarque = marque.trim() ? marque.trim() : "A remplacer";

    if (departement === "Beauty") {
        const desc = `marque : ${cleanMarque} [${cleanHs}]`;
        return { description: desc, nom: desc };
    } else {
        const desc = `${codeRemise} - ${famille.trim()} ${couleur.trim()} - ${cleanHs}`.replace(/\s+/g, " ").trim();
        const nom = `${desc} - ${taille.trim()}`.replace(/\s+/g, " ").trim();
        return { description: desc, nom: nom };
    }
}

export default function PurchaseImportGeneratorPage() {
    const [purchaseOrders, setPurchaseOrders] = useState<OdooPurchaseOrderOption[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [logPurchaseOrders, setLogPurchaseOrders] = useState<LogPurchaseOrderOption[]>([]);
    const [odooProductCategories, setOdooProductCategories] = useState<OdooOption[]>([]);
    const [odooPosCategories, setOdooPosCategories] = useState<OdooOption[]>([]);

    const [selectedPoId, setSelectedPoId] = useState<number | null>(null);
    const [selectedPo, setSelectedPo] = useState<OdooPurchaseOrderOption | null>(null);

    // Champs Globaux
    const [polog, setPolog] = useState<string>("");
    const [dateChargement, setDateChargement] = useState<string>("");
    const [departement, setDepartement] = useState<string>("Beauty");
    const [isDepartementLocked, setIsDepartementLocked] = useState<boolean>(false);

    const [products, setProducts] = useState<ProductLine[]>([]);
    const [form, dispatch] = useReducer(productFormReducer, INITIAL_PRODUCT_FORM);

    const [autoFilling, setAutoFilling] = useState<boolean>(false);
    const [autoFillSuccess, setAutoFillSuccess] = useState<boolean | null>(null);

    const currentCodeRemise = calculateCodeRemise(selectedPo, dateChargement);

    useEffect(() => {
        async function loadOdooOrders() {
            try {
                setLoading(true);
                const [poData, logPoData, prodCatData, posCatData] = await Promise.all([
                    getOdooPurchaseOrdersForImport(),
                    getOdooLogPurchaseOrders(),
                    getOdooProductCategories(),
                    getOdooPosCategories()
                ]);

                const filteredProdCatData = prodCatData.filter((cat) => cat.name.split("/").length < 4);
                setPurchaseOrders(poData);
                setLogPurchaseOrders(logPoData as LogPurchaseOrderOption[]);
                setOdooProductCategories(filteredProdCatData);
                setOdooPosCategories(posCatData);
            } catch (err) {
                console.error("Erreur de chargement Odoo:", err);
                setError("Impossible de récupérer les structures de données Odoo.");
            } finally {
                setLoading(false);
            }
        }
        loadOdooOrders();
    }, []);

    const handleFieldChange = (field: keyof ProductFormState, value: any) => {
        const updatedForm = { ...form, [field]: value };

        let desc = updatedForm.description;
        let nom = updatedForm.nom;

        if (departement === "Beauty") {
            if (field === "marque" || field === "codeHs") {
                const marqueTxt = updatedForm.marque.trim() ? updatedForm.marque.trim() : "A remplacer";
                desc = `marque : ${marqueTxt} [${updatedForm.codeHs.trim()}]`;
                nom = desc;
            }
        } else if (departement === "Femme" || departement === "Enfant") {
            if (field === "famille" || field === "couleur" || field === "codeHs" || field === "taille") {
                desc = `${currentCodeRemise} - ${updatedForm.famille.trim()} ${updatedForm.couleur.trim()} - ${updatedForm.codeHs.trim()}`.replace(/\s+/g, " ").trim();
                nom = `${desc} - ${updatedForm.taille.trim()}`.trim();
            }
        }

        dispatch({
            type: "SET_FIELDS",
            fields: {
                [field]: value,
                description: desc,
                nom: nom,
                codeFournisseur: departement === "Femme" ? updatedForm.marque : "",
            }
        });
    };

    const handleDateChargementChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDateChargement(e.target.value);
    };

    const handlePologChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setPolog(e.target.value);
    };

    const handleDepartementChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setDepartement(e.target.value);
    };

    const handleSelectPo = (po: OdooPurchaseOrderOption | null) => {
        if (po) {
            setSelectedPoId(po.id);
            setSelectedPo(po);

            const supplierNameUpper = (po.supplierName || "").toUpperCase();

            if (supplierNameUpper.includes("P.FEM")) {
                setDepartement("Femme");
                setIsDepartementLocked(true);
            } else if (supplierNameUpper.includes("P.BTY")) {
                setDepartement("Beauty");
                setIsDepartementLocked(true);
            } else {
                setIsDepartementLocked(false);
            }
        } else {
            setSelectedPoId(null);
            setSelectedPo(null);
            setProducts([]);
            setIsDepartementLocked(false);
        }
    };

    // ✅ 1. PARADE CONTRE LA SOUMISSION INTEMPESTIVE DE FORMULAIRE AU CLAVIER
    const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        // Si l'utilisateur appuie sur Entrée dans n'importe quel champ de saisie, on bloque la soumission
        if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
            e.preventDefault();
        }
    };

    // ✅ 2. RECHERCHE PAR CODE HS (Déclenchée au Blur ou à la touche Entrée spécifique)
    const handleHsCodeBlur = async (e?: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => {
        const rawHs = (e && 'target' in e && e.target) ? (e.target as HTMLInputElement).value : form.codeHs;
        const cleanHs = rawHs.trim();

        if (!cleanHs) return;

        try {
            setAutoFilling(true);
            setAutoFillSuccess(null);

            const matchedProduct = await getLastProductByHsCode(cleanHs);

            if (matchedProduct) {
                const marqueVal = matchedProduct.marque || form.marque || "";
                const familleVal = matchedProduct.famille || form.famille || "";
                const couleurVal = matchedProduct.couleur || form.couleur || "";
                const tailleVal = matchedProduct.taille || form.taille || "";

                let desc = "";
                let productName = "";

                if (departement === "Beauty") {
                    const marqueTxt = marqueVal.trim() ? marqueVal.trim() : "A remplacer";
                    desc = `marque : ${marqueTxt} [${cleanHs}]`;
                    productName = matchedProduct.nom || desc;
                } else {
                    desc = matchedProduct.description || `${currentCodeRemise} - ${familleVal} ${couleurVal} - ${cleanHs}`.replace(/\s+/g, " ").trim();
                    productName = `${desc} - ${tailleVal}`.trim();
                }

                dispatch({
                    type: "SET_FIELDS",
                    fields: {
                        codeHs: cleanHs,
                        nom: productName,
                        description: desc,
                        categorie: matchedProduct.categorie || "",
                        prix: matchedProduct.prix ? Number((matchedProduct.prix * 1.25 - 10).toFixed(2)) : form.prix,
                        pu: matchedProduct.pu || 0,
                        marque: marqueVal,
                        famille: familleVal,
                        couleur: couleurVal,
                        taille: tailleVal,
                        categorieArticle: matchedProduct.categorie_article || "",
                        categoriePdv: matchedProduct.categorie_pdv || "",
                        caa: matchedProduct.caa || 1.0,
                        codeFournisseur: departement === "Femme" ? marqueVal : "",
                    }
                });

                setAutoFillSuccess(true);
                toast.success(`Produit Odoo trouvé pour le Code HS: ${cleanHs}`);
            } else {
                const computed = computeDescriptionAndName(
                    departement,
                    cleanHs,
                    currentCodeRemise,
                    form.marque,
                    form.famille,
                    form.couleur,
                    form.taille
                );

                dispatch({
                    type: "SET_FIELDS",
                    fields: {
                        codeHs: cleanHs,
                        description: computed.description,
                        nom: computed.nom,
                        codeFournisseur: departement === "Femme" ? form.marque : "",
                    }
                });

                setAutoFillSuccess(false);
                toast.info(`Nouveau Code HS ${cleanHs} (non trouvé dans Odoo).`);
            }
        } catch (err) {
            console.error("[HS_CODE_SEARCH_ERROR] Erreur recherche Code HS:", err);
            setAutoFillSuccess(false);
            toast.error("Erreur lors de la recherche dans Odoo.");
        } finally {
            setAutoFilling(false);
            setTimeout(() => setAutoFillSuccess(null), 3000);
        }
    };

    const handleAddProduct = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.codeHs.trim() || form.quantity <= 0) return;

        const computed = computeDescriptionAndName(
            departement,
            form.codeHs,
            currentCodeRemise,
            form.marque,
            form.famille,
            form.couleur,
            form.taille
        );

        const newLine: ProductLine = {
            id: crypto.randomUUID(),
            nom: form.nom || computed.nom,
            code_hs: form.codeHs.trim(),
            quantity: form.quantity,
            pu: form.pu,
            caa: form.caa,
            prix: form.prix,
            marque: form.marque,
            categorie: form.categorie,
            famille: form.famille,
            couleur: form.couleur,
            taille: form.taille,
            categorie_article: form.categorieArticle,
            categorie_pdv: form.categoriePdv,
            description: form.description || computed.description,
            code_remise: currentCodeRemise,
            code_fournisseur: departement === "Femme" ? form.marque : "",
            hs_plus: form.hsPlus,
            date_expiration: form.dateExpiration
        };

        setProducts([...products, newLine]);
        dispatch({ type: "RESET_FORM" });
    };

    const handleRemoveProduct = (id: string) => {
        setProducts(products.filter(p => p.id !== id));
    };

    const handleExport = () => {
        if (!selectedPo) return;
        generateImportExcel({
            selectedPo,
            polog,
            dateChargement,
            departement,
            products
        });
    };

    return (
        <div className="space-y-8 pb-12 bg-background min-h-screen transition-colors duration-150">

            {/* HEADER */}
            <div className="border-b border-border pb-5">
                <Link
                    href="/inventory/purchases"
                    className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary text-[10px] font-bold uppercase tracking-wider mb-3 transition-colors"
                >
                    <ArrowLeft size={12} /> Retour aux réceptions
                </Link>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground uppercase tracking-tight">
                    Générateur de Fichiers d'Importation <span className="text-primary font-black">Excel</span>
                </h1>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

                <div className="xl:col-span-7 space-y-6">

                    {/* Sélection du PO */}
                    <div className="bg-card text-card-foreground rounded-2xl border border-border shadow-xs p-6 space-y-6">
                        <div className="border-b border-border pb-3 flex items-center gap-2">
                            <FileSpreadsheet className="text-primary w-4 h-4" />
                            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                Informations d'Origine Commande
                            </h2>
                        </div>
                        {loading ? (
                            <div className="py-6 text-center text-xs font-semibold text-muted-foreground animate-pulse">
                                Récupération des données Odoo...
                            </div>
                        ) : (
                            <PurchaseOrderSelector
                                purchaseOrders={purchaseOrders}
                                selectedPoId={selectedPoId}
                                onSelectPo={handleSelectPo}
                            />
                        )}
                    </div>

                    {/* Paramètres Globaux */}
                    {selectedPo && (
                        <div className="bg-card text-card-foreground rounded-2xl border border-border shadow-xs p-6 space-y-4">
                            <div className="border-b border-border pb-3 flex items-center gap-2">
                                <CalendarDays className="text-primary w-4 h-4" />
                                <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    Paramètres Globaux d'Importation
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase text-muted-foreground">POLOG (PO contenant LOG)</label>
                                    <select
                                        value={polog}
                                        onChange={handlePologChange}
                                        className="w-full bg-muted/20 border border-input rounded-xl p-2 text-xs font-medium outline-none focus:ring-1 focus:ring-primary h-10 cursor-pointer"
                                    >
                                        <option value="">Sélectionner un PO LOG...</option>
                                        {logPurchaseOrders.map((po) => (
                                            <option key={po.id} value={po.name}>
                                                {po.name} {po.partner_id ? `(${po.partner_id[1]})` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase text-muted-foreground">Date de Chargement</label>
                                    <input
                                        type="date"
                                        value={dateChargement}
                                        onChange={handleDateChargementChange}
                                        className="w-full bg-muted/20 border border-input rounded-xl p-2 text-xs font-medium outline-none focus:ring-1 focus:ring-primary h-10 cursor-pointer"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase text-muted-foreground">
                                        Département (Segment)
                                    </label>
                                    <select
                                        value={departement}
                                        disabled={isDepartementLocked}
                                        onChange={handleDepartementChange}
                                        className="w-full bg-muted/20 border border-input rounded-xl p-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-primary h-10 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        <option value="Beauty">Beauty</option>
                                        <option value="Femme">Femme</option>
                                        <option value="Enfant">Enfant</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Formulaire Produit avec Blocage de la touche Entrée globale */}
                    {selectedPo && (
                        <form
                            onSubmit={handleAddProduct}
                            onKeyDown={handleFormKeyDown} // ✅ Bloque la soumission prématurée au clavier
                            className="bg-card text-card-foreground rounded-2xl border border-border shadow-xs p-6 space-y-6"
                        >
                            <div className="border-b border-border pb-3 flex items-center gap-2">
                                <Plus className="text-primary w-4 h-4" />
                                <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    Ajouter un produit (Feuille : Produits)
                                </h2>
                            </div>

                            {/* SECTION 1: Saisie brute */}
                            <div className="space-y-4">
                                <h3 className="text-[9px] font-extrabold text-primary uppercase tracking-wider">1. Saisie Code HS & Quantités</h3>
                                <div className="sm:col-span-7 space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                                            Code HS / Code Douanier
                                        </label>
                                        {autoFilling && (
                                            <span className="text-[8px] font-bold uppercase text-primary animate-pulse">
                                                Recherche Odoo...
                                            </span>
                                        )}
                                        {autoFillSuccess === true && (
                                            <span className="text-[8px] font-bold uppercase text-emerald-600">
                                                Prérempli depuis Odoo ✓
                                            </span>
                                        )}
                                        {autoFillSuccess === false && (
                                            <span className="text-[8px] font-medium uppercase text-muted-foreground">
                                                Nouveau produit (Saisie manuelle)
                                            </span>
                                        )}
                                    </div>

                                    {/* INPUT CODE HS : Déclenche la recherche au Blur OU lors de l'appui sur la touche Entrée */}
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex: 3304.99.00 (Cosmétiques)"
                                        value={form.codeHs}
                                        onChange={(e) => handleFieldChange("codeHs", e.target.value)}
                                        onBlur={handleHsCodeBlur}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleHsCodeBlur(e); // ✅ Déclenche spécifiquement la recherche au lieu de soumettre le formulaire
                                            }
                                        }}
                                        className="w-full bg-muted/20 border border-input rounded-xl p-2.5 text-xs font-mono outline-none text-foreground focus:ring-1 focus:ring-primary h-10 transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-muted-foreground">Nom du Produit</label>
                                        <input
                                            type="text"
                                            required
                                            value={form.nom}
                                            onChange={(e) => handleFieldChange("nom", e.target.value)}
                                            className="w-full bg-muted/20 border border-input rounded-xl p-2 text-xs font-medium h-9 outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-muted-foreground">Quantité physique</label>
                                        <input
                                            type="number"
                                            required
                                            min={1}
                                            value={form.quantity}
                                            onChange={(e) => handleFieldChange("quantity", Number(e.target.value))}
                                            className="w-full bg-muted/20 border border-input rounded-xl p-2 text-xs font-mono h-9 outline-none focus:ring-1 focus:ring-primary font-bold"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: Caractéristiques */}
                            <div className="space-y-4 pt-4 border-t border-border">
                                <h3 className="text-[9px] font-extrabold text-primary uppercase tracking-wider">2. Caractéristiques & Typologie</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-muted-foreground">Marque</label>
                                        <input type="text" value={form.marque} onChange={(e) => handleFieldChange("marque", e.target.value)} className="w-full bg-muted/20 border border-input rounded-xl p-2 text-xs font-medium h-9 outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-muted-foreground">Catégorie</label>
                                        <input type="text" value={form.categorie} onChange={(e) => handleFieldChange("categorie", e.target.value)} className="w-full bg-muted/20 border border-input rounded-xl p-2 text-xs font-medium h-9 outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-muted-foreground">Famille</label>
                                        <input type="text" value={form.famille} onChange={(e) => handleFieldChange("famille", e.target.value)} className="w-full bg-muted/20 border border-input rounded-xl p-2 text-xs font-medium h-9 outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-muted-foreground">Couleur</label>
                                        <input type="text" value={form.couleur} onChange={(e) => handleFieldChange("couleur", e.target.value)} className="w-full bg-muted/20 border border-input rounded-xl p-2 text-xs font-medium h-9 outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-muted-foreground">Taille</label>
                                        <input type="text" value={form.taille} onChange={(e) => handleFieldChange("taille", e.target.value)} className="w-full bg-muted/20 border border-input rounded-xl p-2 text-xs font-medium h-9 outline-none" />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-muted-foreground">Catégorie Article</label>
                                        <NormalSelector
                                            data={odooProductCategories}
                                            selected={form.categorieArticle}
                                            onSelect={(value) => handleFieldChange("categorieArticle", value.name)}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-muted-foreground">Catégorie PdV</label>
                                        <select
                                            value={form.categoriePdv}
                                            onChange={(e) => handleFieldChange("categoriePdv", e.target.value)}
                                            className="w-full bg-muted/20 border border-input rounded-xl p-2 text-xs font-medium h-9 outline-none cursor-pointer"
                                        >
                                            <option value="">Sélectionner une catégorie...</option>
                                            {odooPosCategories.map((cat) => (
                                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-muted-foreground">Date Expiration</label>
                                        <input type="text" placeholder="Ex: 2026-12" value={form.dateExpiration} onChange={(e) => handleFieldChange("dateExpiration", e.target.value)} className="w-full bg-muted/20 border border-input rounded-xl p-2 text-xs font-medium h-9 outline-none" />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase text-muted-foreground">
                                        Description
                                    </label>
                                    <input
                                        type="text"
                                        value={form.description}
                                        onChange={(e) => handleFieldChange("description", e.target.value)}
                                        className="w-full bg-muted/20 border border-input rounded-xl p-2 text-xs font-medium h-9 outline-none focus:ring-1 focus:ring-primary"
                                    />
                                </div>
                            </div>

                            {/* SECTION 3: Tarification */}
                            <div className="space-y-4 pt-4 border-t border-border">
                                <h3 className="text-[9px] font-extrabold text-primary uppercase tracking-wider">3. Tarification & Remises</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-muted-foreground font-sans">Prix Achat (PU)</label>
                                        <input type="number" step="0.01" value={form.pu} onChange={(e) => handleFieldChange("pu", Number(e.target.value))} className="w-full bg-muted/20 border border-input rounded-xl p-2 text-xs h-9 outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-muted-foreground font-sans">Coeff (CAA)</label>
                                        <input type="number" step="0.01" value={form.caa} onChange={(e) => handleFieldChange("caa", Number(e.target.value))} className="w-full bg-muted/20 border border-input rounded-xl p-2 text-xs h-9 outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-muted-foreground font-sans">Prix Vente Public</label>
                                        <input type="number" step="0.01" value={form.prix} onChange={(e) => handleFieldChange("prix", Number(e.target.value))} className="w-full bg-muted/20 border border-input rounded-xl p-2 text-xs h-9 outline-none font-bold text-primary" />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-muted-foreground font-sans">
                                            Code Remise
                                        </label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={currentCodeRemise}
                                            placeholder="PO + Date requis"
                                            className="w-full bg-muted/40 border border-input rounded-xl p-2 text-xs h-9 outline-none cursor-not-allowed font-mono font-bold text-primary opacity-90"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-muted-foreground font-sans">
                                            Code Fournisseur
                                        </label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={departement === "Femme" ? form.marque : ""}
                                            className="w-full bg-muted/40 border border-input rounded-xl p-2 text-xs h-9 outline-none cursor-not-allowed opacity-80 font-mono"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-muted-foreground font-sans">HS +</label>
                                        <input type="text" value={form.hsPlus} onChange={(e) => handleFieldChange("hsPlus", e.target.value)} className="w-full bg-muted/20 border border-input rounded-xl p-2 text-xs h-9 outline-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border flex justify-end">
                                <button type="submit" className="flex items-center gap-1.5 bg-primary hover:opacity-90 text-primary-foreground rounded-xl px-4 py-2.5 text-xs font-semibold shadow-xs cursor-pointer transition-all">
                                    <Plus size={14} /> Ajouter cette ligne
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Tableau Récapitulatif */}
                    {selectedPo && products.length > 0 && (
                        <div className="bg-card text-card-foreground rounded-2xl border border-border shadow-xs p-6 space-y-4">
                            <div className="border-b border-border pb-3 flex items-center gap-2">
                                <Tag className="text-primary w-4 h-4" />
                                <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    Lignes de produits enregistrées ({products.length})
                                </h2>
                            </div>

                            <div className="border border-border rounded-xl overflow-hidden">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-muted/40 text-muted-foreground font-bold uppercase text-[9px]">
                                        <tr>
                                            <th className="px-3 py-2.5">Nom</th>
                                            <th className="px-3 py-2.5">Code HS</th>
                                            <th className="px-3 py-2.5 text-right">Qté</th>
                                            <th className="px-3 py-2.5 text-right">PU</th>
                                            <th className="px-3 py-2.5 text-right">Coût Calc.</th>
                                            <th className="px-3 py-2.5 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40 font-mono">
                                        {products.map((p) => (
                                            <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-3 py-2 font-sans font-bold text-foreground">{p.nom}</td>
                                                <td className="px-3 py-2 text-muted-foreground">{p.code_hs}</td>
                                                <td className="px-3 py-2 text-right font-bold">{p.quantity}</td>
                                                <td className="px-3 py-2 text-right">${p.pu}</td>
                                                <td className="px-3 py-2 text-right text-primary font-bold">${(p.pu * p.caa).toFixed(2)}</td>
                                                <td className="px-3 py-2 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveProduct(p.id)}
                                                        className="text-destructive hover:bg-destructive/10 p-1 rounded-lg transition-colors cursor-pointer"
                                                        title="Supprimer la ligne"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-border">
                                <button
                                    onClick={handleExport}
                                    disabled={!polog.trim() || !dateChargement}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-xs font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                                >
                                    <DownloadCloud size={16} /> Générer le fichier Excel final (.xlsx)
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Métadonnées Odoo */}
                <div className="xl:col-span-5 space-y-6">
                    <div className="bg-card text-card-foreground rounded-2xl border border-border shadow-xs p-5">
                        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
                            Données de Contrôle Odoo (Résolues)
                        </h3>
                        {selectedPo ? (
                            <div className="space-y-4">
                                <div className="flex items-start gap-3 text-xs">
                                    <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0"><Hash size={14} /></div>
                                    <div>
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase block">ID Externe</span>
                                        <span className="font-mono font-bold text-foreground">{selectedPo.externalId}</span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 text-xs">
                                    <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0"><User size={14} /></div>
                                    <div>
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase block">Fournisseur</span>
                                        <span className="font-bold text-foreground">{selectedPo.supplierName}</span>
                                        <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">ID Odoo : {selectedPo.supplierId}</span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 text-xs">
                                    <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0"><FileSpreadsheet size={14} /></div>
                                    <div>
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase block">Référence Fournisseur</span>
                                        <span className="font-bold text-foreground">{selectedPo.supplierRef || "N/D"}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-8 text-center text-xs text-muted-foreground italic font-light">
                                Sélectionnez un bon de commande à gauche pour visualiser les métadonnées.
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}