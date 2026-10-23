// app/revenue/arpu/_components/arpu-monthly-matrix.tsx
"use client";

import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

interface MonthlyRow {
  label: string;
  revenue: number;
  arpu: number;
  base: number;
  femme: number;
  enfant: number;
  beauty: number;
  acqCount: number;
  acqRev: number;
  recCount: number;
  recRev: number;
}

interface ArpuMonthlyMatrixProps {
  data: MonthlyRow[];
}

const HEADER_BG =
  "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950";

const fmtMoney = (n: number) =>
  n.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }) + " $";

const fmtMoney2 = (n: number) =>
  n.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " $";

const fmtInt = (n: number) => n.toLocaleString("fr-FR");

type Tone = "violet" | "emerald" | "sky" | "amber" | "pink" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  violet: "text-violet-600 dark:text-violet-400 font-semibold",
  emerald: "text-emerald-600 dark:text-emerald-400 font-semibold",
  sky: "text-sky-600 dark:text-sky-400 font-semibold",
  amber: "text-amber-600 dark:text-amber-400 font-semibold",
  pink: "text-pink-600 dark:text-pink-400 font-semibold",
  neutral: "text-foreground",
};

interface RowDef {
  label: string;
  key?: keyof MonthlyRow;
  format?: (v: number) => string;
  computed?: (m: MonthlyRow) => number;
  bold?: boolean;
  tone?: Tone;
  isHeader?: boolean;
}

const rows: RowDef[] = [
  {
    label: "REVENU TOTAL",
    key: "revenue",
    format: fmtMoney,
    bold: true,
  },
  {
    label: "ARPU global",
    key: "arpu",
    format: fmtMoney2,
    tone: "violet",
  },
  {
    label: "Base clients (mobiles)",
    key: "base",
    format: fmtInt,
  },
  { label: "— Segments —", isHeader: true },
  {
    label: "Revenu Femme",
    key: "femme",
    format: fmtMoney,
  },
  {
    label: "Revenu Beauty",
    key: "beauty",
    format: fmtMoney,
  },
  {
    label: "Revenu Enfant",
    key: "enfant",
    format: fmtMoney,
  },
  { label: "— Cohortes —", isHeader: true },
  {
    label: "Acquisitions (nombre)",
    key: "acqCount",
    format: fmtInt,
    tone: "emerald",
  },
  {
    label: "Acquisitions (revenu)",
    key: "acqRev",
    format: fmtMoney,
  },
  {
    label: "ARPU Acquisitions",
    computed: (m) => (m.acqCount > 0 ? m.acqRev / m.acqCount : 0),
    format: fmtMoney2,
    tone: "emerald",
  },
  {
    label: "Récurrents (nombre)",
    key: "recCount",
    format: fmtInt,
    tone: "sky",
  },
  {
    label: "Récurrents (revenu)",
    key: "recRev",
    format: fmtMoney,
  },
  {
    label: "ARPU Récurrents",
    computed: (m) => (m.recCount > 0 ? m.recRev / m.recCount : 0),
    format: fmtMoney2,
    tone: "sky",
  },
];

export default function ArpuMonthlyMatrix({ data }: ArpuMonthlyMatrixProps) {
  const currentYear = new Date().getFullYear();

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border/60 border-dashed bg-card p-8 text-center">
        <CalendarDays className="mx-auto w-6 h-6 text-muted-foreground/40" />
        <h3 className="text-[12px] font-semibold text-foreground mt-2">
          Aucune donnée annuelle
        </h3>
        <p className="text-[11px] text-muted-foreground/70 mt-0.5">
          Aucune donnée disponible sur cette période.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
      {/* Header du bloc */}
      <div className="px-3 py-2 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
            Récapitulatif annuel · {currentYear}
          </h3>
        </div>
        <span className="text-[10px] text-muted-foreground/60 tabular-nums">
          {data.length} mois
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          {/* Header colonnes */}
          <thead className={HEADER_BG}>
            <tr className="border-none">
              <th
                className={cn(
                  "sticky left-0 z-20 py-2 px-3 text-left text-[10px] font-semibold text-white uppercase tracking-wider min-w-[200px]",
                  HEADER_BG,
                )}
              >
                Indicateurs
              </th>
              {data.map((m) => (
                <th
                  key={m.label}
                  className="py-2 px-3 text-center text-[10px] font-semibold text-white uppercase tracking-wider min-w-[100px]"
                >
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-border/40">
            {rows.map((row, i) => {
              if (row.isHeader) {
                return (
                  <tr
                    key={`header-${i}`}
                    className="bg-muted/40"
                  >
                    <td
                      colSpan={1 + data.length}
                      className="py-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70"
                    >
                      {row.label}
                    </td>
                  </tr>
                );
              }

              return (
                <tr
                  key={row.label}
                  className={cn(
                    "hover:bg-accent/30 transition-colors border-b border-border/40",
                    row.bold && "bg-muted/20",
                  )}
                >
                  {/* Colonne sticky */}
                  <td
                    className={cn(
                      "sticky left-0 z-10 py-1.5 px-3 text-left border-r border-border/60",
                      row.bold ? "bg-muted/20" : "bg-card",
                      row.bold
                        ? "text-[11px] font-bold text-foreground"
                        : "text-[11px] font-medium text-foreground/90",
                    )}
                  >
                    {row.label}
                  </td>

                  {/* Valeurs par mois */}
                  {data.map((m, j) => {
                    const value =
                      row.computed !== undefined
                        ? row.computed(m)
                        : row.key !== undefined
                          ? Number(m[row.key] ?? 0)
                          : 0;

                    const formatted = row.format
                      ? row.format(value)
                      : String(value);

                    return (
                      <td
                        key={`${row.label}-${j}`}
                        className={cn(
                          "py-1.5 px-3 text-center font-mono tabular-nums",
                          row.tone
                            ? TONE_CLASS[row.tone]
                            : "text-foreground",
                          row.bold && "font-bold",
                        )}
                      >
                        {formatted}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}