'use client';

import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
} from '@react-pdf/renderer';
import {
    StockAudit,
    StockAuditItem,
} from '@/app/inventory/audits/_lib/types';
import { aggregateByPosCategory, getFoundLocations, getPosCategoryIds, getSoldLocations, hasSoldElsewhere } from '../_lib/helpers';

const styles = StyleSheet.create({
    page: {
        padding: 25,
        fontSize: 8,
        fontFamily: 'Helvetica',
        backgroundColor: '#FFFFFF',
        color: '#0F172A',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1.5,
        borderBottomColor: '#0F172A',
        borderBottomStyle: 'solid',
        paddingBottom: 8,
        marginBottom: 10,
    },
    brandName: {
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        letterSpacing: 1.5,
        color: '#D97706',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    reportTitle: {
        fontSize: 13,
        fontFamily: 'Helvetica-Bold',
        color: '#0F172A',
        textTransform: 'uppercase',
    },
    metaText: {
        fontSize: 7,
        color: '#64748B',
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderStyle: 'solid',
    },
    badgeText: {
        fontSize: 7.5,
        fontFamily: 'Helvetica-Bold',
        color: '#0F172A',
        textTransform: 'uppercase',
    },
    kpiGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        borderRadius: 6,
        padding: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderStyle: 'solid',
    },
    kpiBox: {
        flexDirection: 'column',
        alignItems: 'center',
        flex: 1,
    },
    kpiLabel: {
        fontSize: 6,
        fontFamily: 'Helvetica-Bold',
        color: '#64748B',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    kpiValue: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#0F172A',
    },
    kpiValueLoss: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#E11D48',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingHorizontal: 2,
    },
    infoCol: {
        flexDirection: 'row',
        gap: 4,
    },
    infoLabel: {
        fontSize: 7,
        color: '#64748B',
    },
    infoValue: {
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        color: '#0F172A',
    },
    sectionTitle: {
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        color: '#0F172A',
        textTransform: 'uppercase',
        marginBottom: 6,
        marginTop: 4,
        paddingBottom: 2,
        borderBottomWidth: 0.5,
        borderBottomColor: '#CBD5E1',
    },
    sectionNote: {
        fontSize: 6.5,
        color: '#64748B',
        fontStyle: 'italic',
        marginBottom: 6,
    },
    table: {
        width: '100%',
        marginTop: 2,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#0F172A',
        paddingVertical: 4,
        paddingHorizontal: 5,
        borderRadius: 2,
        marginBottom: 2,
    },
    tableHeaderCell: {
        color: '#FFFFFF',
        fontSize: 6.5,
        fontFamily: 'Helvetica-Bold',
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 4,
        paddingHorizontal: 5,
        borderBottomWidth: 0.5,
        borderBottomColor: '#E2E8F0',
        borderBottomStyle: 'solid',
        alignItems: 'center',
    },
    tableRowZebra: {
        backgroundColor: '#F8FAFC',
    },
    tableRowTotal: {
        backgroundColor: '#FEF3C7',
        borderTopWidth: 1,
        borderTopColor: '#D97706',
        borderTopStyle: 'solid',
    },
    tableCell: {
        fontSize: 6.5,
        color: '#334155',
    },
    tableCellBold: {
        fontSize: 6.5,
        fontFamily: 'Helvetica-Bold',
        color: '#0F172A',
    },
    tableCellLoss: {
        fontSize: 6.5,
        fontFamily: 'Helvetica-Bold',
        color: '#E11D48',
    },
    tableCellGain: {
        fontSize: 6.5,
        fontFamily: 'Helvetica-Bold',
        color: '#16A34A',
    },
    tableCellMuted: {
        fontSize: 6.5,
        color: '#94A3B8',
        fontStyle: 'italic',
    },

    /* Styles pour les tableaux de synthèse Vendus / Trouvés */
    sectionSubtitle: {
        fontSize: 7,
        color: '#64748B',
        marginBottom: 4,
        marginTop: 2,
    },
    emptyBlock: {
        paddingVertical: 12,
        paddingHorizontal: 8,
        backgroundColor: '#F8FAFC',
        borderRadius: 4,
        borderWidth: 0.5,
        borderColor: '#E2E8F0',
        borderStyle: 'solid',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 7,
        color: '#64748B',
        textAlign: 'center',
        fontStyle: 'italic',
    },

    /* ─── Colonnes du tableau des écarts (page 1) ─── */
    colBarcode: { width: '20%' },
    colProduct: { width: '36%' },
    colLocation: { width: '16%' },
    colTheo: { width: '7%', textAlign: 'center' },
    colCounted: { width: '7%', textAlign: 'center' },
    colDiff: { width: '7%', textAlign: 'center' },
    colCost: { width: '7%', textAlign: 'right' },
    colProductWide: { width: '30%' },
    colLocWide: { width: '30%' },
    colQtySmall: { width: '10%', textAlign: 'center' },
    colValueSmall: { width: '15%', textAlign: 'right' },

    /* ─── Colonnes du tableau POS (page 2) ─── */
    posColCategory: { width: '30%' },
    // posColId: { width: '8%', textAlign: 'center' },
    posColTotal: { width: '11%', textAlign: 'center' },
    posColScanned: { width: '11%', textAlign: 'center' },
    posColRemaining: { width: '11%', textAlign: 'center' },
    posColSold: { width: '13%', textAlign: 'center' },
    posColDiffQty: { width: '11%', textAlign: 'center' },
    posColDiffValue: { width: '13%', textAlign: 'right' },

    /* ─── Barre visuelle de progression par catégorie ─── */
    posProgressWrap: {
        marginTop: 3,
        height: 3,
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
        overflow: 'hidden',
    },
    posProgressBar: {
        height: 3,
        backgroundColor: '#16A34A',
        borderRadius: 2,
    },

    signatureBlock: {
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    signatureBox: {
        width: '40%',
        borderTopWidth: 1,
        borderTopColor: '#0F172A',
        paddingTop: 4,
        alignItems: 'center',
    },
    signatureTitle: {
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        color: '#0F172A',
        textTransform: 'uppercase',
    },
    footer: {
        position: 'absolute',
        bottom: 15,
        left: 25,
        right: 25,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 0.5,
        borderTopColor: '#CBD5E1',
        borderTopStyle: 'solid',
        paddingTop: 4,
    },
    footerText: {
        fontSize: 6,
        color: '#94A3B8',
    },
    pageNumber: {
        fontSize: 6,
        color: '#64748B',
        fontFamily: 'Helvetica-Bold',
    },
});


