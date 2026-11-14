import { Suspense } from "react";
import type { Metadata } from "next";
import { getServerAuth } from "@/lib/supabase/server";
import {
    parseExpensesFilters,
    serializeExpensesFilters,
} from "./_lib/filters";
import { fetchExpensesReport } from "./_lib/server/expenses-service";
import ExpensesClient from "./expenses-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Notes de Frais | Finance",
    description: "Consultation, validation et suivi des dépenses Odoo.",
};

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function ExpensesLoader({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const [rawParams, auth] = await Promise.all([searchParams, getServerAuth()]);
    const filters = parseExpensesFilters(rawParams);
    const queryKeyString = serializeExpensesFilters(filters).toString();

    const initialData = auth.profile
        ? await fetchExpensesReport(filters, auth.profile)
        : undefined;

    return (
        <ExpensesClient
            initialData={initialData}
            initialQueryKeyString={queryKeyString}
            initialFetchedAt={Date.now()}
            userRole={auth.profile?.role ?? "user"}
        />
    );
}

export default function ExpensesPage({ searchParams }: PageProps) {
    return (
        <Suspense
            fallback={
                <div className="p-5 space-y-4 animate-pulse">
                    <div className="h-16 rounded-lg bg-muted/40" />
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="h-24 rounded-lg bg-muted/40" />
                        ))}
                    </div>
                    <div className="h-80 rounded-lg bg-muted/40" />
                </div>
            }
        >
            <ExpensesLoader searchParams={searchParams} />
        </Suspense>
    );
}