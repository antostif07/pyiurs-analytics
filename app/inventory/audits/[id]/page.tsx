import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AuditScannerClient } from "./audit-scanner-client";
import type { StockAudit, StockAuditItem } from "../_lib/types";

interface PageProps {
    params: Promise<{ id: string }>;
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

// TODO: adapter à la route réelle de la liste des audits
const AUDITS_LIST_HREF = "/stock-audits";

// Doit rester <= au "max rows" de PostgREST (1 000 par défaut sur Supabase)
const PAGE_SIZE = 1000;
// Évite de lancer 50 requêtes d'un coup sur un très gros audit
const MAX_PARALLEL_PAGES = 5;

const ITEM_COLUMNS = `
  id, audit_id, odoo_product_id, product_name, internal_barcode,
  supplier_ref, hs_code, brand, color, theoretical_qty, counted_qty,
  unit_cost, scanned_at, odoo_create_date, sold_locations,
  pos_category_ids, pos_category_names
`.replace(/\s+/g, " ").trim();

/* -------------------------------------------------------------------------- */
/*  Accès aux données                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Mémorisé par requête HTTP (React cache) :
 * generateMetadata() et la page partagent UNE seule requête SQL.
 */
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
    withCount: boolean
) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    return supabase
        .from("stock_audit_items")
        .select(ITEM_COLUMNS, { count: withCount ? "exact" : undefined })
        .eq("audit_id", auditId)
        // internal_barcode est unique par audit => tri total, donc pagination déterministe
        .order("scanned_at", { ascending: false, nullsFirst: false })
        .order("internal_barcode", { ascending: true })
        .range(from, to);
}

/**
 * 1re page + décompte exact dans UNE requête (plus de requête "count" séparée),
 * puis pages restantes en parallèle par lots.
 * Toute erreur est propagée : un audit d'inventaire partiel affiché comme
 * complet est pire qu'une page d'erreur.
 */
async function fetchAllAuditItems(
    supabase: SupabaseServer,
    auditId: string
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
                fetchItemsPage(supabase, auditId, start + i, false)
            )
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
        // Peut arriver si des scans sont écrits pendant le chargement
        console.warn(
            `[AUDIT_ITEMS_COUNT_MISMATCH] audit=${auditId} attendu=${total} reçu=${itemMap.size}`
        );
    }

    return Array.from(itemMap.values());
}

/* -------------------------------------------------------------------------- */
/*  Permissions                                                               */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*  Métadonnées                                                               */
/* -------------------------------------------------------------------------- */

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;

    try {
        const audit = await getAudit(id);
        if (!audit) return { title: "Audit introuvable | Retail Intelligence" };

        return {
            title: `Audit ${audit.reference} - ${audit.shop_name} | Retail Intelligence`,
            description: "Interface de comptage au scanner et gestion de la démarque.",
        };
    } catch {
        return { title: "Audit | Retail Intelligence" };
    }
}

/* -------------------------------------------------------------------------- */
/*  UI                                                                        */
/* -------------------------------------------------------------------------- */

function AccessDenied() {
    return (
        <div
            role="alert"
            className="mx-auto mt-16 flex max-w-md flex-col items-center gap-5 rounded-2xl border border-border bg-card p-8 text-center"
        >
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <ShieldAlert className="size-6" aria-hidden="true" />
            </div>

            <div className="space-y-1.5">
                <h1 className="text-base font-semibold">Accès restreint</h1>
                <p className="text-sm text-muted-foreground">
                    Vous n&apos;avez pas accès aux audits de cette boutique. Demandez à un
                    administrateur de vous l&apos;attribuer.
                </p>
            </div>

            <Link
                href={AUDITS_LIST_HREF}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Retour aux audits
            </Link>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default async function AuditDetailPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Authentification
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // 2. Profil + audit en parallèle (requêtes légères, indépendantes)
    const [{ data: profile }, audit] = await Promise.all([
        supabase
            .from("profiles")
            .select("role, shop_access_type, assigned_shops")
            .eq("id", user.id)
            .maybeSingle(),
        getAudit(id),
    ]);

    if (!audit) notFound();

    // 3. Contrôle d'accès AVANT de charger les articles (la requête lourde)
    if (!canAccessShop(profile as ProfileAccess | null, audit.shop_id)) {
        return <AccessDenied />;
    }

    // 4. Chargement des articles, uniquement pour un utilisateur autorisé
    const items = await fetchAllAuditItems(supabase, id);

    return <AuditScannerClient audit={audit} initialItems={items} />;
}