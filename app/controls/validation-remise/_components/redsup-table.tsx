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
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Check,
    CheckCircle2,
    Clock,
    Eye,
    Image as ImageIcon,
    List,
    Loader2,
    Search,
    Trash2,
    Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTablePagination } from "@/components/new-ui/table/data-table-pagination";
import type { RedsupInvoiceRow } from "../_lib/types";

const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const HEADER_BG =
    "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950";

type StatusTab = "all" | "ready" | "no_photo" | "validated";

interface RedsupTableProps {
    data: RedsupInvoiceRow[];
    canAttachPhoto: boolean;
    canValidate: boolean;
    canUnvalidate: boolean; // admin uniquement
    validatingOrderId: number | null;
    onAttachPhoto: (invoice: RedsupInvoiceRow) => void;
    onValidate: (invoice: RedsupInvoiceRow) => void;
    onUnvalidate: (invoice: RedsupInvoiceRow) => void;
    onViewDetails: (invoice: RedsupInvoiceRow) => void;
    onViewPhoto: (invoice: RedsupInvoiceRow) => void;
}

export default function RedsupTable({
    data,
    canAttachPhoto,
    canValidate,
    canUnvalidate,
    validatingOrderId,
    onAttachPhoto,
    onValidate,
    onUnvalidate,
    onViewDetails,
    onViewPhoto,
}: RedsupTableProps) {
    const [search, setSearch] = useState("");
    const [statusTab, setStatusTab] = useState<StatusTab>("all");
    const [sorting, setSorting] = useState<SortingState>([]);

    const counts = useMemo(() => {
        let ready = 0;
        let noPhoto = 0;
        let validated = 0;
        for (const r of data) {
            if (r.isValidated) validated += 1;
            else if (r.hasPhoto) ready += 1;
            else noPhoto += 1;
        }
        return { all: data.length, ready, noPhoto, validated };
    }, [data]);

    const filteredData = useMemo(() => {
        const q = search.trim().toLowerCase();
        return data.filter((row) => {
            if (statusTab === "validated" && !row.isValidated) return false;
            if (statusTab === "ready" && (row.isValidated || !row.hasPhoto)) return false;
            if (statusTab === "no_photo" && (row.isValidated || row.hasPhoto)) return false;
            if (!q) return true;
            return (
                row.orderName.toLowerCase().includes(q) ||
                row.partnerName.toLowerCase().includes(q) ||
                row.posName.toLowerCase().includes(q)
            );
        });
    }, [data, search, statusTab]);

    const totals = useMemo(() => {
        const totalAmount = filteredData.reduce((s, i) => s + i.totalRedsupAmount, 0);
        const totalQty = filteredData.reduce((s, i) => s + i.totalRedsupQty, 0);
        const validatedCount = filteredData.filter((i) => i.isValidated).length;
        return { totalAmount, totalQty, validatedCount };
    }, [filteredData]);

    const columns = useMemo<ColumnDef<RedsupInvoiceRow>[]>(
        () => [
            {
                accessorKey: "date",
                header: "Date",
                cell: (info) => (
                    <span className="tabular-nums whitespace-nowrap">{info.getValue() as string}</span>
                ),
            },
            {
                accessorKey: "orderName",
                header: "N° Commande",
                cell: (info) => (
                    <span className="font-mono font-semibold text-foreground">{info.getValue() as string}</span>
                ),
            },
            {
                accessorKey: "partnerName",
                header: "Client",
                cell: (info) => (
                    <span className="block max-w-[160px] truncate" title={info.getValue() as string}>
                        {info.getValue() as string}
                    </span>
                ),
            },
            {
                accessorKey: "posName",
                header: "POS",
                cell: (info) => <span className="text-muted-foreground">{info.getValue() as string}</span>,
            },
            {
                accessorKey: "lineCount",
                header: "Articles",
                cell: (info) => {
                    const row = info.row.original;
                    return (
                        <button
                            type="button"
                            onClick={() => onViewDetails(row)}
                            className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 dark:text-sky-400 text-[11px] font-semibold"
                        >
                            <List className="w-3 h-3" />
                            {row.lineCount} ligne{row.lineCount > 1 ? "s" : ""}
                        </button>
                    );
                },
            },
            {
                accessorKey: "totalRedsupQty",
                header: "Qté",
                cell: (info) => <span className="font-mono tabular-nums">{info.getValue() as number}</span>,
            },
            {
                accessorKey: "totalRedsupAmount",
                header: "Montant RedSup",
                cell: (info) => (
                    <span className="font-mono tabular-nums font-semibold whitespace-nowrap">
                        {fmt(info.getValue() as number)} $
                    </span>
                ),
            },
            {
                id: "photo",
                enableSorting: false,
                header: "Autorisation",
                cell: (info) => {
                    const row = info.row.original;
                    const canEdit = canAttachPhoto && (!row.isValidated || canValidate);

                    return (
                        <div className="inline-flex items-center justify-center gap-1.5">
                            {row.hasPhoto ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => onViewPhoto(row)}
                                        title={row.photoAttachedBy ? `Joint par ${row.photoAttachedBy}` : undefined}
                                        className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 dark:text-sky-400 text-[10px] font-semibold"
                                    >
                                        <ImageIcon className="w-3 h-3" />
                                        Voir
                                    </button>
                                    {canEdit && (
                                        <button
                                            type="button"
                                            onClick={() => onAttachPhoto(row)}
                                            className="text-[10px] text-muted-foreground hover:text-foreground underline"
                                        >
                                            Maj
                                        </button>
                                    )}
                                </>
                            ) : canEdit ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onAttachPhoto(row)}
                                    className="h-6 px-2 text-[10px] gap-1 text-sky-600 border-sky-200/70 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/30"
                                >
                                    <Upload className="w-3 h-3" />
                                    Photo
                                </Button>
                            ) : (
                                <span className="text-muted-foreground/40">—</span>
                            )}
                        </div>
                    );
                },
            },
            {
                id: "status",
                accessorFn: (r) => (r.isValidated ? 2 : r.hasPhoto ? 1 : 0),
                header: "Statut",
                cell: (info) => {
                    const row = info.row.original;
                    if (row.isValidated) {
                        return (
                            <Badge
                                variant="outline"
                                title={row.validatedBy ? `Validée par ${row.validatedBy}` : undefined}
                                className="h-5 px-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60"
                            >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Validée
                            </Badge>
                        );
                    }
                    if (row.hasPhoto) {
                        return (
                            <Badge
                                variant="outline"
                                className="h-5 px-1.5 text-[10px] font-semibold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200/60 dark:border-sky-800/60"
                            >
                                <Clock className="w-3 h-3 mr-1" />
                                À valider
                            </Badge>
                        );
                    }
                    return (
                        <Badge
                            variant="outline"
                            className="h-5 px-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/60"
                        >
                            Sans photo
                        </Badge>
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
                                className="h-6 px-2 text-[10px] gap-1 text-rose-600 hover:text-rose-700 border-rose-200/60 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            >
                                <Trash2 className="w-3 h-3" />
                                Retirer
                            </Button>
                        ) : (
                            <span className="text-[10px] text-muted-foreground/60">Verrouillée</span>
                        );
                    }

                    if (!canValidate) {
                        return (
                            <span className="text-[10px] text-muted-foreground/60">
                                {row.hasPhoto ? "En attente controller" : "Photo requise"}
                            </span>
                        );
                    }

                    const isThisBusy = validatingOrderId === row.odooOrderId;
                    return (
                        <Button
                            variant="default"
                            size="sm"
                            disabled={!row.hasPhoto || isThisBusy}
                            title={
                                !row.hasPhoto
                                    ? "Une photo d'autorisation doit d'abord être attachée"
                                    : "Valider la remise"
                            }
                            onClick={() => onValidate(row)}
                            className="h-6 px-2.5 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40"
                        >
                            {isThisBusy ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                                <Check className="w-3 h-3" />
                            )}
                            Valider
                        </Button>
                    );
                },
            },
        ],
        [
            canAttachPhoto,
            canValidate,
            canUnvalidate,
            validatingOrderId,
            onAttachPhoto,
            onValidate,
            onUnvalidate,
            onViewDetails,
            onViewPhoto,
        ],
    );

    const table = useReactTable({
        data: filteredData,
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
                <Eye className="w-6 h-6 mx-auto text-muted-foreground/40" />
                <p className="text-[12px] font-semibold text-foreground mt-2">Aucune remise RedSup</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    Aucune facture ne contient de produit RedSup sur la période.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="relative w-full sm:w-72">
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            table.setPageIndex(0);
                        }}
                        placeholder="Rechercher commande, client, POS..."
                        className="w-full h-7 pl-8 pr-3 rounded-lg border border-border bg-card text-[11px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-0.5">
                    {(
                        [
                            { id: "all", label: `Toutes (${counts.all})` },
                            { id: "ready", label: `À valider (${counts.ready})` },
                            { id: "no_photo", label: `Sans photo (${counts.noPhoto})` },
                            { id: "validated", label: `Validées (${counts.validated})` },
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
                                                    canSort ? header.column.getToggleSortingHandler() : undefined
                                                }
                                                className={cn(
                                                    "py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider h-auto select-none min-w-[85px]",
                                                    idx <= 2 ? "text-left" : idx === 6 ? "text-right" : "text-center",
                                                    canSort && "cursor-pointer hover:text-pink-300",
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
                                    <TableCell
                                        colSpan={columns.length}
                                        className="py-8 text-center text-[11px] text-muted-foreground/70 italic"
                                    >
                                        Aucune facture ne correspond à votre filtre.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        className="hover:bg-accent/30 transition-colors border-b border-border/40"
                                    >
                                        {row.getVisibleCells().map((cell, idx) => (
                                            <TableCell
                                                key={cell.id}
                                                className={cn(
                                                    "py-1.5 px-3",
                                                    idx <= 2 ? "text-left" : idx === 6 ? "text-right font-mono tabular-nums" : "text-center",
                                                )}
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>

                        {/* 10 colonnes : 5 + 1 + 1 + 3 = 10 */}
                        <TableFooter className="bg-muted/50 border-t border-border/80">
                            <TableRow className="hover:bg-transparent border-none">
                                <TableCell colSpan={5} className="py-2 px-3 text-right text-[10px] font-bold uppercase tracking-wider">
                                    Total ({filteredData.length} facture{filteredData.length > 1 ? "s" : ""})
                                </TableCell>
                                <TableCell className="py-2 px-3 text-center font-mono tabular-nums font-bold">
                                    {totals.totalQty}
                                </TableCell>
                                <TableCell className="py-2 px-3 text-right font-mono tabular-nums font-bold text-pink-700 dark:text-pink-300">
                                    {fmt(totals.totalAmount)} $
                                </TableCell>
                                <TableCell colSpan={3} className="py-2 px-3 text-left text-[10px]">
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                        {totals.validatedCount} validée{totals.validatedCount > 1 ? "s" : ""}
                                    </span>
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>

                <DataTablePagination table={table} totalRows={filteredData.length} rowLabel="facture" />
            </div>
        </div>
    );
}