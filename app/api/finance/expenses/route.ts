// app/api/finance/expenses/route.ts — version complète

import { NextRequest, NextResponse } from "next/server";
import { odooClient } from "@/lib/odoo/odoo-json2-client";
import { buildDomain } from "@/lib/odoo/domain";
import { createClient } from "@/lib/supabase/server";
import { parseExpensesFilters } from "@/app/finance/expenses/_lib/filters";
import type {
    ExpenseRow,
    ExpenseCategory,
    ExpenseCompany,
    ExpensesKpis,
    ExpensesReportData,
} from "@/app/finance/expenses/_lib/types";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────
// Cache module-level — mapping companies depuis Supabase shops
// ─────────────────────────────────────────────────────────────────────────
let companiesCache: { list: ExpenseCompany[]; at: number } | null = null;
const COMPANIES_TTL = 5 * 60 * 1000;

async function getCompanies(): Promise<ExpenseCompany[]> {
    if (companiesCache && Date.now() - companiesCache.at < COMPANIES_TTL) {
        return companiesCache.list;
    }

    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("shops")
            .select("name, odoo_company_id")
            .not("odoo_company_id", "is", null)
            .order("name");

        if (error) {
            console.warn("[EXPENSES_API] shops fetch failed:", error.message);
            return companiesCache?.list ?? [];
        }

        const list: ExpenseCompany[] = (data ?? [])
            .filter((s) => s.odoo_company_id != null)
            .map((s) => ({
                id: s.odoo_company_id as number,
                name: s.name,
            }));

        companiesCache = { list, at: Date.now() };
        return list;
    } catch (err) {
        console.error("[EXPENSES_API] getCompanies error:", err);
        return companiesCache?.list ?? [];
    }
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function formatOdooDate(iso: string): string {
    if (!iso) return "";
    const [d] = iso.split(" ");
    return d;
}

function buildKpis(expenses: ExpenseRow[]): ExpensesKpis {
    const totalAmount = expenses.reduce((s, e) => s + e.totalAmount, 0);
    const validated = expenses.filter((e) => e.isValidated);
    const pending = expenses.filter((e) => !e.isValidated);

    return {
        totalCount: expenses.length,
        totalAmount,
        validatedCount: validated.length,
        pendingCount: pending.length,
        validatedAmount: validated.reduce((s, e) => s + e.totalAmount, 0),
        pendingAmount: pending.reduce((s, e) => s + e.totalAmount, 0),
    };
}

const EMPTY_PAYLOAD: ExpensesReportData = {
    kpis: {
        totalCount: 0,
        totalAmount: 0,
        validatedCount: 0,
        pendingCount: 0,
        validatedAmount: 0,
        pendingAmount: 0,
    },
    expenses: [],
    categories: [],
    companies: [],
};

