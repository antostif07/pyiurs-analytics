// app/inventory/audits/_components/audit-list-pdf.tsx
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
} from "@react-pdf/renderer";
import type { StockAudit } from "../_lib/types";

// ─────────────────────────────────────────────────────────────────────────
// Helpers (rendus côté client, Intl dispo)
// ─────────────────────────────────────────────────────────────────────────

const fmtUSD = (amount: number) =>
    new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(amount);

const fmtInt = (n: number) => n.toLocaleString("fr-FR");

function formatDate(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

interface FilterSummary {
    statusLabel: string;
    searchQuery: string;
}

interface AuditListPdfProps {
    audits: StockAudit[];
    filters: FilterSummary;
    totals: {
        total: number;
        active: number;
        pending: number;
        scanned: number;
        discrepancy: number;
    };
    generatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    page: {
        paddingTop: 30,
        paddingBottom: 40,
        paddingHorizontal: 30,
        fontSize: 8,
        fontFamily: "Helvetica",
        backgroundColor: "#ffffff",
        color: "#0f172a",
    },
    header: {
        marginBottom: 14,
        borderBottom: "2 solid #0f172a",
        paddingBottom: 8,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
    },
    headerLeft: { flex: 1 },
    title: { fontSize: 15, fontWeight: "bold", color: "#0f172a" },
    subtitle: { fontSize: 8.5, color: "#64748b", marginTop: 2 },
    headerRight: { alignItems: "flex-end" },
    generatedLabel: { fontSize: 7, color: "#94a3b8" },
    generatedValue: { fontSize: 8, color: "#0f172a", fontFamily: "Courier" },

    filterBar: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginBottom: 12,
    },
    filterChip: {
        paddingVertical: 3,
        paddingHorizontal: 7,
        borderRadius: 3,
        backgroundColor: "#f1f5f9",
        fontSize: 7,
        color: "#334155",
    },
    filterChipActive: {
        backgroundColor: "#ede9fe",
        color: "#7c3aed",
    },

    kpiRow: { flexDirection: "row", marginBottom: 14, gap: 6 },
    kpiCard: {
        flex: 1,
        padding: 8,
        backgroundColor: "#f8fafc",
        borderRadius: 4,
        borderLeft: "3 solid #8b5cf6",
    },
    kpiCardRose: { borderLeftColor: "#e11d48" },
    kpiCardEmerald: { borderLeftColor: "#059669" },
    kpiCardAmber: { borderLeftColor: "#d97706" },
    kpiCardSky: { borderLeftColor: "#0284c7" },
    kpiLabel: {
        fontSize: 6.5,
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 3,
    },
    kpiValue: { fontSize: 13, fontWeight: "bold", color: "#0f172a" },
    kpiHint: { fontSize: 6.5, color: "#94a3b8", marginTop: 2 },

    tableHeaderRow: {
        flexDirection: "row",
        backgroundColor: "#0f172a",
        paddingVertical: 6,
        paddingHorizontal: 4,
        borderRadius: 3,
    },
    tableHeaderCell: {
        fontSize: 6.5,
        fontWeight: "bold",
        color: "#ffffff",
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    tableRow: {
        flexDirection: "row",
        paddingVertical: 4.5,
        paddingHorizontal: 4,
        borderBottom: "0.5 solid #e2e8f0",
    },
    tableRowAlt: { backgroundColor: "#f8fafc" },
    tableCell: { fontSize: 7.5, color: "#0f172a" },
    tableCellMuted: { fontSize: 7.5, color: "#64748b" },
    tableCellMono: { fontSize: 7.5, color: "#0f172a", fontFamily: "Courier" },
    tableCellBold: { fontSize: 7.5, color: "#0f172a", fontFamily: "Courier", fontWeight: "bold" },

    // Colonnes
    colRef: { width: "14%" },
    colDate: { width: "11%" },
    colShop: { width: "16%" },
    colDept: { width: "10%" },
    colScans: { width: "8%", textAlign: "right" },
    colDiffQty: { width: "9%", textAlign: "right" },
    colDiffVal: { width: "12%", textAlign: "right" },
    colStatus: { width: "12%", textAlign: "center" },
    colTotal: { width: "8%", textAlign: "right" },

    posText: { color: "#059669" },
    negText: { color: "#e11d48" },
    mutedText: { color: "#94a3b8" },

    badge: {
        paddingVertical: 2,
        paddingHorizontal: 5,
        borderRadius: 2,
        fontSize: 6.5,
        textAlign: "center",
        alignSelf: "center",
    },
    badgeDraft: { backgroundColor: "#f1f5f9", color: "#475569" },
    badgeProgress: { backgroundColor: "#fef3c7", color: "#b45309" },
    badgeCompleted: { backgroundColor: "#e0f2fe", color: "#0369a1" },
    badgeValidated: { backgroundColor: "#d1fae5", color: "#047857" },

    emptyState: {
        paddingVertical: 40,
        textAlign: "center",
        color: "#94a3b8",
        fontStyle: "italic",
        fontSize: 8,
    },

    footer: {
        position: "absolute",
        bottom: 20,
        left: 30,
        right: 30,
        paddingTop: 6,
        borderTop: "0.5 solid #e2e8f0",
        flexDirection: "row",
        justifyContent: "space-between",
        fontSize: 6.5,
        color: "#94a3b8",
    },
});

