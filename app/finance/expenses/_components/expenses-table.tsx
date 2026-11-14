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
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    FileEdit,
    Image as ImageIcon,
    Search,
    Send,
    Trash2,
    Upload,
    XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExpenseRow, ExpenseState } from "../_lib/types";
import { buildExpensesKpis } from "../_lib/kpis";

const fmt = (n: number) =>
    n.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

interface ExpensesTableProps {
    data: ExpenseRow[];
    canValidate: boolean;
    canUnvalidate: boolean;
    onValidate: (expense: ExpenseRow) => void;
    onUnvalidate: (expense: ExpenseRow) => void;
    onViewPhoto: (expense: ExpenseRow, kind: "auth" | "proof") => void;
}

type BadgeTone = "emerald" | "amber" | "rose" | "sky" | "violet" | "neutral";

const STATE_META: Record<
    ExpenseState,
    { label: string; tone: BadgeTone; Icon: typeof CheckCircle2 }
> = {
    draft: { label: "Brouillon", tone: "neutral", Icon: FileEdit },
    submitted: { label: "Soumis", tone: "amber", Icon: Send },
    approved: { label: "Approuvé", tone: "sky", Icon: CheckCircle2 },
    paid: { label: "Payé", tone: "emerald", Icon: CheckCircle2 },
    refused: { label: "Refusé", tone: "rose", Icon: XCircle },
    posted: { label: "Payé", tone: "emerald", Icon: CheckCircle2 },
    in_payment: { label: "Payé", tone: "emerald", Icon: CheckCircle2 },
};

const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
    emerald:
        "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60",
    amber:
        "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/60",
    rose:
        "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/60",
    sky:
        "text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200/60 dark:border-sky-800/60",
    violet:
        "text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border-violet-200/60 dark:border-violet-800/60",
    neutral: "text-muted-foreground bg-muted/40 border-border/60",
};

function ExpenseStateBadge({ state }: { state: ExpenseState }) {
    const meta = STATE_META[state] ?? STATE_META.draft;
    const { Icon } = meta;
    return (
        <Badge
            variant="outline"
            className={cn(
                "h-5 px-1.5 text-[10px] font-semibold border gap-1",
                BADGE_TONE_CLASSES[meta.tone],
            )}
        >
            <Icon className="w-2.5 h-2.5" />
            {meta.label}
        </Badge>
    );
}

const HEADER_BG =
    "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950";