// ─────────────────────────────────────────────────────────────────────────
// GET
// ─────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filters = parseExpensesFilters(
            Object.fromEntries(searchParams.entries()),
        );

        const fromDate = `${filters.from} 00:00:00`;
        const toDate = `${filters.to} 23:59:59`;

        // ─── 0. Companies (Supabase) ──────────────────────────────────
        const companies = await getCompanies();

        // ─── 1. Domaine Odoo ──────────────────────────────────────────
        const domain = buildDomain(
            ["date", ">=", fromDate],
            ["date", "<=", toDate],
            filters.categoryIds.length > 0
                ? ["product_id", "in", filters.categoryIds]
                : null,
            filters.companyId !== null
                ? ["company_id", "=", filters.companyId]
                : null,
        );

        // ─── 2. hr.expense Odoo ───────────────────────────────────────
        const odooExpenses = await odooClient.searchRead<{
            id: number;
            name: string;
            date: string;
            employee_id: [number, string] | false;
            product_id: [number, string] | false;
            quantity: number;
            total_amount: number;
            currency_id: [number, string] | false;
            state: string;
        }>("hr.expense", {
            domain,
            fields: [
                "name",
                "date",
                "employee_id",
                "product_id",
                "quantity",
                "total_amount",
                "currency_id",
                "state",
            ],
            limit: 2000,
            order: "date desc, id desc",
        });

        if (odooExpenses.length === 0) {
            return NextResponse.json({
                ...EMPTY_PAYLOAD,
                companies,
            });
        }

        // ─── 3. Jointure Supabase ─────────────────────────────────────
        const expenseIds = odooExpenses.map((e) => e.id);
        const supabase = await createClient();

        const { data: validations, error: vErr } = await supabase
            .from("expense_validations")
            .select(
                "odoo_expense_id, validation_photo_path, notes, validated_at, validated_by",
            )
            .in("odoo_expense_id", expenseIds);

        if (vErr) {
            console.warn("[EXPENSES_API] validations fetch failed:", vErr.message);
        }

        const validatorIds = [
            ...new Set(
                (validations ?? [])
                    .map((v) => v.validated_by)
                    .filter((v): v is string => typeof v === "string"),
            ),
        ];

        let nameById = new Map<string, string>();
        if (validatorIds.length > 0) {
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, full_name")
                .in("id", validatorIds);
            nameById = new Map(
                (profiles ?? []).map((p) => [p.id, p.full_name ?? "—"]),
            );
        }

        const photoPaths = (validations ?? [])
            .map((v) => v.validation_photo_path)
            .filter(Boolean);

        const signedUrlByPath = new Map<string, string>();
        if (photoPaths.length > 0) {
            const { data: signed } = await supabase.storage
                .from("expense-validations")
                .createSignedUrls(photoPaths, 60 * 60);

            for (const s of signed ?? []) {
                if (s.signedUrl && s.path) {
                    signedUrlByPath.set(s.path, s.signedUrl);
                }
            }
        }

        const validationMap = new Map<
            number,
            {
                photoUrl: string | null;
                notes: string | null;
                validatedAt: string;
                validatedBy: string | null;
            }
        >();

        for (const v of validations ?? []) {
            validationMap.set(v.odoo_expense_id, {
                photoUrl: signedUrlByPath.get(v.validation_photo_path) ?? null,
                notes: v.notes ?? null,
                validatedAt: v.validated_at,
                validatedBy: v.validated_by
                    ? nameById.get(v.validated_by) ?? "—"
                    : null,
            });
        }

        // ─── 4. Fusion Odoo + Supabase ────────────────────────────────
        const expenses: ExpenseRow[] = odooExpenses.map((e) => {
            const v = validationMap.get(e.id);
            const qty = Number(e.quantity ?? 0);
            const total = Number(e.total_amount ?? 0);
            const unit = qty !== 0 ? total / qty : 0;

            return {
                odooExpenseId: e.id,
                name: e.name,
                date: formatOdooDate(e.date),
                employeeName: Array.isArray(e.employee_id)
                    ? e.employee_id[1]
                    : "—",
                categoryId: Array.isArray(e.product_id) ? e.product_id[0] : 0,
                categoryName: Array.isArray(e.product_id)
                    ? e.product_id[1]
                    : "—",
                quantity: qty,
                unitAmount: unit,
                totalAmount: total,
                currency: Array.isArray(e.currency_id) ? e.currency_id[1] : "USD",
                state: e.state,
                isValidated: !!v,
                validationPhotoUrl: v?.photoUrl ?? null,
                validationNotes: v?.notes ?? null,
                validatedAt: v?.validatedAt ?? null,
                validatedBy: v?.validatedBy ?? null,
            };
        });

        // ─── 5. Catégories uniques ────────────────────────────────────
        const categoriesMap = new Map<number, ExpenseCategory>();
        for (const e of expenses) {
            if (e.categoryId && !categoriesMap.has(e.categoryId)) {
                categoriesMap.set(e.categoryId, {
                    id: e.categoryId,
                    name: e.categoryName,
                });
            }
        }
        const categories = Array.from(categoriesMap.values()).sort((a, b) =>
            a.name.localeCompare(b.name),
        );

        // ─── 6. Payload ───────────────────────────────────────────────
        const payload: ExpensesReportData = {
            kpis: buildKpis(expenses),
            expenses,
            categories,
            companies,
        };

        return NextResponse.json(payload);
    } catch (error) {
        console.error("[EXPENSES_API] error:", error);
        return NextResponse.json(EMPTY_PAYLOAD, { status: 500 });
    }
}