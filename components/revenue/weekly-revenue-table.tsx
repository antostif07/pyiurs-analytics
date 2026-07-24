'use client';

import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  flexRender,
  createColumnHelper,
  ExpandedState,
  Row
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
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from "@/lib/utils";

export interface WeeklyData {
  boutique: string;
  weeks: Record<string, number>;
  subRows?: WeeklyData[];
}

const columnHelper = createColumnHelper<WeeklyData>();

const formatCurrency = (value: number | undefined | null) => {
  if (value === undefined || value === null || value === 0) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
};

interface WeeklyRevenueTableProps {
  data: WeeklyData[];
}

export function WeeklyRevenueTable({ data }: WeeklyRevenueTableProps) {
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const allWeeks = useMemo(() => {
    const weeksSet = new Set<string>();
    const traverse = (items: WeeklyData[]) => {
      items.forEach(item => {
        if (item.weeks) Object.keys(item.weeks).forEach(w => weeksSet.add(w));
        if (item.subRows) traverse(item.subRows);
      });
    };
    traverse(data);

    return Array.from(weeksSet).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [data]);

  const columns = useMemo(() => [
    columnHelper.accessor('boutique', {
      header: 'Boutique / Segment',
      cell: ({ row, getValue }) => <HierarchyCell row={row} value={getValue()} />,
    }),

    ...allWeeks.map(week =>
      columnHelper.accessor(row => row.weeks?.[week], {
        id: week,
        header: week,
        cell: info => {
          const val = info.getValue();
          const isParent = info.row.depth === 0;
          return (
            <span className={cn(
              "font-mono text-[10px] text-right block",
              isParent ? "font-bold text-foreground" : "text-muted-foreground font-light text-[9px]"
            )}>
              {formatCurrency(val)}
            </span>
          );
        }
      })
    )
  ], [allWeeks]);

  const table = useReactTable({
    data,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getSubRows: (row) => row.subRows,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  const totals = useMemo(() => {
    const acc: Record<string, number> = {};
    allWeeks.forEach(w => acc[w] = 0);

    data.forEach(row => {
      allWeeks.forEach(week => {
        const val = row.weeks?.[week] || 0;
        acc[week] = (acc[week] || 0) + val;
      });
    });

    return acc;
  }, [data, allWeeks]);

  if (!data || data.length === 0) {
    return <div className="p-6 text-center text-muted-foreground bg-card border border-border rounded-xl text-xs italic">Aucun flux.</div>;
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
                  row.depth === 0 && "hover:bg-muted/30 bg-card font-semibold",
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
              <TableCell className="px-2.5 py-2 border-r border-border/40 uppercase tracking-wider text-[9px] font-extrabold">Total Flux</TableCell>
              {allWeeks.map(week => (
                <TableCell key={week} className="px-2.5 py-2 border-r border-border/40 text-right font-mono font-bold text-[10px] text-foreground">
                  {formatCurrency(totals[week])}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>

        </Table>
      </div>
    </div>
  );
}

const HierarchyCell = ({ row, value }: { row: Row<WeeklyData>; value: string }) => {
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
      )} title={value}>
        {value}
      </span>
    </div>
  );
};