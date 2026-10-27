// app/inventory/purchases/import-generator/purchase-import-generator-client.tsx
"use client";

import React, { useState, useEffect, useReducer, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    CheckCircle2,
    Cloud,
    CloudOff,
    Eraser,
    FileSpreadsheet,
    Loader2,
    Trash2,
    DownloadCloud,
    Hash,
    User,
} from "lucide-react";
import { toast } from "sonner";

import ReportPageHeader from "@/components/new-ui/layout/report-page-header";
import { ReportSection } from "@/components/new-ui/layout/report-section";
import { Button } from "@/components/ui/button";
import {
    getOdooPurchaseOrdersForImport,
    getOdooLogPurchaseOrders,
    getOdooProductCategories,
    getOdooPosCategories,
    type OdooOption,
} from "../import-actions";

import {
    type ProductLine,
    type ProductFormState,
    INITIAL_PRODUCT_FORM,
    productFormReducer,
    getWeekNumber,
} from "./import-types";
import { generateImportExcel } from "./excel-generator";
import { useAutoSaveSession } from "./_lib/hooks/use-auto-save-session";
import {
    resetSession,
    type PurchaseImportSession,
} from "./_lib/session-actions";
import PurchaseOrderSelector, { OdooPurchaseOrderOption } from "../_lib/_components/purchase-order-selector";
import GlobalParamsSection, { deriveDepartement } from "./_components/global-params-section";
import { computeDescriptionAndName } from "./_lib/product-form-logic";
import ProductFormSection from "./_components/product-form-section";

interface LogPurchaseOrderOption extends OdooOption {
    partner_id?: [number, string];
}

interface Props {
    initialSession: PurchaseImportSession | null;
    requestedSessionId: string | null;
}

// ─── Helpers ────────────────────────────────────────────────

function calculateCodeRemise(
    po: OdooPurchaseOrderOption | null,
    dateStr: string,
): string {
    if (!po || !dateStr) return "";
    const supplierPart = po.supplierName?.includes("-")
        ? po.supplierName.split("-")[1].trim()
        : po.supplierName?.trim() || "";
    const poClean = po.name ? po.name.replace(/^P/, "") : "";
    const yearLastTwo = dateStr ? dateStr.split("-")[0]?.slice(-2) || "" : "";
    const weekStr = dateStr ? getWeekNumber(dateStr) : "";
    return `${supplierPart}${poClean}${yearLastTwo}${weekStr}`;
}

// ─── Composant principal ────────────────────────────────────

