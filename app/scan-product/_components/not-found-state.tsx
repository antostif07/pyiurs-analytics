'use client';

import { memo } from 'react';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props {
    code: string;
}

export default memo(function NotFoundState({ code }: Props) {
    return (
        <Card className="rounded-3xl border-destructive/30 bg-destructive/5">
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
                    <AlertCircle className="h-6 w-6" />
                </span>
                <p className="text-sm font-semibold text-destructive">Produit introuvable</p>
                <p className="text-xs text-muted-foreground">
                    Aucune référence ne correspond au code{' '}
                    <Badge variant="outline" className="font-mono text-[11px]">
                        {code}
                    </Badge>
                </p>
            </CardContent>
        </Card>
    );
});