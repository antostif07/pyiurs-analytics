'use client';

import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ExpandedState
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, ArrowUpDown, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from "@/lib/utils";

export interface PerformanceData {
  boutique: string;
  today?: number;
  yesterday?: number;
  weekly?: number;
  mtd: number;
  mtdPrev: number;
  deltaMoM?: number;
  deltaWoW?: number;
  deltaYoY?: number;
  forecast?: number;
  budgetMensuel?: number;
  subRows?: PerformanceData[];
}

const columnHelper = createColumnHelper<PerformanceData>();

const formatCurrency = (val: number | undefined) => {
  if (val === undefined || val === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val);
};

const formatPercentage = (val: number | undefined) => {
  if (val === undefined || val === null) return '—';
  return `${val > 0 ? '+' : ''}${val}%`;
};

interface AdvancedPerformanceTableProps {
  data: PerformanceData[];
}

export function AdvancedPerformanceTable({ data }: AdvancedPerformanceTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const columns = useMemo(() => [
    // 1. Boutique / Segment / Catégorie
    columnHelper.accessor('boutique', {
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1 uppercase hover:text-foreground transition-colors font-bold text-[8px] tracking-widest outline-none"
        >
          <span>Entité </span>
          <ArrowUpDown size={9} className={column.getIsSorted() ? "text-primary opacity-100" : "opacity-30"} />
        </button>
      ),
      cell: ({ row, getValue }) => {
        const depth = row.depth;

        return (
          <div style={{ paddingLeft: `${depth * 1}rem` }} className="flex items-center gap-1.5">
            {row.getCanExpand() ? (
              <button
                onClick={(e) => { e.stopPropagation(); row.toggleExpanded(); }}
                className="cursor-pointer hover:bg-accent rounded p-0.5 transition-colors focus:outline-none"
              >
                {row.getIsExpanded()
                  ? <ChevronDown size={12} className="text-primary font-bold" />
                  : <ChevronRight size={12} className="text-muted-foreground/60" />
                }
              </button>
            ) : (
              depth > 0 && <span className="w-3" />
            )}

            {!row.getCanExpand() && depth > 0 && (
              <span className="w-2 h-px bg-border shrink-0 mr-0.5" />
            )}

            <span className={cn(
              "truncate font-sans",
              depth === 0 && "font-bold text-[11px] text-foreground uppercase tracking-tight",
              depth === 1 && "font-semibold text-[10px] text-foreground/90",
              depth === 2 && "font-normal text-[9px] text-muted-foreground"
            )} title={getValue()}>
              {getValue()}
            </span>
          </div>
        );
      }
    }),

    // 2. Delta WoW
    columnHelper.accessor('deltaWoW', {
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center justify-end gap-1 uppercase hover:text-foreground transition-colors font-bold text-[8px] tracking-widest w-full outline-none"
        >
          <span>Δ WoW</span>
          <ArrowUpDown size={9} className={column.getIsSorted() ? "text-primary opacity-100" : "opacity-30"} />
        </button>
      ),
      cell: info => {
        const val = info.getValue();
        if (val === undefined || val === 0) return <span className="text-muted-foreground/30 font-mono text-[9px]">—</span>;
        return (
          <span className={cn("font-bold font-mono text-[10px]", val > 0 ? 'text-emerald-600' : 'text-rose-600')}>
            {formatPercentage(val)}
          </span>
        );
      }
    }),

    // 3. MTD
    columnHelper.accessor('mtd', {
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center justify-end gap-1 uppercase hover:text-foreground transition-colors font-bold text-[8px] tracking-widest w-full outline-none"
        >
          <span>Vente MTD</span>
          <ArrowUpDown size={9} className={column.getIsSorted() ? "text-primary opacity-100" : "opacity-30"} />
        </button>
      ),
      cell: info => (
        <span className={cn("font-bold font-mono text-[10px]", info.row.depth === 0 ? 'text-foreground' : 'text-foreground/80 font-medium')}>
          {formatCurrency(info.getValue())}
        </span>
      )
    }),

    // 4. MTD Prev
    columnHelper.accessor('mtdPrev', {
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center justify-end gap-1 uppercase hover:text-foreground transition-colors font-bold text-[8px] tracking-widest w-full outline-none"
        >
          <span>MTD-1</span>
          <ArrowUpDown size={9} className={column.getIsSorted() ? "text-primary opacity-100" : "opacity-30"} />
        </button>
      ),
      cell: info => (
        <span className="text-muted-foreground/70 font-mono text-[10px] font-light">
          {formatCurrency(info.getValue())}
        </span>
      )
    }),

    // 5. Delta MoM
    columnHelper.accessor('deltaMoM', {
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center justify-end gap-1 uppercase hover:text-foreground transition-colors font-bold text-[8px] tracking-widest w-full outline-none"
        >
          <span>Δ MoM</span>
          <ArrowUpDown size={9} className={column.getIsSorted() ? "text-primary opacity-100" : "opacity-30"} />
        </button>
      ),
      cell: info => {
        const val = info.getValue() ?? 0;
        return (
          <div className={cn(
            "flex items-center gap-0.5 font-bold font-mono px-1 py-0.2 rounded text-[9px] ml-auto w-fit",
            val < 0 ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'
          )}>
            {val < 0 ? <TrendingDown size={9} /> : <TrendingUp size={9} />}
            {val > 0 ? '+' : ''}{val}%
          </div>
        );
      }
    }),

    // 6. Forecast Pace
    columnHelper.accessor('forecast', {
      header: 'Forecast',
      cell: info => (
        <span className={cn("font-bold font-mono text-[10px]", info.row.depth === 0 ? 'text-primary' : 'text-muted-foreground')}>
          {formatCurrency(info.getValue())}
        </span>
      )
    }),

    // 7. Budget & % Realisation
    columnHelper.accessor('budgetMensuel', {
      header: 'Budget & Real.',
      cell: ({ row }) => {
        const mtd = row.original.mtd || 0;
        const budget = row.original.budgetMensuel || 0;
        const pct = budget > 0 ? Math.round((mtd / budget) * 100) : 0;

        if (budget === 0) return <span className="text-muted-foreground/30 font-mono text-[9px]">—</span>;

        return (
          <div className="flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-1 font-mono text-[10px]">
              <span className="text-muted-foreground/70 text-[9px]">Cible: {formatCurrency(budget)}</span>
              <Badge className={cn(
                "text-[7px] font-bold h-3 px-1 border-none font-mono",
                pct >= 100 ? "bg-emerald-500 text-white" : pct >= 75 ? "bg-primary text-primary-foreground" : "bg-rose-500 text-white"
              )}>
                {pct}%
              </Badge>
            </div>
            <div className="w-20 bg-muted h-1 rounded-full overflow-hidden border border-border/40">
              <div
                className={cn("h-full transition-all duration-300", pct >= 100 ? "bg-emerald-500" : pct >= 75 ? "bg-primary" : "bg-rose-500")}
                style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
              />
            </div>
          </div>
        );
      }
    }),
  ], []);

  const totals = useMemo(() => {
    let mtd = 0, mtdPrev = 0, forecast = 0, budget = 0;

    data.forEach(curr => {
      mtd += curr.mtd || 0;
      mtdPrev += curr.mtdPrev || 0;
      forecast += curr.forecast || 0;
      budget += curr.budgetMensuel || 0;
    });

    const deltaMoM = mtdPrev > 0 ? Math.round(((mtd - mtdPrev) / mtdPrev) * 100) : 0;
    const pctBudget = budget > 0 ? Math.round((mtd / budget) * 100) : 0;

    return { mtd, mtdPrev, forecast, budget, deltaMoM, pctBudget };
  }, [data]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, expanded },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getSubRows: (row) => row.subRows,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  if (!data || data.length === 0) {
    return <div className="p-6 text-center text-muted-foreground bg-card border border-border rounded-xl text-xs italic">Aucune donnée.</div>;
  }

  return (
    <div className="bg-card text-card-foreground rounded-xl border border-border overflow-hidden shadow-xs flex flex-col transition-colors">
      <div className="overflow-x-auto scrollbar-thin">
        <Table className="w-full text-left text-[10px] border-collapse">
          <TableHeader className="bg-muted/40 border-b border-border text-muted-foreground">
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id} className="hover:bg-transparent border-none">
                {hg.headers.map(header => (
                  <TableHead key={header.id} className="px-2.5 py-2 font-bold uppercase tracking-wider text-[8px] border-r border-border/40 last:border-none select-none h-8">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody className="divide-y divide-border/40">
            {table.getRowModel().rows.map(row => (
              <TableRow
                key={row.id}
                className={cn(
                  "transition-colors h-7",
                  row.depth === 0 && "hover:bg-muted/40 bg-card font-semibold",
                  row.depth === 1 && "bg-muted/10 hover:bg-muted/20 italic",
                  row.depth === 2 && "bg-muted/20 hover:bg-muted/30"
                )}
              >
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id} className="px-2.5 py-1.5 border-r border-border/30 last:border-none align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>

          <TableFooter className="bg-muted/60 border-t-2 border-border font-bold text-foreground">
            <TableRow className="hover:bg-transparent border-none h-8">
              <TableCell className="px-2.5 py-2 border-r border-border/40 uppercase tracking-wider text-[9px] font-extrabold">Total Consolidation</TableCell>
              <TableCell className="px-2.5 py-2 border-r border-border/40 text-right text-muted-foreground/30 font-mono">—</TableCell>
              <TableCell className="px-2.5 py-2 border-r border-border/40 text-right font-mono font-bold text-[10px] text-foreground">{formatCurrency(totals.mtd)}</TableCell>
              <TableCell className="px-2.5 py-2 border-r border-border/40 text-right font-mono text-[10px] text-muted-foreground font-medium">{formatCurrency(totals.mtdPrev)}</TableCell>
              <TableCell className="px-2.5 py-2 border-r border-border/40 text-right font-mono">
                <div className={cn("flex items-center justify-end gap-0.5 w-fit px-1 py-0.2 rounded text-[9px] ml-auto font-bold", totals.deltaMoM < 0 ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600')}>
                  {totals.deltaMoM > 0 ? '+' : ''}{totals.deltaMoM}%
                </div>
              </TableCell>
              <TableCell className="px-2.5 py-2 border-r border-border/40 text-right font-mono text-primary font-bold text-[10px]">{formatCurrency(totals.forecast)}</TableCell>
              <TableCell className="px-2.5 py-2 text-right font-mono">
                {totals.budget > 0 ? (
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-[9px] text-muted-foreground">Cible: {formatCurrency(totals.budget)}</span>
                    <Badge className="text-[8px] bg-primary text-primary-foreground font-bold px-1 h-3">{totals.pctBudget}%</Badge>
                  </div>
                ) : <span className="text-muted-foreground/30 font-mono">—</span>}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}