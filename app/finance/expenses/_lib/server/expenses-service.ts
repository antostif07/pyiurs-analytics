import { createClient, getServerAuth } from "@/lib/supabase/server";
import { CONTROLLER_ROLE, isFinanceRole } from "@/lib/auth/roles";
import type { Profile } from "@/lib/supabase/types";
import { odooClient } from "@/lib/odoo/odoo-json2-client";
import { buildDomain } from "@/lib/odoo/domain";
import {
    EXPENSE_STATES,
    type ExpenseCategory,
    type ExpenseCompany,
    type ExpenseRow,
    type ExpenseState,
    type ExpensesFilter,
    type ExpensesReportData,
} from "../types";
import { buildExpensesKpis } from "../kpis";

export const EMPTY_EXPENSES_PAYLOAD: ExpensesReportData = {
    kpis: { totalCount: 0, validatedCount: 0, pendingCount: 0, byCurrency: [] },
    expenses: [],
    categories: [],
    companies: [],
};

function narrowExpenseState(state: string | undefined): ExpenseState {
    if (state && (EXPENSE_STATES as readonly string[]).includes(state)) {
        return state as ExpenseState;
    }
    return "draft";
}

function formatOdooDate(iso: string): string {
    if (!iso) return "";
    const [d] = iso.split(" ");
    return d;
}

// ─── Permissions & Sociétés autorisées ────────────────────────────────────

export async function requireExpensesAccess() {
    const auth = await getServerAuth();
    if (!auth.user) return { ok: false as const, status: 401, error: "Non authentifié" };
    if (!auth.profile) return { ok: false as const, status: 403, error: "Profil manquant" };

    const role = auth.profile.role ?? "";
    if (!isFinanceRole(role) && role !== CONTROLLER_ROLE) {
        return { ok: false as const, status: 403, error: "Permissions insuffisantes" };
    }

    return { ok: true as const, user: auth.user, profile: auth.profile, role };
}

function parseNumericIds(json: unknown): number[] {
    if (!Array.isArray(json)) return [];
    const ids: number[] = [];
    for (const item of json) {
        if (typeof item === "number" && Number.isFinite(item) && item > 0) {
            ids.push(item);
        } else if (typeof item === "string" && /^\d+$/.test(item.trim())) {
            ids.push(Number(item.trim()));
        } else if (item && typeof item === "object") {
            const obj = item as Record<string, unknown>;
            const raw = obj.odoo_company_id ?? obj.company_id ?? obj.id;
            if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
                ids.push(raw);
            }
        }
    }
    return [...new Set(ids)];
}

function parseUuidStrings(json: unknown): string[] {
    if (!Array.isArray(json)) return [];
    return json
        .map((x) => {
            if (typeof x === "string") return x;
            if (x && typeof x === "object" && "id" in x) {
                return String((x as { id: unknown }).id);
            }
            return null;
        })
        .filter((s): s is string => typeof s === "string" && s.length > 0);
}

/**
 * Retourne `null` si accès à toutes les sociétés, ou `number[]` des odoo_company_id autorisés.
 */
export async function resolveAllowedCompanyIds(profile: Profile): Promise<number[] | null> {
    if (profile.role === "admin" || profile.shop_access_type === "all") {
        return null;
    }

    const directCompanyIds = parseNumericIds(profile.assigned_companies);
    if (directCompanyIds.length > 0) {
        return directCompanyIds;
    }

    // Fallback via assigned_shops si assigned_companies est vide
    const shopIds = parseUuidStrings(profile.assigned_shops);
    if (shopIds.length > 0) {
        const supabase = await createClient();
        const { data } = await supabase
            .from("shops")
            .select("odoo_company_id")
            .in("id", shopIds)
            .not("odoo_company_id", "is", null);

        const resolved = (data ?? [])
            .map((s) => s.odoo_company_id)
            .filter((id): id is number => typeof id === "number" && id > 0);
        return [...new Set(resolved)];
    }

    return [];
}

// ─── Caches module-level ──────────────────────────────────────────────────

let shopsCache: { list: ExpenseCompany[]; at: number } | null = null;
const SHOPS_TTL = 5 * 60 * 1000;

