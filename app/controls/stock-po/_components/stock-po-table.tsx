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
import { Button } from "@/components/ui/button";
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    CheckCircle2,
    Clock,
    Download,
    Eye,
    FileSpreadsheet,
    FileText,
    Search,
    Trash2,
    Truck,
    Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTablePagination } from "@/components/new-ui/table/data-table-pagination";
import type { StockPoAttachmentMeta, StockPoRow } from "../_lib/types";

const HEADER_BG =
    "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950";

type PoFileField = "x_studio_fichier_excel_ca" | "x_studio_facture_fournisseur";

interface StockPoTableProps {
    data: StockPoRow[];
    canValidate: boolean;
    canUnvalidate: boolean;
    onOpenPickings: (row: StockPoRow) => void;
    onPreviewFile: (
        row: StockPoRow,
        field: PoFileField,
        meta: StockPoAttachmentMeta,
    ) => void;
    onValidate: (row: StockPoRow) => void;
    onUnvalidate: (row: StockPoRow) => void;
    onPreviewValidation: (row: StockPoRow) => void;
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
    field: PoFileField;
    meta: StockPoAttachmentMeta | null;
    icon: typeof FileSpreadsheet;
    tone: string;
    onPreview: StockPoTableProps["onPreviewFile"];
}) {
    if (!meta) {
        return <span className="text-muted-foreground/40">—</span>;
    }

    const lower = meta.fileName.toLowerCase();
    const isExcel =
        field === "x_studio_fichier_excel_ca" ||
        lower.endsWith(".xlsx") ||
        lower.endsWith(".xls") ||
        lower.endsWith(".csv") ||
        meta.mimeType.includes("spreadsheet") ||
        meta.mimeType.includes("excel") ||
        meta.mimeType.includes("csv");

    const isPdfOrImage =
        meta.mimeType === "application/pdf" ||
        meta.mimeType.startsWith("image/") ||
        lower.endsWith(".pdf") ||
        /\.(png|jpe?g|webp)$/i.test(lower) ||
        meta.mimeType === "application/octet-stream";

    const canPreview = isExcel || isPdfOrImage;
    const downloadUrl = `/api/controls/stock-po/${row.id}/file?field=${field}&download=1`;

    return (
        <div className="inline-flex items-center justify-center gap-2 max-w-[220px]">
            <Icon className={cn("w-3.5 h-3.5 shrink-0", tone)} />
            <span className="truncate text-[11px] font-medium" title={meta.fileName}>
                {meta.fileName}
            </span>
            {canPreview && (
                <button
                    type="button"
                    onClick={() => onPreview(row, field, meta)}
                    title={`Aperçu : ${meta.fileName}`}
                    className={cn(
                        "inline-flex items-center gap-0.5 text-[10px] font-semibold hover:underline shrink-0",
                        tone,
                    )}
                >
                    <Eye className="w-3 h-3" />
                    Voir
                </button>
            )}
            <a
                href={downloadUrl}
                title={`Télécharger : ${meta.fileName}`}
                className={cn("inline-flex items-center shrink-0 hover:opacity-80", tone)}
            >
                <Download className="w-3 h-3" />
            </a>
        </div>
    );
}

