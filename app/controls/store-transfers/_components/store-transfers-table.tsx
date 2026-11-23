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
    Check,
    CheckCircle2,
    Clock,
    Download,
    Eye,
    Search,
    Trash2,
    Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTablePagination } from "@/components/new-ui/table/data-table-pagination";
import type { StoreTransferRow, TransferFileMeta } from "../_lib/types";

const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const HEADER_BG =
    "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950";

type StatusTab = "all" | "ready" | "incomplete" | "validated";

interface StoreTransfersTableProps {
    data: StoreTransferRow[];
    canUploadDpOut: boolean;
    canUploadDpIn: boolean;
    canValidate: boolean;
    canUnvalidate: boolean;
    onUploadFile: (row: StoreTransferRow, kind: "dp_out" | "dp_in") => void;
    onPreviewFile: (row: StoreTransferRow, kind: "dp_out" | "dp_in", meta: TransferFileMeta) => void;
    onValidate: (row: StoreTransferRow) => void;
    onUnvalidate: (row: StoreTransferRow) => void;
}

export default function StoreTransfersTable({
    data,
    canUploadDpOut,
    canUploadDpIn,
    canValidate,
    canUnvalidate,
    onUploadFile,
    onPreviewFile,
    onValidate,
    onUnvalidate,
}: StoreTransfersTableProps) {
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState<StatusTab>("all");
    const [sorting, setSorting] = useState<SortingState>([]);

    const counts = useMemo(() => {
        let ready = 0;
        let incomplete = 0;
        let validated = 0;
        for (const r of data) {
            if (r.isValidated) validated += 1;
            else if (r.dpOut && r.dpIn) ready += 1;
            else incomplete += 1;
        }
        return { all: data.length, ready, incomplete, validated };
    }, [data]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return data.filter((r) => {
            if (tab === "validated" && !r.isValidated) return false;
            if (tab === "ready" && (r.isValidated || !r.dpOut || !r.dpIn)) return false;
            if (tab === "incomplete" && (r.isValidated || (r.dpOut && r.dpIn))) return false;
            if (!q) return true;
            return (
                r.saleOrderName.toLowerCase().includes(q) ||
                (r.generatedPo?.name.toLowerCase().includes(q) ?? false) ||
                r.destinationPartnerName.toLowerCase().includes(q) ||
                r.createdBy.toLowerCase().includes(q)
            );
        });
    }, [data, search, tab]);

    const renderFileCell = (
        row: StoreTransferRow,
        kind: "dp_out" | "dp_in",
        meta: TransferFileMeta | null,
        canUpload: boolean,
        tone: string,
    ) => {
        const canEdit = canUpload && (!row.isValidated || canUnvalidate);
        if (!meta) {
            return canEdit ? (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUploadFile(row, kind)}
                    className="h-6 px-2 text-[10px] gap-1"
                >
                    <Upload className="w-3 h-3" />
                    {kind === "dp_out" ? "DP/OUT" : "DP/IN"}
                </Button>
            ) : (
                <span className="text-muted-foreground/40">—</span>
            );
        }

        const dlUrl = `/api/controls/store-transfers/${row.saleOrderId}/file?kind=${kind}&download=1`;
        return (
            <div className="inline-flex items-center justify-center gap-1.5 max-w-[175px]">
                <button
                    type="button"
                    onClick={() => onPreviewFile(row, kind, meta)}
                    title={meta.fileName}
                    className={cn("inline-flex items-center gap-1 text-[10px] font-semibold hover:underline truncate", tone)}
                >
                    <Eye className="w-3 h-3 shrink-0" />
                    <span className="truncate">{meta.fileName}</span>
                </button>
                <a href={dlUrl} title="Télécharger" className={cn("shrink-0 hover:opacity-80", tone)}>
                    <Download className="w-3 h-3" />
                </a>
                {canEdit && (
                    <button
                        type="button"
                        onClick={() => onUploadFile(row, kind)}
                        className="text-[10px] text-muted-foreground hover:text-foreground underline shrink-0"
                    >
                        Maj
                    </button>
                )}
            </div>
        );
    };

    const columns = useMemo<ColumnDef<StoreTransferRow>[]>(
        () => [
            {
                accessorKey: "createdAt",
                header: "Date",
                cell: (info) => <span className="tabular-nums whitespace-nowrap">{info.getValue() as string}</span>,
            },
            {
                accessorKey: "saleOrderName",
                header: "Sale Order",
                cell: (info) => (
                    <span className="font-mono font-semibold text-foreground">{info.getValue() as string}</span>
                ),
            },
            {
                id: "generatedPo",
                accessorFn: (r) => r.generatedPo?.name ?? "",
                header: "PO Généré",
                cell: (info) => {
                    const po = info.row.original.generatedPo;
                    if (!po) return <span className="text-muted-foreground/40 italic">Non généré</span>;
                    return (
                        <div className="text-left">
                            <span className="font-mono font-semibold text-sky-600 dark:text-sky-400">
                                {po.name}
                            </span>
                            <span className="block text-[10px] text-muted-foreground truncate max-w-[140px]">
                                {po.companyName}
                            </span>
                        </div>
                    );
                },
            },
            {
                accessorKey: "destinationPartnerName",
                header: "Boutique Dest.",
                cell: (info) => (
                    <span className="block max-w-[160px] truncate" title={info.getValue() as string}>
                        {info.getValue() as string}
                    </span>
                ),
            },
            {
                accessorKey: "amountTotal",
                header: "Montant",
                cell: (info) => {
                    const r = info.row.original;
                    return (
                        <span className="font-mono tabular-nums font-semibold whitespace-nowrap">
                            {fmt(r.amountTotal)} {r.currency}
                        </span>
                    );
                },
            },
            {
                id: "dpOut",
                enableSorting: false,
                header: "DP/OUT",
                cell: (info) =>
                    renderFileCell(
                        info.row.original,
                        "dp_out",
                        info.row.original.dpOut,
                        canUploadDpOut,
                        "text-sky-600 dark:text-sky-400",
                    ),
            },
            {
                id: "dpIn",
                enableSorting: false,
                header: "DP/IN",
                cell: (info) =>
                    renderFileCell(
                        info.row.original,
                        "dp_in",
                        info.row.original.dpIn,
                        canUploadDpIn,
                        "text-violet-600 dark:text-violet-400",
                    ),
            },
            {
                id: "status",
                accessorFn: (r) => (r.isValidated ? 2 : r.dpOut && r.dpIn ? 1 : 0),
                header: "Statut",
                cell: (info) => {
                    const r = info.row.original;
                    if (r.isValidated) {
                        return (
                            <Badge
                                variant="outline"
                                title={r.validatedBy ? `Par ${r.validatedBy}` : undefined}
                                className="h-5 px-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60"
                            >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Validé
                            </Badge>
                        );
                    }
                    if (r.dpOut && r.dpIn) {
                        return (
                            <Badge
                                variant="outline"
                                className="h-5 px-1.5 text-[10px] font-semibold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200/60"
                            >
                                <Clock className="w-3 h-3 mr-1" />
                                À valider
                            </Badge>
                        );
                    }
                    return (
                        <Badge
                            variant="outline"
                            className="h-5 px-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60"
                        >
                            Incomplet
                        </Badge>
                    );
                },
            },
            {
                id: "actions",
                enableSorting: false,
                header: "Action",
                cell: (info) => {
                    const r = info.row.original;
                    if (r.isValidated) {
                        return canUnvalidate ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onUnvalidate(r)}
                                className="h-6 px-2 text-[10px] gap-1 text-rose-600 border-rose-200/60 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            >
                                <Trash2 className="w-3 h-3" />
                                Retirer
                            </Button>
                        ) : (
                            <span className="text-[10px] text-muted-foreground/60">Verrouillé</span>
                        );
                    }
                    if (!canValidate) {
                        return (
                            <span className="text-[10px] text-muted-foreground/60">
                                {r.dpOut && r.dpIn ? "Attente controller" : "Docs requis"}
                            </span>
                        );
                    }
                    const ready = Boolean(r.dpOut && r.dpIn);
                    return (
                        <Button
                            variant="default"
                            size="sm"
                            disabled={!ready}
                            title={ready ? "Valider le transfert" : "DP/OUT et DP/IN requis"}
                            onClick={() => onValidate(r)}
                            className="h-6 px-2.5 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40"
                        >
                            <Check className="w-3 h-3" />
                            Valider
                        </Button>
                    );
                },
            },
        ],
        [canUploadDpOut, canUploadDpIn, canValidate, canUnvalidate, onUploadFile, onPreviewFile, onValidate, onUnvalidate],
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
                    Aucun transfert inter-boutiques PB - BC sur la période sélectionnée.
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
                        placeholder="Rechercher SO, PO, boutique..."
                        className="w-full h-7 pl-8 pr-3 rounded-lg border border-border bg-card text-[11px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-0.5">
                    {(
                        [
                            { id: "all", label: `Tous (${counts.all})` },
                            { id: "ready", label: `À valider (${counts.ready})` },
                            { id: "incomplete", label: `Incomplets (${counts.incomplete})` },
                            { id: "validated", label: `Validés (${counts.validated})` },
                        ] as const
                    ).map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                                setTab(t.id);
                                table.setPageIndex(0);
                            }}
                            className={cn(
                                "px-2.5 py-1 rounded-md text-[10.5px] font-medium transition-colors",
                                tab === t.id
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {t.label}
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
                                                onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                                                className={cn(
                                                    "py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider h-auto select-none min-w-[90px]",
                                                    idx <= 3 ? "text-left" : idx === 4 ? "text-right" : "text-center",
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
                            {table.getRowModel().rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="py-8 text-center text-[11px] text-muted-foreground italic">
                                        Aucun transfert ne correspond à votre filtre.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow key={row.id} className="hover:bg-accent/30 transition-colors">
                                        {row.getVisibleCells().map((cell, idx) => (
                                            <TableCell
                                                key={cell.id}
                                                className={cn(
                                                    "py-2 px-3",
                                                    idx <= 3 ? "text-left" : idx === 4 ? "text-right" : "text-center",
                                                )}
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <DataTablePagination table={table} totalRows={filtered.length} rowLabel="transfert" />
            </div>
        </div>
    );
}