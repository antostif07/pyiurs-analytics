import { cn } from "@/lib/utils";
import { Radio, ScanLine } from "lucide-react";

export // ─── Toggle mode de scan ────────────────────────────────────

    function ScanModeToggle({
        mode,
        onChange,
    }: {
        mode: "barcode" | "rfid";
        onChange: (mode: "barcode" | "rfid") => void;
    }) {
    return (
        <div className="flex items-center gap-1 p-1 bg-muted/20 rounded-lg border border-border/60 w-fit">
            <button
                type="button"
                onClick={() => onChange("barcode")}
                className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors",
                    mode === "barcode"
                        ? "bg-background shadow-2xs text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                )}
            >
                <ScanLine className="w-3 h-3" />
                Code-barres
            </button>
            <button
                type="button"
                onClick={() => onChange("rfid")}
                className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors",
                    mode === "rfid"
                        ? "bg-background shadow-2xs text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                )}
            >
                <Radio className="w-3 h-3" />
                RFID
            </button>
        </div>
    );
}