export default function StockPoTable({
    data,
    canValidate,
    canUnvalidate,
    onOpenPickings,
    onPreviewFile,
    onValidate,
    onUnvalidate,
    onPreviewValidation,
}: StockPoTableProps) {
    const [search, setSearch] = useState("");
    const [statusTab, setStatusTab] = useState<"all" | "validated" | "pending">("all");
    const [sorting, setSorting] = useState<SortingState>([]);

    const counts = useMemo(() => {
        const validated = data.filter((d) => d.isValidated).length;
        return {
            all: data.length,
            validated,
            pending: data.length - validated,
        };
    }, [data]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return data.filter((r) => {
            if (statusTab === "validated" && !r.isValidated) return false;
            if (statusTab === "pending" && r.isValidated) return false;
            if (!q) return true;
            return (
                r.name.toLowerCase().includes(q) ||
                r.partnerName.toLowerCase().includes(q) ||
                r.createdBy.toLowerCase().includes(q) ||
                r.pickings.some((p) => p.name.toLowerCase().includes(q)) ||
                (r.excelCaFile?.fileName.toLowerCase().includes(q) ?? false) ||
                (r.supplierInvoiceFile?.fileName.toLowerCase().includes(q) ?? false)
            );
        });
    }, [data, search, statusTab]);

    const columns = useMemo<ColumnDef<StockPoRow>[]>(
        () => [
            {
                accessorKey: "createdAt",
                header: "Créé le",
                cell: (info) => (
                    <span className="tabular-nums whitespace-nowrap">
                        {info.getValue() as string}
                    </span>
                ),
            },
            {
                accessorKey: "createdBy",
                header: "Créé par",
                cell: (info) => (
                    <span
                        className="block max-w-[140px] truncate"
                        title={info.getValue() as string}
                    >
                        {info.getValue() as string}
                    </span>
                ),
            },
            {
                accessorKey: "name",
                header: "N° PO",
                cell: (info) => (
                    <span className="font-mono font-semibold text-foreground whitespace-nowrap">
                        {info.getValue() as string}
                    </span>
                ),
            },
            {
                accessorKey: "partnerName",
                header: "Fournisseur",
                cell: (info) => (
                    <span
                        className="block max-w-[180px] truncate text-muted-foreground"
                        title={info.getValue() as string}
                    >
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
            {
                id: "validationStatus",
                accessorFn: (r) => (r.isValidated ? 1 : 0),
                header: "Statut",
                cell: (info) => {
                    const row = info.row.original;
                    return row.isValidated ? (
                        <Badge
                            variant="outline"
                            title={
                                row.validatedBy
                                    ? `Validé par ${row.validatedBy}`
                                    : undefined
                            }
                            className="h-5 px-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60"
                        >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Validé
                        </Badge>
                    ) : (
                        <Badge
                            variant="outline"
                            className="h-5 px-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60"
                        >
                            <Clock className="w-3 h-3 mr-1" />
                            En attente
                        </Badge>
                    );
                },
            },
            {
                id: "validationFile",
                enableSorting: false,
                header: "Justificatif",
                cell: (info) => {
                    const row = info.row.original;
                    if (!row.isValidated) {
                        return <span className="text-muted-foreground/40">—</span>;
                    }
                    return (
                        <div className="inline-flex items-center justify-center gap-2">
                            <button
                                type="button"
                                onClick={() => onPreviewValidation(row)}
                                title={row.validationFileName ?? undefined}
                                className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline text-[10px] font-semibold"
                            >
                                <Eye className="w-3 h-3" />
                                Voir
                            </button>
                            <a
                                href={`/api/controls/stock-po/${row.id}/validation-file?download=1`}
                                title={row.validationFileName ?? "Télécharger"}
                                className="text-sky-600 dark:text-sky-400 hover:opacity-80"
                            >
                                <Download className="w-3 h-3" />
                            </a>
                        </div>
                    );
                },
            },
            {
                id: "actions",
                enableSorting: false,
                header: "Action",
                cell: (info) => {
                    const row = info.row.original;
                    if (row.isValidated) {
                        return canUnvalidate ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onUnvalidate(row)}
                                className="h-6 px-2 text-[10px] gap-1 text-rose-600 border-rose-200/60 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            >
                                <Trash2 className="w-3 h-3" />
                                Retirer
                            </Button>
                        ) : (
                            <span className="text-[10px] text-muted-foreground/60">
                                Verrouillé
                            </span>
                        );
                    }
                    return canValidate ? (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => onValidate(row)}
                            className="h-6 px-2 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <Upload className="w-3 h-3" />
                            Valider
                        </Button>
                    ) : (
                        <span className="text-[10px] text-muted-foreground/60">
                            Lecture seule
                        </span>
                    );
                },
            },
        ],
        [
            canValidate,
            canUnvalidate,
            onOpenPickings,
            onPreviewFile,
            onValidate,
            onUnvalidate,
            onPreviewValidation,
        ],
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
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="relative w-full sm:w-80">
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            table.setPageIndex(0);
                        }}
                        placeholder="Rechercher PO, fournisseur, fichier, picking..."
                        className="w-full h-7 pl-8 pr-3 rounded-lg border border-border bg-card text-[11px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                </div>

                <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
                    {(
                        [
                            { id: "all", label: `Tous (${counts.all})` },
                            { id: "validated", label: `Validés (${counts.validated})` },
                            { id: "pending", label: `En attente (${counts.pending})` },
                        ] as const
                    ).map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                                setStatusTab(tab.id);
                                table.setPageIndex(0);
                            }}
                            className={cn(
                                "px-2.5 py-1 rounded-md text-[10.5px] font-medium transition-colors",
                                statusTab === tab.id
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
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
                                                onClick={
                                                    canSort
                                                        ? header.column.getToggleSortingHandler()
                                                        : undefined
                                                }
                                                className={cn(
                                                    "py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider h-auto select-none min-w-[95px]",
                                                    idx <= 3 ? "text-left" : "text-center",
                                                    canSort && "cursor-pointer hover:text-sky-300",
                                                    HEADER_BG,
                                                )}
                                            >
                                                <span className="inline-flex items-center gap-1">
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext(),
                                                    )}
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
                            {table.getRowModel().rows.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="py-8 text-center text-[11px] text-muted-foreground/70 italic"
                                    >
                                        Aucune commande ne correspond à votre filtre.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        className="hover:bg-accent/30 transition-colors"
                                    >
                                        {row.getVisibleCells().map((cell, idx) => (
                                            <TableCell
                                                key={cell.id}
                                                className={cn(
                                                    "py-2 px-3",
                                                    idx <= 3 ? "text-left" : "text-center",
                                                )}
                                            >
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext(),
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <DataTablePagination
                    table={table}
                    totalRows={filtered.length}
                    rowLabel="commande"
                />
            </div>
        </div>
    );
}