export default function PurchaseImportGeneratorClient({
    initialSession,
    requestedSessionId,
}: Props) {
    const router = useRouter();

    const [purchaseOrders, setPurchaseOrders] = useState<OdooPurchaseOrderOption[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [logPurchaseOrders, setLogPurchaseOrders] = useState<LogPurchaseOrderOption[]>([]);
    const [odooProductCategories, setOdooProductCategories] = useState<OdooOption[]>([]);
    const [odooPosCategories, setOdooPosCategories] = useState<OdooOption[]>([]);

    const [selectedPoId, setSelectedPoId] = useState<number | null>(
        initialSession?.selected_po_id ?? null,
    );
    const [selectedPo, setSelectedPo] = useState<OdooPurchaseOrderOption | null>(
        initialSession?.selected_po_data
            ? {
                id: initialSession.selected_po_data.id,
                name: initialSession.selected_po_data.name,
                externalId: initialSession.selected_po_data.externalId,
                supplierRef: initialSession.selected_po_data.supplierRef,
                supplierId: initialSession.selected_po_data.supplierId,
                supplierName: initialSession.selected_po_data.supplierName,
            }
            : null,
    );
    const [polog, setPolog] = useState<string>(initialSession?.polog ?? "");
    const [dateChargement, setDateChargement] = useState<string>(
        initialSession?.date_chargement ?? "",
    );
    const [products, setProducts] = useState<ProductLine[]>(
        initialSession?.products ?? [],
    );
    const [sessionId, setSessionId] = useState<string | null>(
        initialSession?.id ?? null,
    );
    const [sessionUpdatedAt, setSessionUpdatedAt] = useState<string | null>(
        initialSession?.updated_at ?? null,
    );
    const [form, dispatch] = useReducer(productFormReducer, INITIAL_PRODUCT_FORM);

    const currentCodeRemise = calculateCodeRemise(selectedPo, dateChargement);
    const departement = deriveDepartement(selectedPo);

    // ─── Session hooks ───────────────────────────────────────
    const handleSessionReady = useCallback(
        (session: PurchaseImportSession) => {
            setSessionId(session.id);
            setSessionUpdatedAt(session.updated_at);
            setPolog(session.polog);
            setDateChargement(session.date_chargement);
            setProducts(session.products);

            const url = new URL(window.location.href);
            url.searchParams.set("session", session.id);
            router.replace(url.pathname + "?" + url.searchParams.toString(), {
                scroll: false,
            });
        },
        [router],
    );

    const handleConflict = useCallback(
        (fresh: PurchaseImportSession) => {
            const confirmed = window.confirm(
                "Session modifiée par un autre utilisateur.\n\n" +
                "OK : recharger la version récente (modifs locales perdues).\n" +
                "Annuler : garder la version locale.",
            );
            if (confirmed) {
                handleSessionReady(fresh);
                toast.info("Session rechargée");
            } else {
                setSessionUpdatedAt(fresh.updated_at);
                toast.warning("Version locale conservée");
            }
        },
        [handleSessionReady],
    );

    const {
        status: saveStatus,
        lastSavedAt,
        ensureSessionForPo,
        flush,
        markAsExported,
    } = useAutoSaveSession({
        sessionId,
        knownUpdatedAt: sessionUpdatedAt,
        selectedPo,
        polog,
        dateChargement,
        departement,
        products,
        onSessionReady: handleSessionReady,
        onConflict: handleConflict,
    });

    // ─── Chargement Odoo ─────────────────────────────────────
    useEffect(() => {
        async function loadOdooOrders() {
            try {
                setLoading(true);
                const [poData, logPoData, prodCatData, posCatData] = await Promise.all([
                    getOdooPurchaseOrdersForImport(),
                    getOdooLogPurchaseOrders(),
                    getOdooProductCategories(),
                    getOdooPosCategories(),
                ]);
                const filteredProdCatData = prodCatData.filter(
                    (cat) => cat.name.split("/").length < 4,
                );
                setPurchaseOrders(poData);
                setLogPurchaseOrders(logPoData as LogPurchaseOrderOption[]);
                setOdooProductCategories(filteredProdCatData);
                setOdooPosCategories(posCatData);
            } catch (err) {
                console.error("Erreur de chargement Odoo:", err);
                toast.error("Impossible de récupérer les données Odoo.");
            } finally {
                setLoading(false);
            }
        }
        loadOdooOrders();
    }, []);

    // ─── Handlers ────────────────────────────────────────────
    const handleSelectPo = useCallback(
        async (po: OdooPurchaseOrderOption | null) => {
            if (!po) {
                setSelectedPoId(null);
                setSelectedPo(null);
                setSessionId(null);
                setSessionUpdatedAt(null);
                setProducts([]);
                setPolog("");
                setDateChargement("");
                dispatch({ type: "RESET_FORM" });
                router.replace("/inventory/purchases/import-generator", {
                    scroll: false,
                });
                return;
            }

            if (po.id === selectedPoId) return;

            setSelectedPoId(po.id);
            setSelectedPo(po);

            const session = await ensureSessionForPo(po);
            if (!session) return;

            toast.success(
                session.products.length > 0
                    ? `Session reprise (${session.products.length} ligne${session.products.length > 1 ? "s" : ""
                    })`
                    : "Nouvelle session créée",
            );
        },
        [selectedPoId, ensureSessionForPo, router],
    );

    const handleFieldChange = (field: keyof ProductFormState, value: any) => {
        const updatedForm = { ...form, [field]: value };
        let desc = updatedForm.description;
        let nom = updatedForm.nom;

        if (departement === "Beauty") {
            if (field === "marque" || field === "codeHs") {
                const marqueTxt = updatedForm.marque.trim()
                    ? updatedForm.marque.trim()
                    : "A remplacer";
                desc = `marque : ${marqueTxt} [${updatedForm.codeHs.trim()}]`;
                nom = desc;
            }
        } else if (departement === "Femme" || departement === "Enfant") {
            if (
                field === "famille" ||
                field === "couleur" ||
                field === "codeHs" ||
                field === "taille"
            ) {
                desc = `${currentCodeRemise} - ${updatedForm.famille.trim()} ${updatedForm.couleur.trim()} - ${updatedForm.codeHs.trim()}`
                    .replace(/\s+/g, " ")
                    .trim();
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
            },
        });
    };

    const handleFieldsUpdate = useCallback(
        (fields: Partial<ProductFormState>) => {
            dispatch({ type: "SET_FIELDS", fields });
        },
        [],
    );

    const handleDateChargementChange = (e: React.ChangeEvent<HTMLInputElement>) =>
        setDateChargement(e.target.value);
    const handlePologChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
        setPolog(e.target.value);

    const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
            e.preventDefault();
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
            form.taille,
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
            date_expiration: form.dateExpiration,
        };

        setProducts([...products, newLine]);
        dispatch({ type: "RESET_FORM" });
    };

    const handleRemoveProduct = (id: string) => {
        setProducts(products.filter((p) => p.id !== id));
    };

    const handleExport = async () => {
        if (!selectedPo) return;
        await flush();
        generateImportExcel({
            selectedPo,
            polog,
            dateChargement,
            departement,
            products,
        });
        await markAsExported();
        toast.success("Fichier Excel généré. Session archivée côté serveur.");
    };

    const handleResetSession = async () => {
        if (!sessionId || !selectedPo) return;
        if (
            !window.confirm(
                "Vider la session courante ? Les données actuelles seront perdues (le PO reste sélectionné).",
            )
        )
            return;

        const { session } = await resetSession(sessionId, {
            id: selectedPo.id,
            name: selectedPo.name,
            externalId: selectedPo.externalId,
            supplierRef: selectedPo.supplierRef,
            supplierId: selectedPo.supplierId,
            supplierName: selectedPo.supplierName,
        });
        if (session) {
            handleSessionReady(session);
            toast.success("Session vidée");
        }
    };

    // ─── Rendu ───────────────────────────────────────────────
    return (
        <div>
            {/* ══════════════ HEADER ══════════════ */}
            <ReportPageHeader
                title="Générateur d'import Excel"
                subtitle="Créer un fichier d'import Odoo pour les réceptions d'achats"
                badge={{ label: "Achats", tone: "sky" }}
                extraActions={
                    <div className="flex flex-wrap items-center gap-2">
                        <SaveIndicator
                            status={saveStatus}
                            lastSavedAt={lastSavedAt}
                        />
                        {sessionId && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleResetSession}
                                className="h-7 px-2 text-[11px] gap-1.5 border-border/80 hover:bg-accent/60"
                            >
                                <Eraser className="w-3 h-3" />
                                <span className="hidden sm:inline">
                                    Vider la session
                                </span>
                            </Button>
                        )}
                    </div>
                }
            >
                <Link
                    href="/inventory/purchases"
                    className="inline-flex items-center gap-1.5 h-7 px-2 text-[11px] font-medium rounded-md border border-border/80 bg-background hover:bg-accent/60 text-muted-foreground"
                >
                    <ArrowLeft size={12} />
                    <span className="hidden sm:inline">
                        Retour aux réceptions
                    </span>
                </Link>
            </ReportPageHeader>

            {/* ══════════════ CONTENU ══════════════ */}
            <div className="p-4 sm:p-5 space-y-4">
                {/* Bandeaux d'info */}
                {requestedSessionId && !initialSession && (
                    <div className="rounded-lg border border-amber-200/60 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
                        La session demandée est introuvable. Sélectionnez un PO
                        pour en créer une nouvelle.
                    </div>
                )}

                {initialSession && initialSession.products.length > 0 && (
                    <div className="rounded-lg border border-sky-200/60 dark:border-sky-800/60 bg-sky-50 dark:bg-sky-950/30 px-3 py-2 text-[11px] text-sky-700 dark:text-sky-400">
                        Session existante reprise automatiquement (
                        {initialSession.products.length} ligne
                        {initialSession.products.length > 1 ? "s" : ""}). Les
                        modifications sont partagées avec tous les utilisateurs
                        autorisés.
                    </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
                    <div className="xl:col-span-7 space-y-4">
                        {/* Sélection du PO */}
                        <ReportSection index={1} title="Commande d'origine">
                            <div className="rounded-lg border border-border/60 bg-card shadow-2xs p-4">
                                {loading ? (
                                    <div className="py-6 text-center text-[11px] font-semibold text-muted-foreground animate-pulse">
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
                        </ReportSection>

                        {selectedPo && (
                            <GlobalParamsSection
                                logPurchaseOrders={logPurchaseOrders}
                                polog={polog}
                                onPologChange={setPolog}
                                dateChargement={dateChargement}
                                onDateChargementChange={setDateChargement}
                                departement={departement}
                            />
                        )}

                        {/* Formulaire produit */}
                        {selectedPo && (
                            <ProductFormSection
                                form={form}
                                departement={departement}
                                currentCodeRemise={currentCodeRemise}
                                odooProductCategories={odooProductCategories}
                                odooPosCategories={odooPosCategories}
                                onSubmit={handleAddProduct}
                                onKeyDown={handleFormKeyDown}
                                onFieldChange={handleFieldChange}
                                onFieldsUpdate={handleFieldsUpdate}
                            />
                        )}

                        {/* Tableau récapitulatif */}
                        {selectedPo && products.length > 0 && (
                            <ReportSection
                                index={4}
                                title={`Lignes enregistrées · ${products.length}`}
                            >
                                <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-[11px]">
                                            <thead className="bg-[#101c30] text-white">
                                                <tr>
                                                    <th className="px-3 py-2 font-bold uppercase tracking-wider text-[10px]">
                                                        Nom
                                                    </th>
                                                    <th className="px-3 py-2 font-bold uppercase tracking-wider text-[10px]">
                                                        Code HS
                                                    </th>
                                                    <th className="px-3 py-2 text-right font-bold uppercase tracking-wider text-[10px]">
                                                        Qté
                                                    </th>
                                                    <th className="px-3 py-2 text-right font-bold uppercase tracking-wider text-[10px]">
                                                        PU
                                                    </th>
                                                    <th className="px-3 py-2 text-right font-bold uppercase tracking-wider text-[10px]">
                                                        Coût calc.
                                                    </th>
                                                    <th className="px-3 py-2 text-center font-bold uppercase tracking-wider text-[10px] w-[50px]">
                                                        —
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                                {products.map((p) => (
                                                    <tr
                                                        key={p.id}
                                                        className="hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition-colors"
                                                    >
                                                        <td className="px-3 py-1.5 font-bold text-slate-800 dark:text-slate-200">
                                                            {p.nom}
                                                        </td>
                                                        <td className="px-3 py-1.5 text-muted-foreground font-mono">
                                                            {p.code_hs}
                                                        </td>
                                                        <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                                                            {p.quantity}
                                                        </td>
                                                        <td className="px-3 py-1.5 text-right font-mono tabular-nums text-muted-foreground">
                                                            ${p.pu}
                                                        </td>
                                                        <td className="px-3 py-1.5 text-right font-mono tabular-nums font-bold text-primary">
                                                            ${(p.pu * p.caa).toFixed(2)}
                                                        </td>
                                                        <td className="px-3 py-1.5 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleRemoveProduct(p.id)
                                                                }
                                                                className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 p-1 rounded-md transition-colors"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="px-3 py-2 border-t border-border/60 flex justify-end bg-muted/20">
                                        <Button
                                            onClick={handleExport}
                                            disabled={
                                                !polog.trim() || !dateChargement
                                            }
                                            size="sm"
                                            className="h-7 px-3 text-[11px] gap-1.5"
                                        >
                                            <DownloadCloud size={12} />
                                            Générer Excel (.xlsx)
                                        </Button>
                                    </div>
                                </div>
                            </ReportSection>
                        )}
                    </div>

                    {/* Métadonnées Odoo */}
                    <div className="xl:col-span-5 space-y-4">
                        <ReportSection index={5} title="Contrôle Odoo">
                            <div className="rounded-lg border border-border/60 bg-card shadow-2xs p-4">
                                {selectedPo ? (
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3 text-[11px]">
                                            <div className="p-2 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-lg shrink-0">
                                                <Hash size={14} />
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase block">
                                                    ID Externe
                                                </span>
                                                <span className="font-mono font-bold text-foreground truncate block">
                                                    {selectedPo.externalId}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 text-[11px]">
                                            <div className="p-2 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-lg shrink-0">
                                                <User size={14} />
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase block">
                                                    Fournisseur
                                                </span>
                                                <span className="font-bold text-foreground block truncate">
                                                    {selectedPo.supplierName}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                                                    ID : {selectedPo.supplierId}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 text-[11px]">
                                            <div className="p-2 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-lg shrink-0">
                                                <FileSpreadsheet size={14} />
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase block">
                                                    Réf Fournisseur
                                                </span>
                                                <span className="font-bold text-foreground block truncate">
                                                    {selectedPo.supplierRef || "N/D"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-8 text-center text-[11px] text-muted-foreground italic font-light">
                                        Sélectionnez un bon de commande pour
                                        visualiser les métadonnées.
                                    </div>
                                )}
                            </div>
                        </ReportSection>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Indicateur de sauvegarde ───────────────────────────────

function SaveIndicator({
    status,
    lastSavedAt,
}: {
    status: "idle" | "pending" | "saving" | "saved" | "error";
    lastSavedAt: Date | null;
}) {
    if (status === "idle") return null;

    const config: Record<
        Exclude<typeof status, "idle">,
        { Icon: typeof Cloud; tone: string; label: string; spin?: boolean }
    > = {
        pending: { Icon: Cloud, tone: "text-muted-foreground", label: "Modifs…" },
        saving: {
            Icon: Loader2,
            tone: "text-sky-500",
            label: "Sauvegarde…",
            spin: true,
        },
        saved: { Icon: CheckCircle2, tone: "text-emerald-500", label: "Sauvegardé" },
        error: { Icon: CloudOff, tone: "text-rose-500", label: "Erreur" },
    };

    const { Icon, tone, label, spin } = config[status];

    return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
            <Icon className={`w-3 h-3 ${tone} ${spin ? "animate-spin" : ""}`} />
            <span className={tone}>{label}</span>
            {status === "saved" && lastSavedAt && (
                <span className="text-muted-foreground/60 font-mono">
                    {lastSavedAt.toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </span>
            )}
        </span>
    );
}