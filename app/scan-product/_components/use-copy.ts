'use client';

import { useCallback, useState } from 'react';

export function useCopy(timeout = 1500) {
    const [copied, setCopied] = useState<string | null>(null);

    const copy = useCallback(
        async (value: string) => {
            try {
                await navigator.clipboard.writeText(value);
                setCopied(value);
                window.setTimeout(() => setCopied(null), timeout);
            } catch {
                /* noop */
            }
        },
        [timeout]
    );

    return { copied, copy };
}