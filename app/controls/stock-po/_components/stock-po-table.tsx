"use client";

import { useMemo, useState } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    flexRender,
    type ColumnDef,
    type SortingState,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Download,
    Eye,
    FileSpreadsheet,
    FileText,
    Search,
    Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTablePagination } from "@/components/new-ui/table/data-table-pagination";
import type { StockPoAttachmentMeta, StockPoRow } from "../_lib/types";

const HEADER_BG =
    "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950";

interface StockPoTableProps {
    data: StockPoRow[];
    onOpenPickings: (row: StockPoRow) => void;
    onPreviewFile: (row: StockPoRow, field: "x_studio_fichier_excel_ca" | "x_studio_facture_fournisseur", meta: StockPoAttachmentMeta) => void;
}

function FileActionCell({
    row,
    field,
    meta,
    icon: Icon,
    tone,
    onPreview,
}: {
    row: StockPoRow;
    field: "x_studio_fichier_excel_ca" | "x_studio_facture_fournisseur";
    meta: StockPoAttachmentMeta | null;
    icon: typeof FileSpreadsheet;
    tone: string;
    onPreview: StockPoTableProps["onPreviewFile"];
}) {
    if (!meta) {
        return <span className="text-muted-foreground/40">—</span>;
    }

    const isExcelField = field === "x_studio_fichier_excel_ca";
    const isGenericMime = !meta.mimeType || meta.mimeType === "application/octet-stream";
    const canPreviewInline =
        meta.mimeType === "application/pdf" ||
        meta.mimeType.startsWith("image/") ||
        (!isExcelField && isGenericMime);

    const downloadUrl = `/api/controls/stock-po/${row.id}/file?field=${field}&download=1`;
    const fallbackLabel = isExcelField ? "Excel CA" : "Facture";
    const displayName =
        meta.fileName && meta.fileName !== field ? meta.fileName : fallbackLabel;

    return (
        <div className="inline-flex items-center justify-center gap-2">
            {canPreviewInline && (
                <button
                    type="button"
                    onClick={() => onPreview(row, field, { ...meta, fileName: displayName })}
                    title={`Aperçu : ${displayName}`}
                    className={cn("inline-flex items-center gap-1 text-[10px] font-semibold hover:underline", tone)}
                >
                    <Eye className="w-3 h-3" />
                    Voir
                </button>
            )}
            <a
                href={downloadUrl}
                title={`Télécharger : ${displayName}`}
                className={cn("inline-flex items-center gap-1 text-[10px] font-semibold hover:underline", tone)}
            >
                <Icon className="w-3 h-3" />
                {!canPreviewInline ? displayName : <Download className="w-3 h-3" />}
            </a>
        </div>
    );
}

