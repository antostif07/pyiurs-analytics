'use client';

import { useCallback, useMemo, useState } from 'react';
import {
    AlertCircle,
    Boxes,
    ChevronDown,
    Loader2,
    Package,
    RefreshCcw,
    Scan,
    Store as StoreIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import ScanInput from './_components/scan-input';
import EmptyState from './_components/empty-state';
import NotFoundState from './_components/not-found-state';

import type { Product, Store, Variant } from './_lib/types';

type Status = 'idle' | 'loading' | 'found' | 'notfound' | 'error';

type ProductFamily = {
    hsCode: string;
    name: string;
    brand: string;
    description: string;
    image: string;
    stores: Store[];
    totalQuantity: number;
};

function buildProductFamily(products: Product[]): ProductFamily | null {
    if (!products.length) {
        return null;
    }

    const first = products[0];

    if (!first) {
        return null;
    }

    const storesMap = new Map<string, Store>();

    for (const product of products) {
        for (const store of product.stores ?? []) {
            const existingStore = storesMap.get(store.id);

            if (!existingStore) {
                storesMap.set(store.id, {
                    ...store,
                    variants: [...(store.variants ?? [])],
                });

                continue;
            }

            existingStore.variants.push(
                ...(store.variants ?? [])
            );
        }
    }

    const stores = Array.from(storesMap.values());

    const totalQuantity = stores.reduce(
        (total, store) =>
            total +
            store.variants.reduce(
                (storeTotal, variant) =>
                    storeTotal + Number(variant.quantity || 0),
                0
            ),
        0
    );

    return {
        hsCode: first.hsCode ?? '',
        name: cleanFamilyName(first.name, first.hsCode),
        brand: first.brand,
        description: first.description,
        image: first.image,
        stores,
        totalQuantity,
    };
}

/**
 * Le premier produit donne le nom de la famille.
 *
 * Exemple :
 * ELS043842629 - Ensemble Khaki - 9538 - S - [VF217642]
 *
 * devient :
 * ELS043842629 - Ensemble Khaki
 */
function cleanFamilyName(
    name: string,
    hsCode?: string
): string {
    if (!name) {
        return 'Produit';
    }

    let result = name;

    // Supprime [VF217642]
    result = result.replace(
        /\s*\[[^\]]+\]\s*$/,
        ''
    );

    // Supprime la taille finale
    result = result.replace(
        /\s*-\s*(XS|S|M|L|XL|XXL|XXXL|XXXXL|XXXXXL)\s*$/i,
        ''
    );

    // Supprime le HS Code
    if (hsCode) {
        result = result.replace(
            new RegExp(
                `\\s*-\\s*${escapeRegExp(hsCode)}\\s*`,
                'i'
            ),
            ' - '
        );
    }

    // Nettoyage
    result = result
        .replace(/\s+-\s+-\s+/g, ' - ')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s*-\s*$/, '')
        .trim();

    return result;
}

function escapeRegExp(value: string) {
    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
    );
}

/**
 * Regroupe les variantes identiques.
 *
 * Si plusieurs produits ont exactement :
 * taille + couleur + barcode
 * on additionne leurs quantités.
 */
function mergeVariants(variants: Variant[]): Variant[] {
    const map = new Map<string, Variant>();

    for (const variant of variants) {
        const key = [
            variant.barcode,
            variant.size,
            variant.color,
        ]
            .map((value) => value?.trim().toLowerCase())
            .join('|');

        const existing = map.get(key);

        if (existing) {
            existing.quantity += Number(
                variant.quantity || 0
            );
        } else {
            map.set(key, {
                ...variant,
                quantity: Number(
                    variant.quantity || 0
                ),
            });
        }
    }

    return Array.from(map.values());
}

function getStoreQuantity(store: Store) {
    return store.variants.reduce(
        (total, variant) =>
            total + Number(variant.quantity || 0),
        0
    );
}

function getStoreReferenceCount(store: Store) {
    return mergeVariants(store.variants).length;
}

