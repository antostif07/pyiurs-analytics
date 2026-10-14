// app/finance/cash-flow/_components/cashflow-matrix.tsx
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { CashflowMethodRow, CashflowReportData } from "../_lib/types";

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const HEADER_BG =
  "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950";

const STICKY_HEADER = cn(
  "sticky left-0 z-20 border-r border-white/10 min-w-[160px]",
  HEADER_BG,
);

const STICKY_BODY = "sticky left-0 z-10 bg-card border-r border-border/60";

interface CashflowMatrixProps {
  data: CashflowReportData | undefined;
  isLoading: boolean;
}

// ─────────────────────────────────────────────────────────────────────────

export default function CashflowMatrix({ data, isLoading }: CashflowMatrixProps) {
  if (isLoading || !data) {
    return (
      <div className="rounded-lg border border-border/60 bg-card shadow-2xs p-8 text-center">
        <p className="text-[11px] text-muted-foreground/60 italic animate-pulse">
          Chargement du cashflow…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ═════════ VENTE ═════════ */}
      <MatrixSection
        title="Vente — Encaissements"
        subtitle="Argent qui entre dans la trésorerie"
        accent="emerald"
        companies={data.companies}
        rows={data.sales.rows}
        grandTotal={data.sales.grandTotal}
        grandTotalLabel="Total Ventes"
      />

      {/* ═════════ DEPENSE ═════════ */}
      <MatrixSection
        title="Dépense — Décaissements"
        subtitle="Argent qui sort de la trésorerie"
        accent="rose"
        companies={data.companies}
        rows={data.expenses.rows}
        grandTotal={data.expenses.grandTotal}
        grandTotalLabel="Total Dépenses"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Section (VENTE ou DEPENSE)
// ─────────────────────────────────────────────────────────────────────────

interface MatrixSectionProps {
  title: string;
  subtitle: string;
  accent: "emerald" | "rose";
  companies: { id: number; name: string; shopName: string }[];
  rows: CashflowMethodRow[];
  grandTotal: number;
  grandTotalLabel: string;
}

function MatrixSection({
  title,
  subtitle,
  accent,
  companies,
  rows,
  grandTotal,
  grandTotalLabel,
}: MatrixSectionProps) {
  const accentBorder =
    accent === "emerald"
      ? "border-l-emerald-500"
      : "border-l-rose-500";

  const accentText =
    accent === "emerald"
      ? "text-emerald-700 dark:text-emerald-400"
      : "text-rose-700 dark:text-rose-400";

  return (
    <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
      {/* Header de section */}
      <div className={cn("border-l-4 px-4 py-2.5 border-b border-border/60", accentBorder)}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-foreground">
              {title}
            </h3>
            <p className="text-[10px] text-muted-foreground/70">
              {subtitle}
            </p>
          </div>
          <div className={cn("text-[11px] font-mono tabular-nums font-bold", accentText)}>
            {fmt(grandTotal)} $
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        <Table className="w-full text-[11px]">
          <TableHeader className={HEADER_BG}>
            <TableRow className={cn("border-none", HEADER_BG)}>
              <TableHead className={cn(STICKY_HEADER, "py-2 px-3 text-left text-[10px] font-semibold text-white uppercase tracking-wider h-auto")}>
                Méthode
              </TableHead>
              <TableHead className={cn(HEADER_BG, "py-2 px-3 text-right text-[10px] font-semibold text-white uppercase tracking-wider h-auto min-w-[110px] border-r border-white/10")}>
                S.O.
              </TableHead>
              {companies.map((c) => (
                <TableHead
                  key={c.id}
                  className={cn(HEADER_BG, "py-2 px-3 text-right text-[10px] font-semibold text-white uppercase tracking-wider h-auto min-w-[100px]")}
                  title={c.shopName}
                >
                  {c.name}
                </TableHead>
              ))}
              <TableHead className={cn(HEADER_BG, "py-2 px-3 text-right text-[10px] font-bold text-white uppercase tracking-wider h-auto min-w-[110px] border-l border-white/20")}>
                Total
              </TableHead>
              <TableHead className={cn(HEADER_BG, "py-2 px-3 text-right text-[10px] font-bold text-white uppercase tracking-wider h-auto min-w-[110px]")}>
                Cumul
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-border/40">
            {rows.map((row) => (
              <TableRow
                key={row.key}
                className={cn(
                  "hover:bg-accent/30 transition-colors border-b border-border/40",
                  row.isTotal && "bg-muted/40 hover:bg-muted/50 border-b-2 border-border/60",
                )}
              >
                <TableCell
                  className={cn(
                    STICKY_BODY,
                    "py-1.5 px-3 text-left",
                    row.isTotal && "bg-muted/80",
                  )}
                >
                  <span
                    className={cn(
                      "text-[11px]",
                      row.isTotal
                        ? "font-bold uppercase tracking-wider text-foreground"
                        : "font-medium text-foreground/90",
                    )}
                  >
                    {row.label}
                  </span>
                </TableCell>

                <TableCell className="py-1.5 px-3 text-right font-mono tabular-nums border-r border-border/40">
                  <AmountCell value={row.openingBalance} bold={row.isTotal} />
                </TableCell>

                {companies.map((c) => (
                  <TableCell
                    key={c.id}
                    className="py-1.5 px-3 text-right font-mono tabular-nums"
                  >
                    <AmountCell
                      value={row.byCompany[c.id] ?? 0}
                      bold={row.isTotal}
                    />
                  </TableCell>
                ))}

                <TableCell className={cn(
                  "py-1.5 px-3 text-right font-mono tabular-nums border-l border-border/40",
                  row.isTotal && "font-bold",
                )}>
                  <AmountCell value={row.total} bold={row.isTotal} />
                </TableCell>

                <TableCell className="py-1.5 px-3 text-right font-mono tabular-nums font-semibold text-sky-700 dark:text-sky-300">
                  {row.cumul === 0 ? (
                    <span className="text-muted-foreground/30">—</span>
                  ) : (
                    `${fmt(row.cumul)} $`
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AmountCell({
  value,
  bold = false,
}: {
  value: number;
  bold?: boolean;
}) {
  if (value === 0) {
    return <span className="text-muted-foreground/30">—</span>;
  }
  return (
    <span
      className={cn(
        bold && "font-bold",
        value < 0
          ? "text-rose-600 dark:text-rose-400"
          : "text-foreground",
      )}
    >
      {fmt(value)} $
    </span>
  );
}