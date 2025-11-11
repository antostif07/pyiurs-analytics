"use client"

import { useId, useMemo, useState } from "react"
import {
  Column,
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  RowData,
  SortingState,
  useReactTable,
} from "@tanstack/react-table"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  SearchIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { usePagination } from "@/hooks/use-pagination"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem } from "./ui/pagination"
import { Button } from "./ui/button"
import Multiselect from "./MultiSelect"
import { Option } from "./ui/multiselect"

declare module "@tanstack/react-table" {
  //allows us to define custom properties for our columns
  interface ColumnMeta<TData extends RowData, TValue> {
    filterVariant?: "text" | "range" | "select" | "multi-select",
    label?: string;
  }
}

type Item = {
  id: string
  keyword: string
  intents: Array<
    "Informational" | "Navigational" | "Commercial" | "Transactional"
  >
  volume: number
  cpc: number
  traffic: number
  link: string
}

export default function DataTable<T>({tableData, cols}: {tableData: T[], cols: ColumnDef<T, unknown>[]}) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([
    
  ])
  const pageSize = 10
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: pageSize,
  })

  console.log(tableData[0]);

  const table = useReactTable({
    data: tableData,
    columns:cols,
    state: {
      sorting,
      columnFilters,
      pagination,
      columnVisibility: { po_name: false }
    },
    onColumnFiltersChange: setColumnFilters,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(), //client-side filtering
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(), // client-side faceting
    getFacetedUniqueValues: getFacetedUniqueValues(), // generate unique values for select filter/autocomplete
    getFacetedMinMaxValues: getFacetedMinMaxValues(), // generate min/max values for range filter
    onSortingChange: setSorting,
    enableSortingRemoval: false,
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
  })

  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage: table.getState().pagination.pageIndex + 1,
    totalPages: table.getPageCount(),
    paginationItemsToDisplay: 10,
  })

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search input */}
        {/* <div className="w-44">
          <Filter column={table.getColumn("keyword")!} />
        </div> */}
        {/* Intents select */}
        {/* <div className="w-36">
          <Filter column={table.getColumn("intents")!} />
        </div> */}
        {/* Volume inputs */}
        {/* <div className="w-36">
          <Filter column={table.getColumn("volume")!} />
        </div> */}
        {/* CPC inputs */}
        {/* <div className="w-36">
          <Filter column={table.getColumn("cpc")!} />
        </div> */}
        {/* Traffic inputs */}
        {/* <div className="w-36">
          <Filter column={table.getColumn("traffic")!} />
        </div> */}
      </div>
      <div className="flex flex-wrap gap-3">
        {table.getAllColumns().map(
          (column) =>
            column.getCanFilter() && (
              <div key={column.id} className="w-40">
                <Filter column={column} />
              </div>
            )
        )}
      </div>

      <div className="[&>div]:h-[560px]">
        <Table 
        className="table-fixed border-separate border-spacing-0 [&_td]:border-border [&_tfoot_td]:border-t [&_th]:border-b [&_th]:border-border [&_tr]:border-none [&_tr:not(:last-child)_td]:border-b"
        style={{
          width: table.getCenterTotalSize(),
        }}>
        <TableHeader className="sticky top-0 z-10 bg-background/90 backdrop-blur-xs">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-muted/50">
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    className="relative h-10 border-t select-none last:[&>.cursor-col-resize]:opacity-0"
                    aria-sort={
                      header.column.getIsSorted() === "asc"
                        ? "ascending"
                        : header.column.getIsSorted() === "desc"
                          ? "descending"
                          : "none"
                    }
                    {...{
                      colSpan: header.colSpan,
                      style: {
                        width: header.getSize(),
                      },
                    }}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={cn(
                          header.column.getCanSort() &&
                            "flex h-full cursor-pointer items-center justify-between gap-2 select-none"
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                        onKeyDown={(e) => {
                          // Enhanced keyboard handling for sorting
                          if (
                            header.column.getCanSort() &&
                            (e.key === "Enter" || e.key === " ")
                          ) {
                            e.preventDefault()
                            header.column.getToggleSortingHandler()?.(e)
                          }
                        }}
                        tabIndex={header.column.getCanSort() ? 0 : undefined}
                      >
                        <span className="truncate">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </span>
                        {{
                          asc: (
                            <ChevronUpIcon
                              className="shrink-0 opacity-60"
                              size={16}
                              aria-hidden="true"
                            />
                          ),
                          desc: (
                            <ChevronDownIcon
                              className="shrink-0 opacity-60"
                              size={16}
                              aria-hidden="true"
                            />
                          ),
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    )}
                    {header.column.getCanResize() && (
                      <div
                        {...{
                          onDoubleClick: () => header.column.resetSize(),
                          onMouseDown: header.getResizeHandler(),
                          onTouchStart: header.getResizeHandler(),
                          className:
                            "absolute top-0 h-full w-4 cursor-col-resize user-select-none touch-none -right-2 z-10 flex justify-center before:absolute before:w-px before:inset-y-0 before:bg-border before:translate-x-px",
                        }}
                      />
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={cols.length} className="h-24 text-center">
              Aucun Résultat.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </div>
      <div className="flex items-center justify-between gap-3 max-sm:flex-col">
        {/* Page number information */}
        <p
          className="flex-1 text-sm whitespace-nowrap text-muted-foreground"
          aria-live="polite"
        >
          Page{" "}
          <span className="text-foreground">
            {table.getState().pagination.pageIndex + 1}
          </span>{" "}
          of <span className="text-foreground">{table.getPageCount()}</span>
        </p>

        <div className="grow">
          <Pagination>
            <PaginationContent>
              {/* Previous page button */}
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  className="disabled:pointer-events-none disabled:opacity-50"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label="Go to previous page"
                >
                  <ChevronLeftIcon size={16} aria-hidden="true" />
                </Button>
              </PaginationItem>

              {/* Left ellipsis (...) */}
              {showLeftEllipsis && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}

              {/* Page number buttons */}
              {pages.map((page) => {
                const isActive =
                  page === table.getState().pagination.pageIndex + 1
                return (
                  <PaginationItem key={page}>
                    <Button
                      size="icon"
                      variant={`${isActive ? "outline" : "ghost"}`}
                      onClick={() => table.setPageIndex(page - 1)}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {page}
                    </Button>
                  </PaginationItem>
                )
              })}

              {/* Right ellipsis (...) */}
              {showRightEllipsis && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}

              {/* Next page button */}
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  className="disabled:pointer-events-none disabled:opacity-50"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  aria-label="Go to next page"
                >
                  <ChevronRightIcon size={16} aria-hidden="true" />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>

        <div className="flex flex-1 justify-end">
          <Select
            value={table.getState().pagination.pageSize.toString()}
            onValueChange={(value) => {
              table.setPageSize(Number(value))
            }}
            aria-label="Results per page"
          >
            <SelectTrigger
              id="results-per-page"
              className="w-fit whitespace-nowrap"
            >
              <SelectValue placeholder="Select number of results" />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 25, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={pageSize.toString()}>
                  {pageSize} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

// function Filter({ column }: { column: Column<any, unknown> }) {
//   const id = useId()
  
//   const columnFilterValue = column.getFilterValue()
//   const { filterVariant } = column.columnDef.meta ?? {}

//   const columnHeader =
//     typeof column.columnDef.header === "string" ? column.columnDef.header : ""
//   const sortedUniqueValues = useMemo(() => {
//     if (filterVariant === "range") return []

//     // Get all unique values from the column
//     const values = Array.from(column.getFacetedUniqueValues().keys())

//     // If the values are arrays, flatten them and get unique items
//     const flattenedValues = values.reduce((acc: string[], curr) => {
//       if (Array.isArray(curr)) {
//         return [...acc, ...curr]
//       }
//       return [...acc, curr]
//     }, [])

//     // Get unique values and sort them
//     return Array.from(new Set(flattenedValues)).sort()
//   }, [column.getFacetedUniqueValues(), filterVariant])

//   if (filterVariant === "range") {
//     return (
//       <div className="*:not-first:mt-2">
//         <Label>{columnHeader}</Label>
//         <div className="flex">
//           <Input
//             id={`${id}-range-1`}
//             className="flex-1 rounded-e-none [-moz-appearance:_textfield] focus:z-10 [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
//             value={(columnFilterValue as [number, number])?.[0] ?? ""}
//             onChange={(e) =>
//               column.setFilterValue((old: [number, number]) => [
//                 e.target.value ? Number(e.target.value) : undefined,
//                 old?.[1],
//               ])
//             }
//             placeholder="Min"
//             type="number"
//             aria-label={`${columnHeader} min`}
//           />
//           <Input
//             id={`${id}-range-2`}
//             className="-ms-px flex-1 rounded-s-none [-moz-appearance:_textfield] focus:z-10 [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
//             value={(columnFilterValue as [number, number])?.[1] ?? ""}
//             onChange={(e) =>
//               column.setFilterValue((old: [number, number]) => [
//                 old?.[0],
//                 e.target.value ? Number(e.target.value) : undefined,
//               ])
//             }
//             placeholder="Max"
//             type="number"
//             aria-label={`${columnHeader} max`}
//           />
//         </div>
//       </div>
//     )
//   }

//   if (filterVariant === "select") {
//     return (
//       <div className="*:not-first:mt-2">
//         <Label htmlFor={`${id}-select`}>{columnHeader}</Label>
//         <Select
//           value={columnFilterValue?.toString() ?? "all"}
//           onValueChange={(value) => {
//             column.setFilterValue(value === "all" ? undefined : value)
//           }}
//         >
//           <SelectTrigger id={`${id}-select`}>
//             <SelectValue />
//           </SelectTrigger>
//           <SelectContent>
//             <SelectItem value="all">All</SelectItem>
//             {sortedUniqueValues.map((value) => (
//               <SelectItem key={String(value)} value={String(value)}>
//                 {String(value)}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>
//       </div>
//     )
//   }

//   return (
//     <div className="*:not-first:mt-2">
//       <Label htmlFor={`${id}-input`}>{columnHeader}</Label>
//       <div className="relative">
//         <Input
//           id={`${id}-input`}
//           className="peer ps-9"
//           value={(columnFilterValue ?? "") as string}
//           onChange={(e) => column.setFilterValue(e.target.value)}
//           placeholder={`Search ${columnHeader.toLowerCase()}`}
//           type="text"
//         />
//         <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
//           <SearchIcon size={16} />
//         </div>
//       </div>
//     </div>
//   )
// }

function Filter<TData>({ column }: { column: Column<TData, unknown> }) {
  const id = useId();
  const columnFilterValue = column.getFilterValue();
  const { filterVariant } = column.columnDef.meta ?? {};

  // ⚠️ Si aucun filtre n’est défini dans la colonne, on n’affiche rien

  const columnHeader = column.columnDef.meta?.label ??
  (typeof column.columnDef.header === "string"
    ? column.columnDef.header
    : column.id);

  // 🔢 Liste des valeurs uniques pour les filtres "select"
  const sortedUniqueValues = useMemo(() => {
    if (filterVariant === "range") return [];
    const values = Array.from(column.getFacetedUniqueValues().keys());
    const flattened = values.flatMap((v) => (Array.isArray(v) ? v : [v]));
    return Array.from(new Set(flattened)).sort();
  }, [column.getFacetedUniqueValues(), filterVariant]);

  if (!filterVariant) return null;

  // 📊 Filtre de type "range" (min / max)
  if (filterVariant === "range") {
    return (
      <div className="flex flex-col gap-2" id={id}>
        <Label>{columnHeader}</Label>
        <div className="flex gap-1">
          <Input
            value={(columnFilterValue as [number, number])?.[0] ?? ""}
            onChange={(e) =>
              column.setFilterValue((old: [number, number]) => [
                e.target.value ? Number(e.target.value) : undefined,
                old?.[1],
              ])
            }
            placeholder="Min"
            type="number"
          />
          <Input
            value={(columnFilterValue as [number, number])?.[1] ?? ""}
            onChange={(e) =>
              column.setFilterValue((old: [number, number]) => [
                old?.[0],
                e.target.value ? Number(e.target.value) : undefined,
              ])
            }
            placeholder="Max"
            type="number"
          />
        </div>
      </div>
    );
  }

  // 🧾 Filtre de type "select"
  if (filterVariant === "select") {
    return (
      <div className="flex flex-col gap-2" id={id}>
        <Label>{columnHeader}</Label>
        <Select
          value={columnFilterValue?.toString() ?? "all"}
          onValueChange={(value) =>
            column.setFilterValue(value === "all" ? undefined : value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={`Filtrer ${columnHeader.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {sortedUniqueValues.map((v) => (
              <SelectItem key={String(v)} value={String(v)}>
                {String(v)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (filterVariant === "multi-select") {
    return (
        <Multiselect
          label={columnHeader} 
          options={sortedUniqueValues.map((s: string) => ({value: s, label: s}))} 
          onChange={(selectedOptions: { value: string; label: string }[]) => {
            const newValues = selectedOptions.map((opt) => opt.value);
            column.setFilterValue(newValues); // 🟢 met à jour le filtre de la colonne
          }} />
    );
  }

  // 🔍 Filtre texte par défaut
  return (
    <div className="flex flex-col gap-2" id={id}>
      <Label>{columnHeader}</Label>
      <div className="relative">
        <Input
          value={(columnFilterValue ?? "") as string}
          onChange={(e) => column.setFilterValue(e.target.value)}
          placeholder={`Rechercher ${columnHeader.toLowerCase()}`}
          className="ps-8"
        />
        <SearchIcon
          className="absolute left-2 top-2.5 text-muted-foreground opacity-60"
          size={16}
        />
      </div>
    </div>
  );
}