/* =========================================================
   STORE ROW
========================================================= */

function StoreRow({
    store,
}: {
    store: Store;
}) {
    const [open, setOpen] = useState(false);

    const variants = useMemo(
        () => mergeVariants(store.variants),
        [store.variants]
    );

    const quantity = useMemo(
        () => getStoreQuantity(store),
        [store]
    );

    const referenceCount = variants.length;

    return (
        <div className="overflow-hidden rounded-2xl border bg-background">
            {/* STORE HEADER */}

            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/40 sm:px-5"
            >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <StoreIcon className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold">
                            {store.name}
                        </h3>

                        {quantity > 0 && (
                            <span className="hidden h-2 w-2 rounded-full bg-emerald-500 sm:block" />
                        )}
                    </div>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {referenceCount} référence
                        {referenceCount > 1 ? 's' : ''}
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                        <p className="text-base font-bold tabular-nums">
                            {quantity}
                        </p>

                        <p className="text-[10px] text-muted-foreground">
                            unité{quantity !== 1 ? 's' : ''}
                        </p>
                    </div>

                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border">
                        <ChevronDown
                            className={`h-4 w-4 transition-transform duration-200 ${open
                                    ? 'rotate-180'
                                    : ''
                                }`}
                        />
                    </div>
                </div>
            </button>

            {/* DETAILS */}

            {open && (
                <div className="border-t bg-muted/20">
                    {/* Desktop header */}

                    <div className="hidden grid-cols-[90px_1fr_170px_80px] border-b px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
                        <span>Taille</span>
                        <span>Couleur</span>
                        <span>Code-barres</span>
                        <span className="text-right">
                            Qté
                        </span>
                    </div>

                    <div className="divide-y">
                        {variants.map((variant) => (
                            <VariantRow
                                key={`${store.id}-${variant.id}-${variant.barcode}`}
                                variant={variant}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* =========================================================
   VARIANT ROW
========================================================= */

function VariantRow({
    variant,
}: {
    variant: Variant;
}) {
    return (
        <div className="px-4 py-3 sm:px-5">
            {/* DESKTOP */}

            <div className="hidden items-center sm:grid sm:grid-cols-[90px_1fr_170px_80px]">
                <div>
                    <Badge
                        variant="secondary"
                        className="font-medium"
                    >
                        {variant.size || '—'}
                    </Badge>
                </div>

                <div className="flex items-center gap-2">
                    {variant.colorHex && (
                        <span
                            className="h-4 w-4 rounded-full border shadow-sm"
                            style={{
                                backgroundColor:
                                    variant.colorHex,
                            }}
                        />
                    )}

                    <span className="text-sm">
                        {variant.color || '—'}
                    </span>
                </div>

                <code className="text-xs text-muted-foreground">
                    {variant.barcode || '—'}
                </code>

                <span className="text-right text-sm font-semibold tabular-nums">
                    {variant.quantity}
                </span>
            </div>

            {/* MOBILE */}

            <div className="flex items-center gap-3 sm:hidden">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold">
                    {variant.size || '—'}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        {variant.colorHex && (
                            <span
                                className="h-3.5 w-3.5 rounded-full border"
                                style={{
                                    backgroundColor:
                                        variant.colorHex,
                                }}
                            />
                        )}

                        <span className="truncate text-sm font-medium">
                            {variant.color || '—'}
                        </span>
                    </div>

                    <code className="mt-1 block truncate text-[10px] text-muted-foreground">
                        {variant.barcode || '—'}
                    </code>
                </div>

                <div className="text-right">
                    <p className="text-sm font-bold tabular-nums">
                        {variant.quantity}
                    </p>

                    <p className="text-[9px] text-muted-foreground">
                        unités
                    </p>
                </div>
            </div>
        </div>
    );
}

/* =========================================================
   FAMILY CARD
========================================================= */

function FamilyCard({
    family,
}: {
    family: ProductFamily;
}) {
    const storesWithStock = family.stores.filter(
        (store) => getStoreQuantity(store) > 0
    );

    const storesWithoutStock = family.stores.filter(
        (store) => getStoreQuantity(store) === 0
    );

    return (
        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
            {/* FAMILY HEADER */}

            <div className="p-4 sm:p-6">
                <div className="flex gap-4 sm:gap-5">
                    {/* IMAGE */}

                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border bg-muted sm:h-32 sm:w-32">
                        {family.image ? (
                            <img
                                src={family.image}
                                alt={family.name}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center">
                                <Package className="h-8 w-8 text-muted-foreground" />
                            </div>
                        )}
                    </div>

                    {/* INFO */}

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            {family.brand && (
                                <Badge variant="secondary">
                                    {family.brand}
                                </Badge>
                            )}

                            {family.hsCode && (
                                <Badge
                                    variant="outline"
                                    className="font-mono"
                                >
                                    HS {family.hsCode}
                                </Badge>
                            )}
                        </div>

                        <h2 className="mt-2 text-lg font-bold tracking-tight sm:text-2xl">
                            {family.name}
                        </h2>

                        {family.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                                {family.description}
                            </p>
                        )}

                        {/* STATS */}

                        <div className="mt-4 flex flex-wrap gap-2">
                            <div className="rounded-xl border bg-muted/30 px-3 py-2">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                    Boutiques
                                </p>

                                <p className="mt-0.5 text-sm font-bold">
                                    {family.stores.length}
                                </p>
                            </div>

                            <div className="rounded-xl border bg-muted/30 px-3 py-2">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                    Stock total
                                </p>

                                <p className="mt-0.5 text-sm font-bold">
                                    {family.totalQuantity}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* STOCK */}

            <div className="border-t bg-muted/20 p-3 sm:p-4">
                <div className="mb-3 flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <Boxes className="h-4 w-4 text-muted-foreground" />

                        <h3 className="text-sm font-semibold">
                            Stock par boutique
                        </h3>
                    </div>

                    <span className="text-xs text-muted-foreground">
                        Cliquez pour voir les références
                    </span>
                </div>

                <div className="space-y-2">
                    {storesWithStock.map((store) => (
                        <StoreRow
                            key={store.id}
                            store={store}
                        />
                    ))}

                    {storesWithoutStock.map((store) => (
                        <StoreRow
                            key={store.id}
                            store={store}
                        />
                    ))}
                </div>
            </div>

            {/* FOOTER */}

            <div className="flex items-center justify-between border-t px-4 py-3 text-[11px] text-muted-foreground sm:px-5">
                <span>
                    {storesWithStock.length} boutique
                    {storesWithStock.length > 1
                        ? 's'
                        : ''}{' '}
                    avec stock
                </span>

                <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Odoo · Live
                </span>
            </div>
        </section>
    );
}

/* =========================================================
   PAGE
========================================================= */

export default function ScanProductPage() {
    const [status, setStatus] =
        useState<Status>('idle');

    const [products, setProducts] = useState<Product[]>(
        []
    );

    const [lastCode, setLastCode] = useState('');

    const [errorMsg, setErrorMsg] = useState('');

    const handleScan = useCallback(
        async (code: string) => {
            const normalizedCode = code.trim();

            if (!normalizedCode) {
                return;
            }

            setLastCode(normalizedCode);
            setStatus('loading');
            setErrorMsg('');
            setProducts([]);

            try {
                const res = await fetch(
                    `/api/scan-product?barcode=${encodeURIComponent(
                        normalizedCode
                    )}`,
                    {
                        cache: 'no-store',
                    }
                );

                if (res.status === 404) {
                    setStatus('notfound');
                    return;
                }

                if (!res.ok) {
                    const data = await res
                        .json()
                        .catch(() => ({}));

                    setErrorMsg(
                        data.error ??
                        `Erreur HTTP ${res.status}`
                    );

                    setStatus('error');
                    return;
                }

                const data = (await res.json()) as {
                    found?: boolean;
                    products?: Product[];
                };

                const list = Array.isArray(
                    data.products
                )
                    ? data.products
                    : [];

                if (
                    data.found &&
                    list.length > 0
                ) {
                    setProducts(list);
                    setStatus('found');
                } else {
                    setStatus('notfound');
                }
            } catch (error) {
                setErrorMsg(
                    error instanceof Error
                        ? error.message
                        : 'Erreur réseau.'
                );

                setStatus('error');
            }
        },
        []
    );

    const reset = useCallback(() => {
        setProducts([]);
        setStatus('idle');
        setLastCode('');
        setErrorMsg('');
    }, []);

    /*
     * On ne crée qu'une famille.
     *
     * Ton API renvoie plusieurs produits mais ils ont
     * tous le même HS Code.
     */
    const family = useMemo(
        () => buildProductFamily(products),
        [products]
    );

    return (
        <main className="min-h-screen bg-muted/30 text-foreground">
            {/* =================================================
                HEADER
            ================================================= */}

            <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-xl">
                <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                        <Scan className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-base font-semibold">
                            Scan Produit
                        </h1>

                        <p className="truncate text-xs text-muted-foreground">
                            Localisation du stock
                            multi-boutiques
                        </p>
                    </div>

                    <Badge
                        variant="secondary"
                        className="hidden items-center gap-1.5 sm:inline-flex"
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Odoo · Live
                    </Badge>

                    {status !== 'idle' && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={reset}
                            title="Nouvelle recherche"
                        >
                            <RefreshCcw className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </header>

            {/* =================================================
                CONTENT
            ================================================= */}

            <div className="mx-auto max-w-5xl space-y-5 px-4 py-5 sm:px-6 lg:py-7">
                {/* SCANNER */}

                <div className="rounded-3xl border bg-card p-4 shadow-sm sm:p-5">
                    <ScanInput
                        onScan={handleScan}
                        onReset={reset}
                        showReset={status !== 'idle'}
                    />
                </div>

                {/* =================================================
                    IDLE
                ================================================= */}

                {status === 'idle' && (
                    <EmptyState />
                )}

                {/* =================================================
                    LOADING
                ================================================= */}

                {status === 'loading' && (
                    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border bg-card p-8 text-center shadow-sm">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                            <Loader2 className="h-7 w-7 animate-spin text-primary" />
                        </div>

                        <h2 className="font-semibold">
                            Recherche en cours
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Vérification du stock
                            dans Odoo…
                        </p>

                        <Badge
                            variant="outline"
                            className="mt-4 font-mono"
                        >
                            {lastCode}
                        </Badge>
                    </div>
                )}

                {/* =================================================
                    NOT FOUND
                ================================================= */}

                {status === 'notfound' && (
                    <NotFoundState
                        code={lastCode}
                    />
                )}

                {/* =================================================
                    ERROR
                ================================================= */}

                {status === 'error' && (
                    <div className="rounded-3xl border border-destructive/20 bg-card p-8 text-center shadow-sm">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
                            <AlertCircle className="h-7 w-7 text-destructive" />
                        </div>

                        <h2 className="font-semibold text-destructive">
                            Erreur lors de la recherche
                        </h2>

                        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                            {errorMsg}
                        </p>

                        <Button
                            variant="outline"
                            className="mt-5"
                            onClick={() =>
                                handleScan(
                                    lastCode
                                )
                            }
                        >
                            Réessayer
                        </Button>
                    </div>
                )}

                {/* =================================================
                    FOUND
                ================================================= */}

                {status === 'found' &&
                    family && (
                        <div className="space-y-4">
                            {/* RESULT INFO */}

                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm font-semibold">
                                        Produit trouvé
                                    </p>

                                    <p className="text-xs text-muted-foreground">
                                        Stock regroupé par
                                        boutique
                                    </p>
                                </div>

                                <Badge
                                    variant="outline"
                                    className="w-fit font-mono"
                                >
                                    {lastCode}
                                </Badge>
                            </div>

                            {/* FAMILY */}

                            <FamilyCard
                                family={family}
                            />
                        </div>
                    )}
            </div>
        </main>
    );
}