export default function ExpensesTable({
    data,
    canValidate,
    canUnvalidate,
    onValidate,
    onUnvalidate,
    onViewPhoto,
}: ExpensesTableProps) {
    const [search, setSearch] = useState("");
    const [validationFilter, setValidationFilter] = useState<
        "all" | "validated" | "pending"
    >("all");
    const [sorting, setSorting] = useState<SortingState>([]);

    const filteredData = useMemo(() => {
        const q = search.trim().toLowerCase();
        return data.filter((row) => {
            if (validationFilter === "validated" && !row.isValidated) return false;
            if (validationFilter === "pending" && row.isValidated) return false;
            if (!q) return true;
            return (
                row.name.toLowerCase().includes(q) ||
                row.employeeName.toLowerCase().includes(q) ||
                row.categoryName.toLowerCase().includes(q)
            );
        });
    }, [data, search, validationFilter]);

    const kpis = useMemo(() => buildExpensesKpis(filteredData), [filteredData]);

    const columns = useMemo<ColumnDef<ExpenseRow>[]>(
        () => [
            {
                accessorKey: "date",
                header: "Date",
                cell: (info) => (
                    <span className="tabular-nums whitespace-nowrap">
                        {info.getValue() as string}
                    </span>
                ),
            },
            {
                accessorKey: "employeeName",
                header: "Employé",
                cell: (info) => (
                    <span className="block max-w-[160px] truncate" title={info.getValue() as string}>
                        {info.getValue() as string}
                    </span>
                ),
            },
            {
                accessorKey: "name",
                header: "Description",
                cell: (info) => (
                    <span className="block max-w-[260px] truncate" title={info.getValue() as string}>
                        {info.getValue() as string}
                    </span>
                ),
            },
            {
                accessorKey: "categoryName",
                header: "Catégorie",
                cell: (info) => (
                    <span className="text-muted-foreground block max-w-[160px] truncate">
                        {info.getValue() as string}
                    </span>
                ),
            },
            {
                accessorKey: "totalAmount",
                header: "Montant",
                cell: (info) => {
                    const row = info.row.original;
                    return (
                        <span className="font-semibold tabular-nums whitespace-nowrap">
                            {fmt(row.totalAmount)} {row.currency}
                        </span>
                    );
                },
            },
            {
                accessorKey: "state",
                header: "Statut Odoo",
                cell: (info) => (
                    <ExpenseStateBadge state={info.getValue() as ExpenseState} />
                ),
            },
            {
                id: "status",
                accessorFn: (row) => (row.isValidated ? 1 : 0),
                header: "Validation",
                cell: (info) => {
                    const row = info.row.original;
                    return row.isValidated ? (
                        <Badge
                            variant="outline"
                            title={row.validatedBy ? `Par ${row.validatedBy}` : undefined}
                            className="h-5 px-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60"
                        >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Validée
                        </Badge>
                    ) : (
                        <Badge
                            variant="outline"
                            className="h-5 px-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/60"
                        >
                            <Clock className="w-3 h-3 mr-1" />
                            En attente
                        </Badge>
                    );
                },
            },
            {
                id: "authPhoto",
                enableSorting: false,
                header: "Autorisation",
                cell: (info) => {
                    const row = info.row.original;
                    if (!row.isValidated || !row.hasValidationPhoto) {
                        return <span className="text-muted-foreground/40">—</span>;
                    }
                    return (
                        <button
                            type="button"
                            onClick={() => onViewPhoto(row, "auth")}
                            className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 dark:text-sky-400 text-[10px] font-semibold"
                        >
                            <ImageIcon className="w-3 h-3" />
                            Voir
                        </button>
                    );
                },
            },
            {
                id: "proofPhoto",
                enableSorting: false,
                header: "Preuve",
                cell: (info) => {
                    const row = info.row.original;
                    if (!row.isValidated || !row.hasProofPhoto) {
                        return <span className="text-muted-foreground/40">—</span>;
                    }
                    return (
                        <button
                            type="button"
                            onClick={() => onViewPhoto(row, "proof")}
                            className="inline-flex items-center gap-1 text-violet-600 hover:text-violet-700 dark:text-violet-400 text-[10px] font-semibold"
                        >
                            <ImageIcon className="w-3 h-3" />
                            Voir
                        </button>
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
                            <span className="text-[10px] text-muted-foreground/60">—</span>
                        );
                    }
                    return canValidate ? (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => onValidate(row)}
                            className="h-6 px-2 text-[10px] gap-1 bg-sky-600 hover:bg-sky-700 text-white"
                        >
                            <Upload className="w-3 h-3" />
                            Valider
                        </Button>
                    ) : (
                        <span className="text-[10px] text-muted-foreground/60">Lecture seule</span>
                    );
                },
            },
        ],
        [canValidate, canUnvalidate, onValidate, onUnvalidate, onViewPhoto],
    );

    const table = useReactTable({
        data: filteredData,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: { pageSize: 50 },
        },
    });

    if (data.length === 0) {
        return (
            <div className="rounded-lg border border-border/60 bg-card shadow-2xs p-8 text-center">
                <p className="text-[11px] text-muted-foreground/60 italic">
                    Aucune dépense sur la période sélectionnée.
                </p>
            </div>
        );
    }

    const totalByCurrencyLabel = kpis.byCurrency
        .map((c) => `${fmt(c.totalAmount)} ${c.currency === "USD" ? "$" : c.currency}`)
        .join("  |  ");

    const validatedByCurrencyLabel = kpis.byCurrency
        .map((c) => `${fmt(c.validatedAmount)} ${c.currency === "USD" ? "$" : c.currency}`)
        .join("  |  ");

    return (
        <div className="space-y-2.5">
            {/* Barre outils client (0 requête serveur) */}
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
                        placeholder="Rechercher employé, motif, catégorie..."
                        className="w-full h-7 pl-8 pr-3 rounded-lg border border-border bg-card text-[11px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                </div>

                <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
                    {(
                        [
                            { id: "all", label: `Toutes (${data.length})` },
                            {
                                id: "validated",
                                label: `Validées (${data.filter((d) => d.isValidated).length})`,
                            },
                            {
                                id: "pending",
                                label: `En attente (${data.filter((d) => !d.isValidated).length})`,
                            },
                        ] as const
                    ).map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                                setValidationFilter(tab.id);
                                table.setPageIndex(0);
                            }}
                            className={cn(
                                "px-2.5 py-1 rounded-md text-[10.5px] font-medium transition-colors",
                                validationFilter === tab.id
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
                                                    "py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider h-auto select-none min-w-[90px]",
                                                    idx <= 2 ? "text-left" : "text-center",
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
                                        Aucune dépense ne correspond à votre recherche.
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
                                                    idx === 4 && "font-mono tabular-nums",
                                                    idx <= 2 ? "text-left" : "text-center",
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

                        {/* 10 colonnes exactement : 4 + 1 + 5 = 10 */}
                        <TableFooter className="bg-muted/50 border-t border-border/80">
                            <TableRow className="hover:bg-transparent border-none">
                                <TableCell
                                    colSpan={4}
                                    className="py-2 px-3 text-right text-[10px] font-bold uppercase tracking-wider"
                                >
                                    Total ({filteredData.length} dépense{filteredData.length > 1 ? "s" : ""})
                                </TableCell>
                                <TableCell className="py-2 px-3 text-center font-mono tabular-nums font-bold whitespace-nowrap">
                                    {totalByCurrencyLabel || "0,00 $"}
                                </TableCell>
                                <TableCell colSpan={5} className="py-2 px-3 text-left text-[10px]">
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                        {kpis.validatedCount} validée{kpis.validatedCount > 1 ? "s" : ""} (
                                        {validatedByCurrencyLabel || "0,00 $"})
                                    </span>
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>

                {/* Pagination */}
                {table.getPageCount() > 1 && (
                    <div className="flex items-center justify-between border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
                        <span>
                            Page {table.getState().pagination.pageIndex + 1} sur{" "}
                            {table.getPageCount()} ({filteredData.length} lignes)
                        </span>
                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-[10px]"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                            >
                                <ChevronLeft className="w-3 h-3" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-[10px]"
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                            >
                                <ChevronRight className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}