async function getAllCompanies(): Promise<ExpenseCompany[]> {
    if (shopsCache && Date.now() - shopsCache.at < SHOPS_TTL) {
        return shopsCache.list;
    }
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("shops")
        .select("name, odoo_company_id")
        .not("odoo_company_id", "is", null)
        .order("name");

    if (error) {
        console.warn("[EXPENSES_SERVICE] shops fetch failed:", error.message);
        return shopsCache?.list ?? [];
    }

    const byId = new Map<number, string>();
    for (const s of data ?? []) {
        if (s.odoo_company_id != null && !byId.has(s.odoo_company_id)) {
            byId.set(s.odoo_company_id, s.name);
        }
    }

    const list = Array.from(byId.entries()).map(([id, name]) => ({ id, name }));
    shopsCache = { list, at: Date.now() };
    return list;
}

let categoriesCache: { list: ExpenseCategory[]; at: number } | null = null;
const CATEGORIES_TTL = 10 * 60 * 1000;

async function getOdooExpenseCategories(): Promise<ExpenseCategory[]> {
    if (categoriesCache && Date.now() - categoriesCache.at < CATEGORIES_TTL) {
        return categoriesCache.list;
    }
    try {
        const products = await odooClient.searchRead<{ id: number; name: string }>(
            "product.product",
            {
                domain: [["can_be_expensed", "=", true]],
                fields: ["id", "name"],
                limit: 500,
                order: "name asc",
            },
        );
        const list = products.map((p) => ({ id: p.id, name: p.name }));
        categoriesCache = { list, at: Date.now() };
        return list;
    } catch (err) {
        console.warn("[EXPENSES_SERVICE] categories fetch failed:", err);
        return categoriesCache?.list ?? [];
    }
}

// ─── Requête principale ───────────────────────────────────────────────────

interface ValidationJoinedRow {
    odoo_expense_id: number;
    validation_photo_path: string;
    proof_photo_path: string | null;
    notes: string | null;
    validated_at: string;
    validator: { full_name: string | null } | { full_name: string | null }[] | null;
}

async function fetchValidationsChunked(expenseIds: number[]) {
    const supabase = await createClient();
    const CHUNK_SIZE = 300;
    const chunks: number[][] = [];

    for (let i = 0; i < expenseIds.length; i += CHUNK_SIZE) {
        chunks.push(expenseIds.slice(i, i + CHUNK_SIZE));
    }

    const results = await Promise.all(
        chunks.map((chunk) =>
            supabase
                .from("expense_validations")
                .select(
                    "odoo_expense_id, validation_photo_path, proof_photo_path, notes, validated_at, validator:profiles!validated_by(full_name)",
                )
                .in("odoo_expense_id", chunk),
        ),
    );

    const rows: ValidationJoinedRow[] = [];
    for (const res of results) {
        if (res.error) {
            console.warn("[EXPENSES_SERVICE] validations chunk failed:", res.error.message);
        } else if (res.data) {
            rows.push(...(res.data as unknown as ValidationJoinedRow[]));
        }
    }
    return rows;
}

