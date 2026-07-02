import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    flexRender,
    type ColumnDef,
    type SortingState,
    type ColumnFiltersState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { cn } from '../../../lib/utils/cn';

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    searchKey?: string;
    searchPlaceholder?: string;
    isLoading?: boolean;
    // Pour la pagination serveur
    serverSidePagination?: {
        page: number;
        pageSize: number;
        total: number;
        onPageChange: (page: number) => void;
    };
}

export function DataTable<TData, TValue>({
    columns,
    data,
    searchKey,
    searchPlaceholder = 'Filtrer...',
    isLoading,
    serverSidePagination,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState('');

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: serverSidePagination ? undefined : getPaginationRowModel(),
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        state: {
            sorting,
            columnFilters,
            globalFilter,
        },
        manualPagination: !!serverSidePagination,
        pageCount: serverSidePagination
            ? Math.ceil(serverSidePagination.total / serverSidePagination.pageSize)
            : undefined,
    });

    return (
        <div className="space-y-4">
            {/* Search */}
            {searchKey && (
                <Input
                    placeholder={searchPlaceholder}
                    value={
                        (table.getColumn(searchKey)?.getFilterValue() as string) ?? ''
                    }
                    onChange={(e) =>
                        table.getColumn(searchKey)?.setFilterValue(e.target.value)
                    }
                    className="max-w-sm"
                />
            )}

            {/* Table */}
            <div className="rounded-md border">
                <table className="w-full">
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className="border-b bg-muted/50">
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className={cn(
                                            'h-10 px-4 text-left align-middle font-medium text-muted-foreground',
                                            header.column.getCanSort() && 'cursor-pointer select-none hover:text-foreground'
                                        )}
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        <div className="flex items-center gap-2">
                                            {flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                            {header.column.getCanSort() && (
                                                <ArrowUpDown className="h-3.5 w-3.5" />
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        <span className="text-sm text-muted-foreground">Chargement...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <tr
                                    key={row.id}
                                    className="border-b transition-colors hover:bg-muted/50"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="px-4 py-3 align-middle text-sm">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="h-24 text-center text-sm text-muted-foreground"
                                >
                                    Aucun résultat
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {serverSidePagination
                        ? `${serverSidePagination.total} résultat(s) au total`
                        : `${table.getFilteredRowModel().rows.length} résultat(s)`}
                </p>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                            serverSidePagination
                                ? serverSidePagination.onPageChange(1)
                                : table.setPageIndex(0)
                        }
                        disabled={
                            serverSidePagination
                                ? serverSidePagination.page <= 1
                                : table.getCanPreviousPage()
                        }
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                            serverSidePagination
                                ? serverSidePagination.onPageChange(serverSidePagination.page - 1)
                                : table.previousPage()
                        }
                        disabled={
                            serverSidePagination
                                ? serverSidePagination.page <= 1
                                : !table.getCanPreviousPage()
                        }
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {serverSidePagination?.page ?? table.getState().pagination.pageIndex + 1}{' '}
                        / {serverSidePagination ? Math.ceil(serverSidePagination.total / serverSidePagination.pageSize) : table.getPageCount()}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                            serverSidePagination
                                ? serverSidePagination.onPageChange(serverSidePagination.page + 1)
                                : table.nextPage()
                        }
                        disabled={
                            serverSidePagination
                                ? serverSidePagination.page >= Math.ceil(serverSidePagination.total / serverSidePagination.pageSize)
                                : !table.getCanNextPage()
                        }
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                            serverSidePagination
                                ? serverSidePagination.onPageChange(Math.ceil(serverSidePagination.total / serverSidePagination.pageSize))
                                : table.setPageIndex(table.getPageCount() - 1)
                        }
                        disabled={
                            serverSidePagination
                                ? serverSidePagination.page >= Math.ceil(serverSidePagination.total / serverSidePagination.pageSize)
                                : !table.getCanNextPage()
                        }
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}