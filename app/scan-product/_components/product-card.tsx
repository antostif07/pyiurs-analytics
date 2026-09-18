'use client';

import { memo, useMemo } from 'react';
import { Package, Store, Layers } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCopy } from './use-copy';
import { getProductStats } from '../_lib/stats';
import { Product } from '../_lib/types';

interface Props {
    product: Product;
}

export default memo(function ProductCard({ product }: Props) {
    const stats = useMemo(() => getProductStats(product), [product]);
    const { copied, copy } = useCopy();

    return (
        <Card className="overflow-hidden rounded-3xl">
            <CardContent className="flex gap-4 p-4 sm:gap-5 sm:p-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={product.image}
                    alt={product.name}
                    className="h-24 w-24 shrink-0 rounded-2xl object-cover sm:h-32 sm:w-32"
                />
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-primary">
                        {product.brand}
                    </p>
                    <h2 className="mt-0.5 text-base font-semibold leading-snug sm:text-lg">
                        {product.name}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                        {product.description}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-[11px]">
                            {product.barcode}
                        </Badge>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copy(product.barcode)}
                            className="h-6 px-2 text-[11px]"
                        >
                            {copied === product.barcode ? 'Copié ✓' : 'Copier'}
                        </Button>
                    </div>
                </div>
            </CardContent>

            <Separator />

            <CardFooter className="grid grid-cols-3 divide-x p-0">
                <StatBlock icon={Store} value={stats.storeCount} label="Boutiques" />
                <StatBlock icon={Package} value={stats.totalStock} label="Articles" />
                <StatBlock icon={Layers} value={stats.variantCount} label="Variantes" />
            </CardFooter>
        </Card>
    );
});

function StatBlock({
    icon: Icon,
    value,
    label,
}: {
    icon: React.ElementType;
    value: number;
    label: string;
}) {
    return (
        <div className="flex flex-col items-center gap-0.5 px-3 py-3 text-center">
            <Icon className="mb-1 h-4 w-4 text-muted-foreground" />
            <p className="text-lg font-semibold sm:text-xl">{value}</p>
            <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
    );
}