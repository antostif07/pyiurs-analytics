'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScanBarcode } from 'lucide-react';

interface Props {
    onScan: (code: string) => void;
    onReset: () => void;
    showReset: boolean;
}

export default function ScanInput({ onScan, onReset, showReset }: Props) {
    const [value, setValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        const code = value.trim();

        if (!code) return;

        onScan(code);

        // Vide le champ après le scan
        setValue('');

        // IMPORTANT :
        // On ne remet PAS le focus automatiquement.
        // Le clavier mobile reste donc fermé après le résultat.
        inputRef.current?.blur();
    };

    return (
        <div className="rounded-3xl border bg-card p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <ScanBarcode className="h-5 w-5" />
                </span>

                <div className="min-w-0">
                    <p className="text-sm font-semibold">
                        Scannez un code-barres
                    </p>

                    <p className="text-xs text-muted-foreground">
                        Utilisez le scanner ou saisissez le code manuellement
                    </p>
                </div>
            </div>

            <form onSubmit={submit} className="flex gap-2">
                <Input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    inputMode="numeric"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Code-barres…"
                    aria-label="Code-barres du produit"
                    className="flex-1 font-mono"
                />

                <Button type="submit">
                    OK
                </Button>
            </form>

            {showReset && (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation();
                        onReset();

                        // Pas de focus automatique ici non plus
                        inputRef.current?.blur();
                    }}
                    className="mt-2 w-full text-muted-foreground"
                >
                    Réinitialiser la recherche
                </Button>
            )}
        </div>
    );
}