"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
    ChevronDown,
    ChevronRight,
    ExternalLink,
    PiggyBank,
    Receipt,
    TrendingUp,
    Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
    ClosingExpenseItem,
    ClosingSaleItem,
    DailyClosingReport,
} from "../_lib/types";

const fmt = (n: number) =>
    n.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

export default function ClotureDetailsSection({
    report,
}: {
    report: DailyClosingReport;
}) {
    const [openPayGroups, setOpenPayGroups] = useState<Set<string>>(new Set());
    const [openExpenseCats, setOpenExpenseCats] = useState<Set<string>>(new Set());

    const salesGroups = useMemo(() => {
        const map = new Map<
            string,
            { label: string; total: number; items: ClosingSaleItem[] }
        >();
        for (const s of report.sales) {
            const entry = map.get(s.paymentMethodLabel) ?? {
                label: s.paymentMethodLabel,
                total: 0,
                items: [],
            };
            entry.total += s.amountTotal;
            entry.items.push(s);
            map.set(s.paymentMethodLabel, entry);
        }
        return Array.from(map.values()).sort((a, b) => b.total - a.total);
    }, [report.sales]);

    const { principalCats, epargneCats } = useMemo(() => {
        const groupByCat = (list: ClosingExpenseItem[]) => {
            const map = new Map<
                string,
                { category: string; total: number; items: ClosingExpenseItem[] }
            >();
            for (const e of list) {
                const entry = map.get(e.categoryName) ?? {
                    category: e.categoryName,
                    total: 0,
                    items: [],
                };
                entry.total += e.amount;
                entry.items.push(e);
                map.set(e.categoryName, entry);
            }
            return Array.from(map.values()).sort((a, b) => b.total - a.total);
        };
        return {
            principalCats: groupByCat(report.expenses.filter((e) => !e.isEpargne)),
            epargneCats: groupByCat(report.expenses.filter((e) => e.isEpargne)),
        };
    }, [report.expenses]);

    const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) => {
        setter((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Ventes du jour par mode de paiement */}
            <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden flex flex-col">
                <div className="px-4 py-2.5 border-b border-border/60 flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold">
                        <Receipt className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Ventes du jour ({report.sales.length})
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {fmt(report.kpis.dailySalesTotal)} $
                    </span>
                </div>

                {salesGroups.length === 0 ? (
                    <div className="p-8 text-center text-[11px] text-muted-foreground italic">
                        Aucune vente enregistrée sur cette journée.
                    </div>
                ) : (
                    <div className="divide-y divide-border/40 max-h-[520px] overflow-y-auto">
                        {salesGroups.map((g) => {
                            const isOpen = openPayGroups.has(g.label);
                            return (
                                <div key={g.label}>
                                    <button
                                        type="button"
                                        onClick={() => toggleSet(setOpenPayGroups, g.label)}
                                        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-accent/30 transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-2">
                                            {isOpen ? (
                                                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                            ) : (
                                                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                            )}
                                            <span className="text-xs font-semibold">{g.label}</span>
                                            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                                                {g.items.length}
                                            </Badge>
                                        </div>
                                        <span
                                            className={cn(
                                                "text-xs font-mono font-bold",
                                                g.total <= 0
                                                    ? "text-rose-600 dark:text-rose-400"
                                                    : "text-emerald-600 dark:text-emerald-400",
                                            )}
                                        >
                                            {fmt(g.total)} $
                                        </span>
                                    </button>

                                    {isOpen && (
                                        <div className="bg-muted/20 border-t border-border/40 divide-y divide-border/30">
                                            {g.items.map((sale) => (
                                                <div
                                                    key={sale.id}
                                                    className="px-6 py-2 flex items-center justify-between gap-2 text-[11px]"
                                                >
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-mono font-semibold text-foreground">
                                                                {sale.name}
                                                            </span>
                                                            <span className="text-muted-foreground truncate">
                                                                — {sale.partnerName}
                                                            </span>
                                                            {sale.amountTotal <= 0 && (
                                                                <Badge variant="destructive" className="h-4 px-1 text-[9px]">
                                                                    Négatif
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-muted-foreground">
                                                            {sale.shopName} · {format(new Date(sale.dateOrder.replace(" ", "T")), "HH:mm")}
                                                        </p>
                                                    </div>
                                                    <span
                                                        className={cn(
                                                            "font-mono font-semibold shrink-0",
                                                            sale.amountTotal <= 0
                                                                ? "text-rose-600 dark:text-rose-400"
                                                                : "text-foreground",
                                                        )}
                                                    >
                                                        {fmt(sale.amountTotal)} $
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Dépenses du jour (Caisse Principale vs Épargne) */}
            <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden flex flex-col">
                <div className="px-4 py-2.5 border-b border-border/60 flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold">
                        <TrendingUp className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                        Dépenses du jour ({report.expenses.length})
                    </span>
                    <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                        -{fmt(report.kpis.expensesTotal)} $
                    </span>
                </div>

                {report.expenses.length === 0 ? (
                    <div className="p-8 text-center text-[11px] text-muted-foreground italic">
                        Aucune dépense enregistrée sur cette journée.
                    </div>
                ) : (
                    <div className="divide-y divide-border/40 max-h-[520px] overflow-y-auto">
                        {/* Caisse Principale */}
                        <div className="px-4 py-2 bg-sky-50/50 dark:bg-sky-950/20 flex items-center justify-between text-xs font-semibold">
                            <span className="inline-flex items-center gap-1.5 text-sky-700 dark:text-sky-300">
                                <Wallet className="w-3.5 h-3.5" />
                                Caisse Principale
                            </span>
                            <span className="font-mono text-rose-600 dark:text-rose-400">
                                -{fmt(report.kpis.principalExpensesTotal)} $
                            </span>
                        </div>
                        {principalCats.map((cat) => {
                            const key = `p:${cat.category}`;
                            const isOpen = openExpenseCats.has(key);
                            return (
                                <ExpenseCategoryAccordion
                                    key={key}
                                    category={cat.category}
                                    total={cat.total}
                                    items={cat.items}
                                    isOpen={isOpen}
                                    onToggle={() => toggleSet(setOpenExpenseCats, key)}
                                />
                            );
                        })}

                        {/* Caisse Épargne */}
                        <div className="px-4 py-2 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between text-xs font-semibold">
                            <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                                <PiggyBank className="w-3.5 h-3.5" />
                                Caisse Épargne
                            </span>
                            <span className="font-mono text-rose-600 dark:text-rose-400">
                                -{fmt(report.kpis.epargneExpensesTotal)} $
                            </span>
                        </div>
                        {epargneCats.length === 0 ? (
                            <div className="px-4 py-3 text-[11px] text-muted-foreground italic">
                                Aucune sortie sur caisse épargne.
                            </div>
                        ) : (
                            epargneCats.map((cat) => {
                                const key = `e:${cat.category}`;
                                const isOpen = openExpenseCats.has(key);
                                return (
                                    <ExpenseCategoryAccordion
                                        key={key}
                                        category={cat.category}
                                        total={cat.total}
                                        items={cat.items}
                                        isOpen={isOpen}
                                        onToggle={() => toggleSet(setOpenExpenseCats, key)}
                                    />
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function ExpenseCategoryAccordion({
    category,
    total,
    items,
    isOpen,
    onToggle,
}: {
    category: string;
    total: number;
    items: ClosingExpenseItem[];
    isOpen: boolean;
    onToggle: () => void;
}) {
    return (
        <div>
            <button
                type="button"
                onClick={onToggle}
                className="w-full px-4 py-2 flex items-center justify-between hover:bg-accent/30 transition-colors text-left"
            >
                <div className="flex items-center gap-2 min-w-0">
                    {isOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-[11px] font-medium truncate">{category}</span>
                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                        {items.length}
                    </Badge>
                </div>
                <span className="text-[11px] font-mono font-semibold text-rose-600 dark:text-rose-400 shrink-0">
                    -{fmt(total)} $
                </span>
            </button>
            {isOpen && (
                <div className="bg-muted/20 border-t border-border/40 divide-y divide-border/30">
                    {items.map((exp) => (
                        <a
                            key={exp.id}
                            href={`https://pyiurs.odoo.com/web?#id=${exp.id}${exp.companyId ? `&cids=${exp.companyId}` : ""}&model=hr.expense&view_type=form`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-2 flex items-center justify-between gap-2 text-[11px] hover:bg-accent/30"
                        >
                            <div className="min-w-0">
                                <p className="font-medium truncate flex items-center gap-1">
                                    {exp.name}
                                    <ExternalLink className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                                </p>
                                <p className="text-[10px] text-muted-foreground">{exp.productName}</p>
                            </div>
                            <span className="font-mono font-semibold text-rose-600 dark:text-rose-400 shrink-0">
                                -{fmt(exp.amount)} $
                            </span>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}