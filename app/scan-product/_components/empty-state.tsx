'use client';

import { memo } from 'react';
import { PackageSearch } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default memo(function EmptyState() {
    return (
        <Card className="rounded-3xl border-dashed bg-card/60">
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
                    <PackageSearch className="h-6 w-6" />
                </span>
                <p className="text-sm font-medium">Aucun produit scanné</p>
                <p className="mx-auto max-w-xs text-xs text-muted-foreground">
                    Scannez un code-barres pour afficher la photo du produit et toutes les boutiques
                    qui le détiennent.
                </p>
            </CardContent>
        </Card>
    );
});