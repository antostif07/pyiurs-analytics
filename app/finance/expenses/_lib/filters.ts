// app/finance/expenses/_lib/filters.ts

import type { ExpenseState, ExpensesFilter } from "./types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_STATES: ExpenseState[] = [
    "draft",
    "reported",
    "approved",
    "done",
    "refused",
];

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function getDefaultFilters(): ExpensesFilter {
    const today = toIso(new Date());
    return {
        from: today,
        to: today,
        categoryIds: [],
        companyId: null,
        state: null,
    };
}

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;

export function parseExpensesFilters(raw: Raw): ExpensesFilter {
    const defaults = getDefaultFilters();

    const from = one(raw.from);
    const to = one(raw.to);
    const categoriesRaw = one(raw.categories);
    const companyRaw = one(raw.company);
    const stateRaw = one(raw.state);

    const categoryIds = categoriesRaw
        ? categoriesRaw
            .split(",")
            .map((s) => Number(s.trim()))
            .filter((n) => Number.isFinite(n) && n > 0)
        : [];

    const companyId = companyRaw ? Number(companyRaw) : null;

    const state: ExpenseState | null =
        stateRaw && VALID_STATES.includes(stateRaw as ExpenseState)
            ? (stateRaw as ExpenseState)
            : null;

    return {
        from: from && ISO_DATE.test(from) ? from : defaults.from,
        to: to && ISO_DATE.test(to) ? to : defaults.to,
        categoryIds,
        companyId:
            companyId !== null && Number.isFinite(companyId) && companyId > 0
                ? companyId
                : null,
        state,
    };
}

export function serializeExpensesFilters(f: ExpensesFilter): URLSearchParams {
    const sp = new URLSearchParams();
    sp.set("from", f.from);
    sp.set("to", f.to);
    if (f.categoryIds.length > 0) sp.set("categories", f.categoryIds.join(","));
    if (f.companyId !== null) sp.set("company", String(f.companyId));
    if (f.state !== null) sp.set("state", f.state);
    return sp;
}