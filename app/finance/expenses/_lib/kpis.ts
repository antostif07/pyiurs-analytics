import type { CurrencyTotals, ExpenseRow, ExpensesKpis } from "./types";

const CURRENCY_ORDER: Record<string, number> = { USD: 0, CDF: 1, EUR: 2 };

export function buildExpensesKpis(expenses: ExpenseRow[]): ExpensesKpis {
    let validatedCount = 0;
    let pendingCount = 0;
    const map = new Map<string, CurrencyTotals>();

    for (const e of expenses) {
        const cur = (e.currency || "USD").toUpperCase();
        let entry = map.get(cur);
        if (!entry) {
            entry = {
                currency: cur,
                totalAmount: 0,
                validatedAmount: 0,
                pendingAmount: 0,
            };
            map.set(cur, entry);
        }

        entry.totalAmount += e.totalAmount;
        if (e.isValidated) {
            validatedCount += 1;
            entry.validatedAmount += e.totalAmount;
        } else {
            pendingCount += 1;
            entry.pendingAmount += e.totalAmount;
        }
    }

    const byCurrency = Array.from(map.values()).sort(
        (a, b) =>
            (CURRENCY_ORDER[a.currency] ?? 99) - (CURRENCY_ORDER[b.currency] ?? 99) ||
            a.currency.localeCompare(b.currency),
    );

    return {
        totalCount: expenses.length,
        validatedCount,
        pendingCount,
        byCurrency,
    };
}