/* ══════════════════════════════════════════════════════════════════ */
/* COMPOSANT                                                         */
/* ══════════════════════════════════════════════════════════════════ */

interface AuditReportPDFProps {
    audit: StockAudit;
    items: StockAuditItem[];
}

export const AuditReportPDF: React.FC<AuditReportPDFProps> = ({ audit, items }) => {
    const formatUSD = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(val);
    };

    const totalItems = items.length;
    const scannedItems = items.filter((i) => (i.counted_qty || 0) === 1).length;
    const remainingItems = totalItems - scannedItems;

    let totalDiffQty = 0;
    let totalDiffValue = 0;

    items.forEach((item) => {
        const diff = (item.counted_qty || 0) - (item.theoretical_qty || 0);
        totalDiffQty += diff;
        totalDiffValue += diff * (Number(item.unit_cost) || 0);
    });

    /* Filtrage anomalies (page 1) — max 300 lignes */
    const discrepancyItems = items
        .filter((item) => {
            const diff = (item.counted_qty || 0) - (item.theoretical_qty || 0);
            return diff !== 0;
        })
        .slice(0, 300);

    /* Agrégation POS (page 2) */
    const posAggregates = aggregateByPosCategory(items);
    const hasPosData = posAggregates.some((a) => a.id !== null);
    const distinctPosCount = posAggregates.filter((a) => a.id !== null).length;

    /* Totaux de la synthèse POS (pour ligne TOTAL) */
    const posTotals = posAggregates.reduce(
        (acc, agg) => ({
            totalItems: acc.totalItems + agg.totalItems,
            scannedItems: acc.scannedItems + agg.scannedItems,
            remainingItems: acc.remainingItems + agg.remainingItems,
            soldElsewhere: acc.soldElsewhere + agg.soldElsewhere,
            totalDiffQty: acc.totalDiffQty + agg.totalDiffQty,
            totalDiffValue: acc.totalDiffValue + agg.totalDiffValue,
        }),
        {
            totalItems: 0,
            scannedItems: 0,
            remainingItems: 0,
            soldElsewhere: 0,
            totalDiffQty: 0,
            totalDiffValue: 0,
        }
    );

    /* Produits vendus ailleurs (sold_locations non vide) */
    const soldElsewhereItems = items.filter((item) => hasSoldElsewhere(item));

    const soldElsewhereQty = soldElsewhereItems.length;
    const soldElsewhereValue = soldElsewhereItems.reduce(
        (acc, i) => acc + (Number(i.unit_cost) || 0),
        0
    );

    /* Produits hors périmètre (theoretical_qty = 0 + scanné) */
    const unexpectedItems = items.filter(
        (item) =>
            (item.theoretical_qty ?? 0) === 0 && (item.counted_qty ?? 0) === 1
    );

    const unexpectedQty = unexpectedItems.length;
    const unexpectedValue = unexpectedItems.reduce(
        (acc, i) => acc + (Number(i.unit_cost) || 0),
        0
    );

    const hasSoldElsewhereData = soldElsewhereItems.length > 0;
    const hasUnexpectedData = unexpectedItems.length > 0;

    const formattedDate = audit.created_at
        ? new Date(audit.created_at).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        })
        : new Date().toLocaleDateString('fr-FR');

    return (
        <Document title={`Rapport Audit ${audit.reference}`}>
            {/* ═══════════════════════════════════════════════════════ */}
            {/* PAGE 1 — RAPPORT PRINCIPAL (écarts et anomalies)       */}
            {/* ═══════════════════════════════════════════════════════ */}
            <Page size="A4" style={styles.page}>
                {/* EN-TÊTE */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.brandName}>Pyiurs Enterprise</Text>
                        <Text style={styles.reportTitle}>
                            Rapport Officiel de Démarque &amp; Écarts
                        </Text>
                        <Text style={styles.metaText}>Référence Audit : {audit.reference}</Text>
                    </View>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                            {audit.status === 'validated'
                                ? 'VALIDÉ & CLÔTURÉ'
                                : audit.status === 'completed'
                                    ? 'COMPTAGE TERMINÉ'
                                    : 'EN COURS'}
                        </Text>
                    </View>
                </View>

                {/* METADATA */}
                <View style={styles.infoRow}>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Boutique / Point de vente :</Text>
                        <Text style={styles.infoValue}>{audit.shop_name}</Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Périmètre :</Text>
                        <Text style={styles.infoValue}>{audit.department || 'Tous'}</Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Date d&apos;Audit :</Text>
                        <Text style={styles.infoValue}>{formattedDate}</Text>
                    </View>
                </View>

                {/* KPI GLOBAL */}
                <View style={styles.kpiGrid}>
                    <View style={styles.kpiBox}>
                        <Text style={styles.kpiLabel}>Total Référencés</Text>
                        <Text style={styles.kpiValue}>{totalItems}</Text>
                    </View>
                    <View style={styles.kpiBox}>
                        <Text style={styles.kpiLabel}>Scannés (1/1)</Text>
                        <Text style={styles.kpiValue}>{scannedItems}</Text>
                    </View>
                    <View style={styles.kpiBox}>
                        <Text style={styles.kpiLabel}>Non Scannés (Manquants)</Text>
                        <Text style={styles.kpiValue}>{remainingItems}</Text>
                    </View>
                    <View style={styles.kpiBox}>
                        <Text style={styles.kpiLabel}>Écart Qté Global</Text>
                        <Text style={totalDiffQty < 0 ? styles.kpiValueLoss : styles.kpiValue}>
                            {totalDiffQty}
                        </Text>
                    </View>
                    <View style={styles.kpiBox}>
                        <Text style={styles.kpiLabel}>Démarque Totale ($)</Text>
                        <Text style={totalDiffValue < 0 ? styles.kpiValueLoss : styles.kpiValue}>
                            {formatUSD(totalDiffValue)}
                        </Text>
                    </View>
                </View>

                {/* TABLEAU DES ÉCARTS */}
                <Text style={styles.sectionTitle}>
                    Détail des Écarts et Produits Non Conformes (
                    {discrepancyItems.length} lignes d&apos;anomalies)
                </Text>

                <View style={styles.table}>
                    <View style={styles.tableHeader} fixed>
                        <Text style={[styles.tableHeaderCell, styles.colBarcode]}>
                            Code-barres
                        </Text>
                        <Text style={[styles.tableHeaderCell, styles.colProduct]}>
                            Produit Odoo
                        </Text>
                        <Text style={[styles.tableHeaderCell, styles.colLocation]}>
                            Emplacement
                        </Text>
                        <Text style={[styles.tableHeaderCell, styles.colTheo]}>Théo.</Text>
                        <Text style={[styles.tableHeaderCell, styles.colCounted]}>
                            Compté
                        </Text>
                        <Text style={[styles.tableHeaderCell, styles.colDiff]}>Écart</Text>
                        <Text style={[styles.tableHeaderCell, styles.colCost]}>
                            Impact ($)
                        </Text>
                    </View>

                    {discrepancyItems.length === 0 ? (
                        <View style={styles.tableRow}>
                            <Text
                                style={[
                                    styles.tableCell,
                                    { width: '100%', textAlign: 'center', paddingVertical: 10 },
                                ]}
                            >
                                🎉 Aucun écart détecté ! L&apos;inventaire physique est à 100%
                                conforme au stock Odoo.
                            </Text>
                        </View>
                    ) : (
                        discrepancyItems.map((item, index) => {
                            const counted = item.counted_qty ?? 0;
                            const theoretical = item.theoretical_qty ?? 0;
                            const diff = counted - theoretical;
                            const impact = diff * (Number(item.unit_cost) || 0);

                            return (
                                <View
                                    key={item.id || index}
                                    style={[
                                        styles.tableRow,
                                        index % 2 === 1 ? styles.tableRowZebra : {},
                                    ]}
                                    wrap={false}
                                >
                                    <Text
                                        style={[
                                            styles.tableCellBold,
                                            styles.colBarcode,
                                        ]}
                                    >
                                        {item.internal_barcode}
                                    </Text>
                                    <Text style={[styles.tableCell, styles.colProduct]}>
                                        {item.product_name}
                                    </Text>
                                    <Text style={[styles.tableCell, styles.colLocation]}>
                                        {(() => {
                                            const soldLocs = getSoldLocations(item);
                                            const foundLocs = getFoundLocations(item);
                                            if (soldLocs.length > 0) {
                                                return `Vendu: ${soldLocs.map((l) => l.name).join(", ")}`;
                                            }
                                            if ((item.theoretical_qty ?? 0) === 0 && foundLocs.length > 0) {
                                                return `Trouvé: ${foundLocs.map((l) => l.name).join(", ")}`;
                                            }
                                            return item.supplier_ref || 'Stock Principal';
                                        })()}
                                    </Text>
                                    <Text style={[styles.tableCell, styles.colTheo]}>
                                        {theoretical}
                                    </Text>
                                    <Text style={[styles.tableCellBold, styles.colCounted]}>
                                        {counted}
                                    </Text>
                                    <Text
                                        style={[
                                            diff < 0
                                                ? styles.tableCellLoss
                                                : styles.tableCell,
                                            styles.colDiff,
                                        ]}
                                    >
                                        {diff > 0 ? `+${diff}` : diff}
                                    </Text>
                                    <Text
                                        style={[
                                            diff < 0
                                                ? styles.tableCellLoss
                                                : styles.tableCell,
                                            styles.colCost,
                                        ]}
                                    >
                                        {formatUSD(impact)}
                                    </Text>
                                </View>
                            );
                        })
                    )}
                </View>

                {/* SIGNATURES (page 1 uniquement) */}
                <View style={styles.signatureBlock} wrap={false}>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureTitle}>
                            Signature Responsable Boutique
                        </Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureTitle}>
                            Signature Direction Financière / Audit
                        </Text>
                    </View>
                </View>

                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        Document Officiel d&apos;Audit Financier • Confidentiel
                    </Text>
                    <Text
                        style={styles.pageNumber}
                        render={({ pageNumber, totalPages }) =>
                            `Page ${pageNumber} sur ${totalPages}`
                        }
                    />
                </View>
            </Page>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* PAGE 2 — ANNEXE : SYNTHÈSE PAR CATÉGORIE POS           */}
            {/* ═══════════════════════════════════════════════════════ */}
            {hasPosData && (
                <Page size="A4" style={styles.page}>
                    {/* EN-TÊTE */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.brandName}>
                                Pyiurs Enterprise
                            </Text>
                            <Text style={styles.reportTitle}>
                                Annexe • Synthèse par Catégorie POS
                            </Text>
                            <Text style={styles.metaText}>
                                Référence Audit : {audit.reference} • {audit.shop_name}
                            </Text>
                        </View>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                                {distinctPosCount} CATÉGORIE{distinctPosCount > 1 ? 'S' : ''}
                            </Text>
                        </View>
                    </View>

                    {/* KPI POS GLOBAUX */}
                    <View style={styles.kpiGrid}>
                        <View style={styles.kpiBox}>
                            <Text style={styles.kpiLabel}>Catégories POS</Text>
                            <Text style={styles.kpiValue}>{distinctPosCount}</Text>
                        </View>
                        <View style={styles.kpiBox}>
                            <Text style={styles.kpiLabel}>Items Catégorisés</Text>
                            <Text style={styles.kpiValue}>
                                {
                                    items.filter(
                                        (i) => getPosCategoryIds(i).length > 0
                                    ).length
                                }
                            </Text>
                        </View>
                        <View style={styles.kpiBox}>
                            <Text style={styles.kpiLabel}>Items Non Catégorisés</Text>
                            <Text style={styles.kpiValue}>
                                {
                                    items.filter(
                                        (i) => getPosCategoryIds(i).length === 0
                                    ).length
                                }
                            </Text>
                        </View>
                        <View style={styles.kpiBox}>
                            <Text style={styles.kpiLabel}>Écart Qté Global</Text>
                            <Text
                                style={
                                    totalDiffQty < 0
                                        ? styles.kpiValueLoss
                                        : styles.kpiValue
                                }
                            >
                                {totalDiffQty}
                            </Text>
                        </View>
                        <View style={styles.kpiBox}>
                            <Text style={styles.kpiLabel}>Démarque Totale ($)</Text>
                            <Text
                                style={
                                    totalDiffValue < 0
                                        ? styles.kpiValueLoss
                                        : styles.kpiValue
                                }
                            >
                                {formatUSD(totalDiffValue)}
                            </Text>
                        </View>
                    </View>

                    {/* NOTE EXPLICATIVE */}
                    <Text style={styles.sectionNote}>
                        Les items appartenant à plusieurs catégories POS sont comptés dans
                        chacune d&apos;elles. La somme des « Total Articles » peut donc
                        dépasser le nombre réel d&apos;items de l&apos;audit.
                    </Text>

                    {/* TABLEAU SYNTHÈSE POS */}
                    <Text style={styles.sectionTitle}>
                        Répartition des Écarts par Catégorie POS
                    </Text>

                    <View style={styles.table}>
                        <View style={styles.tableHeader} fixed>
                            <Text
                                style={[styles.tableHeaderCell, styles.posColCategory]}
                            >
                                Catégorie POS
                            </Text>
                            <Text style={[styles.tableHeaderCell, styles.posColTotal]}>
                                Total
                            </Text>
                            <Text
                                style={[styles.tableHeaderCell, styles.posColScanned]}
                            >
                                Scannés
                            </Text>
                            <Text
                                style={[styles.tableHeaderCell, styles.posColRemaining]}
                            >
                                Restants
                            </Text>
                            <Text style={[styles.tableHeaderCell, styles.posColSold]}>
                                Vendus (-1)
                            </Text>
                            <Text
                                style={[styles.tableHeaderCell, styles.posColDiffQty]}
                            >
                                Écart Qté
                            </Text>
                            <Text
                                style={[styles.tableHeaderCell, styles.posColDiffValue]}
                            >
                                Écart ($)
                            </Text>
                        </View>

                        {posAggregates.map((agg, index) => {
                            const progress =
                                agg.totalItems > 0
                                    ? Math.round(
                                        (agg.scannedItems / agg.totalItems) * 100
                                    )
                                    : 0;
                            const isUncategorized = agg.id === null;

                            return (
                                <View
                                    key={`pos-${agg.id ?? 'uncat'}`}
                                    style={[
                                        styles.tableRow,
                                        index % 2 === 1 ? styles.tableRowZebra : {},
                                    ]}
                                    wrap={false}
                                >
                                    <View style={[styles.posColCategory]}>
                                        <Text
                                            style={
                                                isUncategorized
                                                    ? styles.tableCellMuted
                                                    : styles.tableCellBold
                                            }
                                        >
                                            {agg.name}
                                        </Text>
                                        {/* Barre de progression visuelle */}
                                        <View style={styles.posProgressWrap}>
                                            <View
                                                style={[
                                                    styles.posProgressBar,
                                                    { width: `${progress}%` },
                                                ]}
                                            />
                                        </View>
                                    </View>
                                    <Text
                                        style={[
                                            styles.tableCell,
                                            styles.posColTotal,
                                        ]}
                                    >
                                        {agg.totalItems}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.tableCellBold,
                                            styles.posColScanned,
                                        ]}
                                    >
                                        {agg.scannedItems}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.tableCell,
                                            styles.posColRemaining,
                                        ]}
                                    >
                                        {agg.remainingItems}
                                    </Text>
                                    <Text
                                        style={[
                                            agg.soldElsewhere > 0
                                                ? styles.tableCellLoss
                                                : styles.tableCell,
                                            styles.posColSold,
                                        ]}
                                    >
                                        {agg.soldElsewhere}
                                    </Text>
                                    <Text
                                        style={[
                                            agg.totalDiffQty < 0
                                                ? styles.tableCellLoss
                                                : styles.tableCell,
                                            styles.posColDiffQty,
                                        ]}
                                    >
                                        {agg.totalDiffQty > 0
                                            ? `+${agg.totalDiffQty}`
                                            : agg.totalDiffQty}
                                    </Text>
                                    <Text
                                        style={[
                                            agg.totalDiffValue < 0
                                                ? styles.tableCellLoss
                                                : styles.tableCell,
                                            styles.posColDiffValue,
                                        ]}
                                    >
                                        {formatUSD(agg.totalDiffValue)}
                                    </Text>
                                </View>
                            );
                        })}

                        {/* LIGNE TOTAL */}
                        <View
                            style={[styles.tableRow, styles.tableRowTotal]}
                            wrap={false}
                        >
                            <Text
                                style={[styles.tableCellBold, styles.posColCategory]}
                            >
                                TOTAL GÉNÉRAL
                            </Text>
                            <Text
                                style={[styles.tableCellBold, styles.posColTotal]}
                            >
                                {posTotals.totalItems}
                            </Text>
                            <Text
                                style={[
                                    styles.tableCellBold,
                                    styles.posColScanned,
                                ]}
                            >
                                {posTotals.scannedItems}
                            </Text>
                            <Text
                                style={[
                                    styles.tableCellBold,
                                    styles.posColRemaining,
                                ]}
                            >
                                {posTotals.remainingItems}
                            </Text>
                            <Text
                                style={[
                                    posTotals.soldElsewhere > 0
                                        ? styles.tableCellLoss
                                        : styles.tableCellBold,
                                    styles.posColSold,
                                ]}
                            >
                                {posTotals.soldElsewhere}
                            </Text>
                            <Text
                                style={[
                                    posTotals.totalDiffQty < 0
                                        ? styles.tableCellLoss
                                        : styles.tableCellBold,
                                    styles.posColDiffQty,
                                ]}
                            >
                                {posTotals.totalDiffQty > 0
                                    ? `+${posTotals.totalDiffQty}`
                                    : posTotals.totalDiffQty}
                            </Text>
                            <Text
                                style={[
                                    posTotals.totalDiffValue < 0
                                        ? styles.tableCellLoss
                                        : styles.tableCellBold,
                                    styles.posColDiffValue,
                                ]}
                            >
                                {formatUSD(posTotals.totalDiffValue)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.footer} fixed>
                        <Text style={styles.footerText}>
                            Annexe Synthèse POS • Document Confidentiel
                        </Text>
                        <Text
                            style={styles.pageNumber}
                            render={({ pageNumber, totalPages }) =>
                                `Page ${pageNumber} sur ${totalPages}`
                            }
                        />
                    </View>
                </Page>
            )}
            {/* ═══════════════════════════════════════════════════════ */}
            {/* PAGE 3 — PRODUITS VENDUS AILLEURS                      */}
            {/* ═══════════════════════════════════════════════════════ */}
            {hasSoldElsewhereData && (
                <Page size="A4" style={styles.page}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.brandName}>Pyiurs Enterprise</Text>
                            <Text style={styles.reportTitle}>
                                Annexe • Produits Vendus Ailleurs
                            </Text>
                            <Text style={styles.metaText}>
                                Référence Audit : {audit.reference} • {audit.shop_name}
                            </Text>
                        </View>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                                {soldElsewhereQty} PRODUIT{soldElsewhereQty > 1 ? 'S' : ''}
                            </Text>
                        </View>
                    </View>

                    {/* KPI */}
                    <View style={styles.kpiGrid}>
                        <View style={styles.kpiBox}>
                            <Text style={styles.kpiLabel}>Total Produits</Text>
                            <Text style={styles.kpiValue}>{soldElsewhereQty}</Text>
                        </View>
                        <View style={styles.kpiBox}>
                            <Text style={styles.kpiLabel}>Quantité Totale</Text>
                            <Text style={styles.kpiValue}>{soldElsewhereQty}</Text>
                        </View>
                        <View style={styles.kpiBox}>
                            <Text style={styles.kpiLabel}>Valeur Estimée ($)</Text>
                            <Text style={styles.kpiValue}>{formatUSD(soldElsewhereValue)}</Text>
                        </View>
                    </View>

                    <Text style={styles.sectionNote}>
                        Ces produits ont été détectés dans un ou plusieurs emplacements
                        négatifs (stocks -1) dans Odoo. Un transfert depuis notre stock
                        vers chaque emplacement est requis.
                    </Text>

                    <Text style={styles.sectionTitle}>
                        Liste des Produits Vendus Ailleurs
                    </Text>

                    <View style={styles.table}>
                        <View style={styles.tableHeader} fixed>
                            <Text style={[styles.tableHeaderCell, { width: '18%' }]}>
                                Code-barres
                            </Text>
                            <Text style={[styles.tableHeaderCell, { width: '30%' }]}>
                                Produit
                            </Text>
                            <Text style={[styles.tableHeaderCell, { width: '34%' }]}>
                                Emplacements Vendus (-1)
                            </Text>
                            <Text style={[styles.tableHeaderCell, { width: '10%', textAlign: 'center' }]}>
                                Qté
                            </Text>
                            <Text style={[styles.tableHeaderCell, { width: '8%', textAlign: 'right' }]}>
                                Coût
                            </Text>
                        </View>

                        {soldElsewhereItems.map((item, index) => {
                            const soldLocs = getSoldLocations(item);
                            const cost = Number(item.unit_cost) || 0;
                            return (
                                <View
                                    key={item.id || index}
                                    style={[
                                        styles.tableRow,
                                        index % 2 === 1 ? styles.tableRowZebra : {},
                                    ]}
                                    wrap={false}
                                >
                                    <Text style={[styles.tableCellBold, { width: '18%' }]}>
                                        {item.internal_barcode}
                                    </Text>
                                    <Text style={[styles.tableCell, { width: '30%' }]}>
                                        {item.product_name}
                                    </Text>
                                    <Text style={[styles.tableCell, { width: '34%' }]}>
                                        {soldLocs
                                            .map((l) => `[${l.id}] ${l.name}`)
                                            .join(', ')}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.tableCellBold,
                                            { width: '10%', textAlign: 'center' },
                                        ]}
                                    >
                                        {soldLocs.length}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.tableCell,
                                            { width: '8%', textAlign: 'right' },
                                        ]}
                                    >
                                        {formatUSD(cost)}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>

                    <View style={styles.footer} fixed>
                        <Text style={styles.footerText}>
                            Annexe Vendus Ailleurs • Document Confidentiel
                        </Text>
                        <Text
                            style={styles.pageNumber}
                            render={({ pageNumber, totalPages }) =>
                                `Page ${pageNumber} sur ${totalPages}`
                            }
                        />
                    </View>
                </Page>
            )}
            {/* ═══════════════════════════════════════════════════════ */}
            {/* PAGE 4 — PRODUITS HORS PÉRIMÈTRE                       */}
            {/* ═══════════════════════════════════════════════════════ */}
            {hasUnexpectedData && (
                <Page size="A4" style={styles.page}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.brandName}>Pyiurs Enterprise</Text>
                            <Text style={styles.reportTitle}>
                                Annexe • Produits Hors Périmètre
                            </Text>
                            <Text style={styles.metaText}>
                                Référence Audit : {audit.reference} • {audit.shop_name}
                            </Text>
                        </View>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                                {unexpectedQty} PRODUIT{unexpectedQty > 1 ? 'S' : ''}
                            </Text>
                        </View>
                    </View>

                    {/* KPI */}
                    <View style={styles.kpiGrid}>
                        <View style={styles.kpiBox}>
                            <Text style={styles.kpiLabel}>Total Produits</Text>
                            <Text style={styles.kpiValue}>{unexpectedQty}</Text>
                        </View>
                        <View style={styles.kpiBox}>
                            <Text style={styles.kpiLabel}>Quantité Totale</Text>
                            <Text style={styles.kpiValue}>{unexpectedQty}</Text>
                        </View>
                        <View style={styles.kpiBox}>
                            <Text style={styles.kpiLabel}>Valeur Estimée ($)</Text>
                            <Text style={styles.kpiValue}>{formatUSD(unexpectedValue)}</Text>
                        </View>
                    </View>

                    <Text style={styles.sectionNote}>
                        Ces produits ont été physiquement trouvés lors de l&apos;audit mais
                        n&apos;étaient pas dans le stock théorique de la boutique. Une
                        intégration au stock Odoo est requise (source : emplacements
                        positifs détectés).
                    </Text>

                    <Text style={styles.sectionTitle}>
                        Liste des Produits Hors Périmètre
                    </Text>

                    <View style={styles.table}>
                        <View style={styles.tableHeader} fixed>
                            <Text style={[styles.tableHeaderCell, { width: '18%' }]}>
                                Code-barres
                            </Text>
                            <Text style={[styles.tableHeaderCell, { width: '30%' }]}>
                                Produit
                            </Text>
                            <Text style={[styles.tableHeaderCell, { width: '34%' }]}>
                                Trouvé Dans (Stock Positif)
                            </Text>
                            <Text style={[styles.tableHeaderCell, { width: '10%', textAlign: 'center' }]}>
                                Qté
                            </Text>
                            <Text style={[styles.tableHeaderCell, { width: '8%', textAlign: 'right' }]}>
                                Coût
                            </Text>
                        </View>

                        {unexpectedItems.map((item, index) => {
                            const foundLocs = getFoundLocations(item);
                            const cost = Number(item.unit_cost) || 0;
                            return (
                                <View
                                    key={item.id || index}
                                    style={[
                                        styles.tableRow,
                                        index % 2 === 1 ? styles.tableRowZebra : {},
                                    ]}
                                    wrap={false}
                                >
                                    <Text style={[styles.tableCellBold, { width: '18%' }]}>
                                        {item.internal_barcode}
                                    </Text>
                                    <Text style={[styles.tableCell, { width: '30%' }]}>
                                        {item.product_name}
                                    </Text>
                                    <Text style={[styles.tableCell, { width: '34%' }]}>
                                        {foundLocs.length > 0
                                            ? foundLocs
                                                .map(
                                                    (l) =>
                                                        `[${l.id}] ${l.name}${l.quantity > 1 ? ` ×${l.quantity}` : ''}`
                                                )
                                                .join(', ')
                                            : '—'}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.tableCellBold,
                                            { width: '10%', textAlign: 'center' },
                                        ]}
                                    >
                                        {item.counted_qty ?? 1}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.tableCell,
                                            { width: '8%', textAlign: 'right' },
                                        ]}
                                    >
                                        {formatUSD(cost)}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>

                    <View style={styles.footer} fixed>
                        <Text style={styles.footerText}>
                            Annexe Hors Périmètre • Document Confidentiel
                        </Text>
                        <Text
                            style={styles.pageNumber}
                            render={({ pageNumber, totalPages }) =>
                                `Page ${pageNumber} sur ${totalPages}`
                            }
                        />
                    </View>
                </Page>
            )}
        </Document>
    );
};