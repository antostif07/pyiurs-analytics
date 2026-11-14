import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { odooClient } from "@/lib/odoo/odoo-json2-client";
import {
    requireExpensesAccess,
    resolveAllowedCompanyIds,
} from "@/app/finance/expenses/_lib/server/expenses-service";

export const dynamic = "force-dynamic";

const BUCKET = "expense-validations";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const access = await requireExpensesAccess();
        if (!access.ok) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }

        const { id } = await params;
        const odooExpenseId = Number(id);
        const kind = request.nextUrl.searchParams.get("kind") === "proof" ? "proof" : "auth";

        if (!Number.isFinite(odooExpenseId) || odooExpenseId <= 0) {
            return NextResponse.json({ error: "ID invalide" }, { status: 400 });
        }

        const supabase = await createClient();
        const allowedCompanies = await resolveAllowedCompanyIds(access.profile);

        const [{ data: validation, error }, odooRows] = await Promise.all([
            supabase
                .from("expense_validations")
                .select("validation_photo_path, proof_photo_path")
                .eq("odoo_expense_id", odooExpenseId)
                .maybeSingle(),
            allowedCompanies !== null
                ? odooClient.searchRead<{ id: number; company_id: [number, string] | false }>(
                    "hr.expense",
                    { domain: [["id", "=", odooExpenseId]], fields: ["company_id"], limit: 1 },
                )
                : Promise.resolve(null),
        ]);

        if (allowedCompanies !== null) {
            const compId = Array.isArray(odooRows?.[0]?.company_id)
                ? odooRows[0].company_id[0]
                : null;
            if (compId === null || !allowedCompanies.includes(compId)) {
                return NextResponse.json({ error: "Accès refusé à cette société" }, { status: 403 });
            }
        }

        if (error || !validation) {
            return NextResponse.json({ error: "Validation introuvable" }, { status: 404 });
        }

        const path =
            kind === "proof" ? validation.proof_photo_path : validation.validation_photo_path;

        if (!path) {
            return NextResponse.json({ error: "Fichier absent" }, { status: 404 });
        }

        const { data: signed, error: signErr } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(path, 60 * 60);

        if (signErr || !signed?.signedUrl) {
            return NextResponse.json({ error: "Impossible de signer le fichier" }, { status: 500 });
        }

        const isPdf = path.toLowerCase().endsWith(".pdf");
        return NextResponse.json({ url: signed.signedUrl, isPdf });
    } catch (err) {
        console.error("[EXPENSES_PHOTO_API] error:", err);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}