// ─────────────────────────────────────────────────────────────────────────
// Label de statut
// ─────────────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
    draft: "Brouillon",
    in_progress: "Scan",
    completed: "À valider",
    validated: "Validé",
};

const STATUS_STYLE: Record<string, any> = {
    draft: styles.badgeDraft,
    in_progress: styles.badgeProgress,
    completed: styles.badgeCompleted,
    validated: styles.badgeValidated,
};

// ─────────────────────────────────────────────────────────────────────────
// Document
// ─────────────────────────────────────────────────────────────────────────

export function AuditListPdf({
    audits,
    filters,
    totals,
    generatedAt,
}: AuditListPdfProps) {
    return (
        <Document>
            <Page size="A4" orientation="landscape" style={styles.page}>
                {/* ─── Header ──────────────────────────────────────── */}
                <View style={styles.header} fixed>
                    <View style={styles.headerLeft}>
                        <Text style={styles.title}>
                            Audits & Inventaires Physiques
                        </Text>
                        <Text style={styles.subtitle}>
                            {totals.total} session
                            {totals.total > 1 ? "s" : ""} · Extraction au{" "}
                            {generatedAt}
                        </Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.generatedLabel}>RAPPORT</Text>
                        <Text style={styles.generatedValue}>PYIURS</Text>
                    </View>
                </View>

                {/* ─── Filtres actifs ─────────────────────────────── */}
                <View style={styles.filterBar}>
                    <View style={styles.filterChip}>
                        <Text>
                            Statut : {filters.statusLabel || "Tous"}
                        </Text>
                    </View>
                    {filters.searchQuery ? (
                        <View
                            style={[
                                styles.filterChip,
                                styles.filterChipActive,
                            ]}
                        >
                            <Text>Recherche : “{filters.searchQuery}”</Text>
                        </View>
                    ) : null}
                    <View style={styles.filterChip}>
                        <Text>
                            {audits.length} résultat
                            {audits.length > 1 ? "s" : ""}
                        </Text>
                    </View>
                </View>

                {/* ─── KPIs ────────────────────────────────────────── */}
                <View style={styles.kpiRow}>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>Sessions</Text>
                        <Text style={styles.kpiValue}>
                            {fmtInt(totals.total)}
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.kpiCard,
                            styles.kpiCardAmber,
                        ]}
                    >
                        <Text style={styles.kpiLabel}>En cours / Attente</Text>
                        <Text style={styles.kpiValue}>
                            {fmtInt(totals.active)}
                        </Text>
                        <Text style={styles.kpiHint}>
                            {totals.pending} à valider
                        </Text>
                    </View>
                    <View
                        style={[styles.kpiCard, styles.kpiCardSky]}
                    >
                        <Text style={styles.kpiLabel}>Unités scannées</Text>
                        <Text style={styles.kpiValue}>
                            {fmtInt(totals.scanned)}
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.kpiCard,
                            totals.discrepancy < 0
                                ? styles.kpiCardRose
                                : styles.kpiCardEmerald,
                        ]}
                    >
                        <Text style={styles.kpiLabel}>Démarque nette</Text>
                        <Text
                            style={[
                                styles.kpiValue,
                                totals.discrepancy < 0
                                    ? styles.negText
                                    : styles.posText,
                            ]}
                        >
                            {fmtUSD(totals.discrepancy)}
                        </Text>
                    </View>
                </View>

                {/* ─── Tableau ─────────────────────────────────────── */}
                {audits.length === 0 ? (
                    <Text style={styles.emptyState}>
                        Aucune session d'audit ne correspond aux filtres.
                    </Text>
                ) : (
                    <>
                        {/* En-tête du tableau — répété sur chaque page */}
                        <View style={styles.tableHeaderRow} fixed>
                            <Text
                                style={[
                                    styles.tableHeaderCell,
                                    styles.colRef,
                                ]}
                            >
                                Référence
                            </Text>
                            <Text
                                style={[
                                    styles.tableHeaderCell,
                                    styles.colDate,
                                ]}
                            >
                                Date
                            </Text>
                            <Text
                                style={[
                                    styles.tableHeaderCell,
                                    styles.colShop,
                                ]}
                            >
                                Boutique
                            </Text>
                            <Text
                                style={[
                                    styles.tableHeaderCell,
                                    styles.colDept,
                                ]}
                            >
                                Dép.
                            </Text>
                            <Text
                                style={[
                                    styles.tableHeaderCell,
                                    styles.colScans,
                                ]}
                            >
                                Scans
                            </Text>
                            <Text
                                style={[
                                    styles.tableHeaderCell,
                                    styles.colDiffQty,
                                ]}
                            >
                                Écart Qté
                            </Text>
                            <Text
                                style={[
                                    styles.tableHeaderCell,
                                    styles.colDiffVal,
                                ]}
                            >
                                Écart $
                            </Text>
                            <Text
                                style={[
                                    styles.tableHeaderCell,
                                    styles.colStatus,
                                ]}
                            >
                                Statut
                            </Text>
                            <Text
                                style={[
                                    styles.tableHeaderCell,
                                    styles.colTotal,
                                ]}
                            >
                                Articles
                            </Text>
                        </View>

                        {/* Lignes */}
                        {audits.map((a, idx) => {
                            const diffQty = a.total_discrepancy_qty ?? 0;
                            const diffVal =
                                Number(a.total_discrepancy_value) || 0;
                            const statusLabel =
                                STATUS_LABEL[a.status] ?? a.status;
                            const statusStyle =
                                STATUS_STYLE[a.status] ?? styles.badgeDraft;

                            return (
                                <View
                                    key={a.id}
                                    style={[
                                        styles.tableRow,
                                        idx % 2 === 1 ? styles.tableRowAlt : undefined,   // ⬅️ FIX
                                    ]}
                                    wrap={false}
                                >
                                    <Text
                                        style={[
                                            styles.tableCellMono,
                                            styles.colRef,
                                        ]}
                                    >
                                        {a.reference}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.tableCellMuted,
                                            styles.colDate,
                                        ]}
                                    >
                                        {formatDate(a.created_at)}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.tableCell,
                                            styles.colShop,
                                        ]}
                                    >
                                        {a.shop_name}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.tableCellMuted,
                                            styles.colDept,
                                        ]}
                                    >
                                        {a.department}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.tableCellBold,
                                            styles.colScans,
                                        ]}
                                    >
                                        {fmtInt(a.total_items_scanned ?? 0)}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.tableCellBold,
                                            styles.colDiffQty,
                                            diffQty < 0
                                                ? styles.negText
                                                : diffQty > 0
                                                    ? styles.posText
                                                    : styles.mutedText,
                                        ]}
                                    >
                                        {diffQty > 0 ? `+${diffQty}` : diffQty}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.tableCellBold,
                                            styles.colDiffVal,
                                            diffVal < 0
                                                ? styles.negText
                                                : diffVal > 0
                                                    ? styles.posText
                                                    : styles.mutedText,
                                        ]}
                                    >
                                        {diffVal > 0
                                            ? `+${fmtUSD(diffVal)}`
                                            : fmtUSD(diffVal)}
                                    </Text>
                                    <View style={styles.colStatus}>
                                        <Text
                                            style={[
                                                styles.badge,
                                                statusStyle,
                                            ]}
                                        >
                                            {statusLabel}
                                        </Text>
                                    </View>
                                    <Text
                                        style={[
                                            styles.tableCellBold,
                                            styles.colTotal,
                                        ]}
                                    >
                                        {a.total_items_scanned ?? 0}
                                    </Text>
                                </View>
                            );
                        })}
                    </>
                )}

                {/* ─── Footer ──────────────────────────────────────── */}
                <View style={styles.footer} fixed>
                    <Text>
                        Pyiurs Retail Intelligence · Audit des stocks
                    </Text>
                    <Text
                        render={({ pageNumber, totalPages }) =>
                            `Page ${pageNumber} / ${totalPages}`
                        }
                    />
                </View>
            </Page>
        </Document>
    );
}