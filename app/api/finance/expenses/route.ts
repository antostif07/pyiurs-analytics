import { NextRequest, NextResponse } from "next/server";
import { parseExpensesFilters } from "@/app/finance/expenses/_lib/filters";
import {
    EMPTY_EXPENSES_PAYLOAD,
    fetchExpensesReport,
    requireExpensesAccess,
} from "@/app/finance/expenses/_lib/server/expenses-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const access = await requireExpensesAccess();
        if (!access.ok) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }

        const { searchParams } = new URL(request.url);
        const filters = parseExpensesFilters(
            Object.fromEntries(searchParams.entries()),
        );

        const payload = await fetchExpensesReport(filters, access.profile);
        return NextResponse.json(payload);
    } catch (error) {
        console.error("[EXPENSES_API] error:", error);
        return NextResponse.json(EMPTY_EXPENSES_PAYLOAD, { status: 500 });
    }
}