export async function fetchExpensesReport(
    filters: ExpensesFilter,
    profile: Profile,
): Promise<ExpensesReportData> {
    const allowedCompanyIds = await resolveAllowedCompanyIds(profile);

    // Utilisateur restreint sans aucune société assignée
    if (allowedCompanyIds !== null && allowedCompanyIds.length === 0) {
        return EMPTY_EXPENSES_PAYLOAD;
    }

    // Si un companyId est demandé, vérifier qu'il est autorisé
    if (
        filters.companyId !== null &&
        allowedCompanyIds !== null &&
        !allowedCompanyIds.includes(filters.companyId)
    ) {
        const allCompanies = await getAllCompanies();
        return {
            ...EMPTY_EXPENSES_PAYLOAD,
            companies: allCompanies.filter((c) => allowedCompanyIds.includes(c.id)),
        };
    }

    const companyDomainClause =
        filters.companyId !== null
            ? (["company_id", "=", filters.companyId] as const)
            : allowedCompanyIds !== null
                ? (["company_id", "in", allowedCompanyIds] as const)
                : null;

    const domain = buildDomain(
        ["date", ">=", `${filters.from} 00:00:00`],
        ["date", "<=", `${filters.to} 23:59:59`],
        filters.categoryIds.length > 0
            ? ["product_id", "in", filters.categoryIds]
            : null,
        companyDomainClause as [string, string, unknown] | null,
        filters.state !== null ? ["state", "=", filters.state] : null,
    );

    // Exécution parallèle : Sociétés + Catégories Odoo + Dépenses Odoo
    const [allCompanies, baseCategories, odooExpenses] = await Promise.all([
        getAllCompanies(),
        getOdooExpenseCategories(),
        odooClient.searchRead<{
            id: number;
            name: string;
            date: string;
            employee_id: [number, string] | false;
            product_id: [number, string] | false;
            company_id: [number, string] | false;
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
                "company_id",
                "quantity",
                "total_amount",
                "currency_id",
                "state",
            ],
            limit: 2000,
            order: "date desc, id desc",
        }),
    ]);

    const visibleCompanies =
        allowedCompanyIds !== null
            ? allCompanies.filter((c) => allowedCompanyIds.includes(c.id))
            : allCompanies;

    if (odooExpenses.length === 0) {
        return {
            ...EMPTY_EXPENSES_PAYLOAD,
            categories: baseCategories,
            companies: visibleCompanies,
        };
    }

    // Jointure Supabase (chunkée, avec nom du validateur joint en 1 requête, sans signer les photos)
    const expenseIds = odooExpenses.map((e) => e.id);
    const validations = await fetchValidationsChunked(expenseIds);

    const validationMap = new Map<
        number,
        {
            hasValidationPhoto: boolean;
            hasProofPhoto: boolean;
            notes: string | null;
            validatedAt: string;
            validatedBy: string | null;
        }
    >();

    for (const v of validations) {
        const validatorObj = Array.isArray(v.validator) ? v.validator[0] : v.validator;
        validationMap.set(v.odoo_expense_id, {
            hasValidationPhoto: Boolean(v.validation_photo_path),
            hasProofPhoto: Boolean(v.proof_photo_path),
            notes: v.notes ?? null,
            validatedAt: v.validated_at,
            validatedBy: validatorObj?.full_name ?? "—",
        });
    }

    const expenses: ExpenseRow[] = odooExpenses.map((e) => {
        const v = validationMap.get(e.id);
        const qty = Number(e.quantity ?? 0);
        const total = Number(e.total_amount ?? 0);
        const unit = qty !== 0 ? total / qty : 0;

        return {
            odooExpenseId: e.id,
            name: e.name,
            date: formatOdooDate(e.date),
            employeeName: Array.isArray(e.employee_id) ? e.employee_id[1] : "—",
            categoryId: Array.isArray(e.product_id) ? e.product_id[0] : 0,
            categoryName: Array.isArray(e.product_id) ? e.product_id[1] : "—",
            companyId: Array.isArray(e.company_id) ? e.company_id[0] : null,
            quantity: qty,
            unitAmount: unit,
            totalAmount: total,
            currency: Array.isArray(e.currency_id) ? e.currency_id[1] : "USD",
            state: narrowExpenseState(e.state),
            isValidated: !!v,
            hasValidationPhoto: v?.hasValidationPhoto ?? false,
            hasProofPhoto: v?.hasProofPhoto ?? false,
            validationNotes: v?.notes ?? null,
            validatedAt: v?.validatedAt ?? null,
            validatedBy: v?.validatedBy ?? null,
        };
    });

    // Fusionner les catégories de base + éventuelles catégories hors can_be_expensed trouvées dans les dépenses
    const catMap = new Map<number, ExpenseCategory>(
        baseCategories.map((c) => [c.id, c]),
    );
    for (const e of expenses) {
        if (e.categoryId && !catMap.has(e.categoryId)) {
            catMap.set(e.categoryId, { id: e.categoryId, name: e.categoryName });
        }
    }
    const categories = Array.from(catMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
    );

    return {
        kpis: buildExpensesKpis(expenses),
        expenses,
        categories,
        companies: visibleCompanies,
    };
}