export default function StockPoTable({
    data,
    onOpenPickings,
    onPreviewFile,
}: StockPoTableProps) {
    const [search, setSearch] = useState("");
    const [sorting, setSorting] = useState<SortingState>([]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return data;
        return data.filter(
            (r) =>
                r.name.toLowerCase().includes(q) ||
                r.partnerName.toLowerCase().includes(q) ||
                r.createdBy.toLowerCase().includes(q) ||
                r.pickings.some((p) => p.name.toLowerCase().includes(q)),
        );
    }, [data, search]);

    const columns = useMemo<ColumnDef<StockPoRow>[]>(
        () => [
            {
                accessorKey: "createdAt",
                header: "Créé le",
                cell: (info) => (
                    <span className="tabular-nums whitespace-nowrap">{info.getValue() as string}</span>
                ),
            },
            {
                accessorKey: "createdBy",
                header: "Créé par",
                cell: (info) => (
                    <span className="block max-w-[150px] truncate" title={info.getValue() as string}>
                        {info.getValue() as string}
                    </span>
                ),
            },
            {
                accessorKey: "name",
                header: "N° PO",
                cell: (info) => (
                    <span className="font-mono font-semibold text-foreground">{info.getValue() as string}</span>
                ),
            },
            {
                accessorKey: "partnerName",
                header: "Fournisseur",
                cell: (info) => (
                    <span className="block max-w-[200px] truncate text-muted-foreground" title={info.getValue() as string}>
                        {info.getValue() as string}
                    </span>
                ),
            },
            {
                id: "excelCa",
                enableSorting: false,
                header: "Fichier Excel CA",
                cell: (info) => (
                    <FileActionCell
                        row={info.row.original}
                        field="x_studio_fichier_excel_ca"
                        meta={info.row.original.excelCaFile}
                        icon={FileSpreadsheet}
                        tone="text-emerald-600 dark:text-emerald-400"
                        onPreview={onPreviewFile}
                    />
                ),
            },
            {
                id: "supplierInvoice",
                enableSorting: false,
                header: "Facture Fournisseur",
                cell: (info) => (
                    <FileActionCell
                        row={info.row.original}
                        field="x_studio_facture_fournisseur"
                        meta={info.row.original.supplierInvoiceFile}
                        icon={FileText}
                        tone="text-sky-600 dark:text-sky-400"
                        onPreview={onPreviewFile}
                    />
                ),
            },
            {
                id: "pickings",
                accessorFn: (r) => r.pickings.length,
                header: "Stock Pickings",
                cell: (info) => {
                    const row = info.row.original;
                    if (row.pickings.length === 0) {
                        return <span className="text-muted-foreground/40">Aucun</span>;
                    }
                    const done = row.pickings.filter((p) => p.state === "done").length;
                    return (
                        <button
                            type="button"
                            onClick={() => onOpenPickings(row)}
                            className="inline-flex items-center gap-1.5"
                        >
                            <Badge
                                variant="outline"
                                className={cn(
                                    "h-5 px-2 text-[10px] font-semibold gap-1 cursor-pointer hover:bg-accent",
                                    done === row.pickings.length
                                        ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60"
                                        : "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60",
                                )}
                            >
                                <Truck className="w-3 h-3" />
                                {row.pickings.length} ({done} fait{done > 1 ? "s" : ""})
                            </Badge>
                        </button>
                    );
                },
            },
        ],
        [onOpenPickings, onPreviewFile],
    );

    const table = useReactTable({
        data: filtered,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 25 } },
    });

    if (data.length === 0) {
        return (
            <div className="rounded-lg border border-border/60 bg-card shadow-2xs p-8 text-center">
                <p className="text-[11px] text-muted-foreground/60 italic">
                    Aucun bon de commande P.BTY / P.FEM sur la période sélectionnée.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2.5">
            <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        table.setPageIndex(0);
                    }}
                    placeholder="Rechercher PO, fournisseur, créateur, picking..."
                    className="w-full h-7 pl-8 pr-3 rounded-lg border border-border bg-card text-[11px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
                />
            </div>

            <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="w-full text-[11px]">
                        <TableHeader className={HEADER_BG}>
                            {table.getHeaderGroups().map((hg) => (
                                <TableRow key={hg.id} className={cn("border-none", HEADER_BG)}>
                                    {hg.headers.map((header, idx) => {
                                        const canSort = header.column.getCanSort();
                                        const sorted = header.column.getIsSorted();
                                        return (
                                            <TableHead
                                                key={header.id}
                                                onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                                                className={cn(
                                                    "py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider h-auto select-none min-w-[100px]",
                                                    idx <= 3 ? "text-left" : "text-center",
                                                    canSort && "cursor-pointer hover:text-sky-300",
                                                    HEADER_BG,
                                                )}
                                            >
                                                <span className="inline-flex items-center gap-1">
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    {canSort &&
                                                        (sorted === "asc" ? (
                                                            <ArrowUp className="w-2.5 h-2.5" />
                                                        ) : sorted === "desc" ? (
                                                            <ArrowDown className="w-2.5 h-2.5" />
                                                        ) : (
                                                            <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                                                        ))}
                                                </span>
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>

                        <TableBody className="divide-y divide-border/40">
                            {table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} className="hover:bg-accent/30 transition-colors">
                                    {row.getVisibleCells().map((cell, idx) => (
                                        <TableCell
                                            key={cell.id}
                                            className={cn("py-2 px-3", idx <= 3 ? "text-left" : "text-center")}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <DataTablePagination table={table} totalRows={filtered.length} rowLabel="commande" />
            </div>
        </div>
    );
}