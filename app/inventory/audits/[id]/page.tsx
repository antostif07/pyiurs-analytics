// app/inventory/audits/[id]/page.tsx
import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { createClient, getServerAuth } from "@/lib/supabase/server";
import { AuditScannerClient } from "./audit-scanner-client";
import type { StockAudit, StockAuditItem } from "../_lib/types";

interface PageProps {
    params: Promise<{ id: string }>;
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

const AUDITS_LIST_HREF = "/inventory/audits";        // ⬅️ FIX

const PAGE_SIZE = 1000;
const MAX_PARALLEL_PAGES = 5;

const ITEM_COLUMNS = `
  id, audit_id, odoo_product_id, product_name, internal_barcode,
  supplier_ref, hs_code, brand, color, theoretical_qty, counted_qty,
  unit_cost, scanned_at, odoo_create_date,
  sold_locations, found_locations,
  pos_category_ids, pos_category_names,
  reception_date, list_price
`.replace(/\s+/g, " ").trim();

// ─── Fetch (inchangé) ────────────────────────────────────────────────────

const getAudit = cache(async (id: string): Promise<StockAudit | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("stock_audits")
        .select("*")
        .eq("id", id)
        .maybeSingle();
    if (error) {
        throw new Error(`Chargement de l'audit impossible : ${error.message}`);
    }
    return data as StockAudit | null;
});

function fetchItemsPage(
    supabase: SupabaseServer,
    auditId: string,
    page: number,
    withCount: boolean,
) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    return supabase
        .from("stock_audit_items")
        .select(
            ITEM_COLUMNS,
            // ⬇️ Passer l'objet entier (ou undefined) — jamais { count: undefined }
            withCount ? { count: "exact" as const } : undefined,
        )
        .eq("audit_id", auditId)
        .order("scanned_at", { ascending: false, nullsFirst: false })
        .order("internal_barcode", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);
}

async function fetchAllAuditItems(
    supabase: SupabaseServer,
    auditId: string,
): Promise<StockAuditItem[]> {
    const first = await fetchItemsPage(supabase, auditId, 0, true);
    if (first.error) {
        throw new Error(`Chargement des articles impossible : ${first.error.message}`);
    }

    const firstRows = (first.data ?? []) as unknown as StockAuditItem[];
    const total = first.count ?? firstRows.length;
    const totalPages = Math.ceil(total / PAGE_SIZE);

    const itemMap = new Map<string, StockAuditItem>();
    for (const item of firstRows) itemMap.set(item.id, item);

    for (let start = 1; start < totalPages; start += MAX_PARALLEL_PAGES) {
        const end = Math.min(start + MAX_PARALLEL_PAGES, totalPages);
        const batch = await Promise.all(
            Array.from({ length: end - start }, (_, i) =>
                fetchItemsPage(supabase, auditId, start + i, false),
            ),
        );
        for (const res of batch) {
            if (res.error) {
                throw new Error(`Chargement des articles impossible : ${res.error.message}`);
            }
            for (const item of (res.data ?? []) as unknown as StockAuditItem[]) {
                itemMap.set(item.id, item);
            }
        }
    }

    if (itemMap.size !== total) {
        console.warn(
            `[AUDIT_ITEMS_COUNT_MISMATCH] audit=${auditId} attendu=${total} reçu=${itemMap.size}`,
        );
    }

    return Array.from(itemMap.values());
}

// ─── Scope (inchangé) ────────────────────────────────────────────────────

interface ProfileAccess {
    role: string | null;
    shop_access_type: string | null;
    assigned_shops: unknown;
}

function canAccessShop(profile: ProfileAccess | null, shopId: string): boolean {
    if (!profile) return false;
    if (profile.role === "admin" || profile.shop_access_type === "all") return true;
    return (
        Array.isArray(profile.assigned_shops) &&
        (profile.assigned_shops as string[]).includes(shopId)
    );
}

// ─── Metadata ────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    try {
        const audit = await getAudit(id);
        if (!audit) return { title: "Audit introuvable | Stock" };
        return {
            title: `Audit ${audit.reference} - ${audit.shop_name} | Stock`,
            description: "Interface de comptage au scanner et gestion de la démarque.",
        };
    } catch {
        return { title: "Audit | Stock" };
    }
}

// ─── UI ──────────────────────────────────────────────────────────────────

function AccessDenied() {
    return (
        <div
            role="alert"
            className="mx-auto mt-16 flex max-w-md flex-col items-center gap-5 rounded-lg border border-border/60 bg-card p-8 text-center shadow-2xs"
        >
            <div className="flex size-10 items-center justify-center rounded-full bg-rose-500/10 text-rose-600">
                <ShieldAlert className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
                <h1 className="text-[14px] font-semibold text-foreground">
                    Accès restreint
                </h1>
                <p className="text-[11px] text-muted-foreground/80">
                    Vous n&apos;avez pas accès aux audits de cette boutique.
                    Demandez à un administrateur de vous l&apos;attribuer.
                </p>
            </div>
            <Link
                href={AUDITS_LIST_HREF}
                className="inline-flex items-center gap-2 rounded-md border border-border/60 px-3 py-1.5 text-[11px] font-medium transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                Retour aux audits
            </Link>
        </div>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────

export default async function AuditDetailPage({ params }: PageProps) {
    const { id } = await params;

    // Auth garantie par app/inventory/layout.tsx
    const { profile } = await getServerAuth();
    if (!profile) return null;

    const audit = await getAudit(id);
    if (!audit) notFound();

    // Scope boutique — vérification AVANT le chargement lourd
    if (!canAccessShop(profile, audit.shop_id)) {
        return <AccessDenied />;
    }

    // Chargement des items
    const supabase = await createClient();
    const items = await fetchAllAuditItems(supabase, id);

    return <AuditScannerClient audit={audit} initialItems={items} />;
}