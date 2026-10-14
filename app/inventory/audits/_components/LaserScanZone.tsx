"use client";

import React from "react";
import { ScanLine, Volume2, VolumeX, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
    inputRef: React.Ref<HTMLInputElement>;
    barcodeInput: string;
    setBarcodeInput: (val: string) => void;
    isScanning: boolean;
    soundEnabled: boolean;
    setSoundEnabled: (val: boolean) => void;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const LaserScanZone = React.memo(function LaserScanZone({
    inputRef,
    barcodeInput,
    setBarcodeInput,
    isScanning,
    soundEnabled,
    setSoundEnabled,
    onSubmit,
}: Props) {
    return (
        <div className="bg-card border-2 border-primary/40 rounded-lg p-3 sm:p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <ScanLine className="w-3.5 h-3.5 text-primary animate-pulse" />
                    <span className="hidden sm:inline">Scan pistolet laser · unitaire strict</span>
                    <span className="sm:hidden">Scanner</span>
                </label>
                <button
                    type="button"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                >
                    {soundEnabled ? (
                        <Volume2 className="w-3 h-3 text-emerald-600" />
                    ) : (
                        <VolumeX className="w-3 h-3" />
                    )}
                    <span>{soundEnabled ? "Bip On" : "Bip Off"}</span>
                </button>
            </div>

            <form onSubmit={onSubmit} className="flex gap-2">
                <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Scannez le code-barres..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    disabled={isScanning}
                    className="h-10 rounded-lg bg-muted/20 border-border/60 font-mono text-[12px] font-semibold pl-3"
                />
                <Button
                    type="submit"
                    disabled={isScanning || !barcodeInput.trim()}
                    className="h-10 px-4 rounded-lg font-semibold text-[11px] bg-primary"
                >
                    {isScanning ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        "Flash"
                    )}
                </Button>
            </form>
        </div>
    );
});