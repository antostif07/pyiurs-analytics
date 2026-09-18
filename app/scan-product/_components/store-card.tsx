'use client';

import { memo } from 'react';
import { MapPin } from 'lucide-react';
import { useCopy } from './use-copy';
import type { Store } from '../_lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface Props {
    store: Store;
}

export default memo(function StoreCard({ store }: Props) {
    const { copied, copy } = useCopy();
    const total = store.variants.reduce((acc, v) => acc + v.quantity, 0);

    const hasManager = !!store.managerName;
    const initials = hasManager
        ? store.managerName!
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
        : '?';

    const location = [store.address, store.city].filter(Boolean).join(' · ');

    return (
        <Card className="rounded-2xl transition hover:shadow-md">
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 p-4">
                <div className="min-w-0">
                    <CardTitle className="truncate text-base">{store.name}</CardTitle>
                    {location && (
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {location}
                        </p>
                    )}
                </div>
                <Badge
                    variant="outline"
                    className="shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700"
                >
                    {total} en stock
                </Badge>
            </CardHeader>

            <CardContent className="p-4 pt-0">
                {/* Responsable (optionnel) */}
                {hasManager && (
                    <>
                        <div className="flex items-center gap-2 rounded-xl bg-muted/50 p-2.5">
                            <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                    Responsable boutique
                                </p>
                                <p className="truncate text-sm font-medium">{store.managerName}</p>
                            </div>
                            {store.managerPhone && (
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1.5 font-mono text-[11px]"
                                >
                                    <a href={`tel:${store.managerPhone.replace(/\s/g, '')}`}>
                                        {store.managerPhone}
                                    </a>
                                </Button>
                            )}
                        </div>
                        <Separator className="my-3" />
                    </>
                )}

                {/* Variantes */}
                <ul className="divide-y">
                    {store.variants.map((v) => (
                        <li key={v.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                            <span
                                className="h-5 w-5 shrink-0 rounded-full ring-1 ring-border"
                                style={{ backgroundColor: v.colorHex }}
                                aria-hidden
                            />
                            <Badge variant="secondary" className="text-xs font-semibold">
                                {v.size}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{v.color}</span>
                            <button
                                type="button"
                                onClick={() => copy(v.barcode)}
                                className="font-mono text-[11px] text-muted-foreground underline decoration-dotted underline-offset-2 transition hover:text-primary"
                            >
                                {copied === v.barcode ? 'copié ✓' : v.barcode}
                            </button>
                            <span className="ml-auto flex items-center gap-3">
                                {typeof v.price === 'number' && (
                                    <span className="text-xs text-muted-foreground">
                                        {v.price.toLocaleString('fr-FR', {
                                            style: 'currency',
                                            currency: 'USD',
                                        })}
                                    </span>
                                )}
                                <span className="text-sm font-semibold">×{v.quantity}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
});