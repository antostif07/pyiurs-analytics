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
        <div className="bg-card border-2 border-primary/30 rounded-2xl p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <ScanLine className="w-4 h-4 text-primary animate-pulse" /> Scan Pistolet Laser (Unitaire Strict)
                </label>
                <button
                    type="button"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                >
                    {soundEnabled ? (
                        <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                        <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    <span className="text-[10px]">{soundEnabled ? "Bip On" : "Bip Off"}</span>
                </button>
            </div>

            <form onSubmit={onSubmit} className="flex gap-2">
                <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Scannez le code-barres unitaire..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    disabled={isScanning}
                    className="h-11 rounded-xl bg-muted/20 border-input font-mono text-sm text-foreground focus:ring-2 focus:ring-primary pl-4 font-bold"
                />
                <Button
                    type="submit"
                    disabled={isScanning || !barcodeInput.trim()}
                    className="h-11 px-6 rounded-xl font-bold text-xs bg-primary text-primary-foreground cursor-pointer"
                >
                    {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Flash (1/1)"}
                </Button>
            </form>
        </div>
    );
});