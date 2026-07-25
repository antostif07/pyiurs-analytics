"use client";

import { CheckIcon, ChevronDownIcon, FileText } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

// Interface stricte décrivant les données d'un PO Odoo requises pour l'importateur
export interface OdooPurchaseOrderOption {
    id: number;               // ID interne Odoo (ex: 142)
    name: string;             // Référence Odoo (ex: PO00042)
    externalId: string;       // ID Externe Odoo (ex: purchase.purchase_order_42)
    supplierRef: string;      // Référence Fournisseur (partner_ref dans Odoo)
    supplierId: number;       // ID du fournisseur Odoo (res.partner)
    supplierName: string;     // Nom complet du fournisseur
}

interface PurchaseOrderSelectorProps {
    purchaseOrders: OdooPurchaseOrderOption[];
    selectedPoId: number | null;
    onSelectPo: (po: OdooPurchaseOrderOption | null) => void;
}

export default function PurchaseOrderSelector({
    purchaseOrders,
    selectedPoId,
    onSelectPo
}: PurchaseOrderSelectorProps) {
    const id = useId();
    const [open, setOpen] = useState<boolean>(false);

    // Recherche de l'objet PO actuellement sélectionné
    const currentPo = purchaseOrders.find((po) => po.id === selectedPoId);

    return (
        <div className="space-y-1.5">
            <Label htmlFor={id} className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                Bon de Commande Odoo (PO d'Origine)
            </Label>

            <Popover onOpenChange={setOpen} open={open}>
                <PopoverTrigger asChild>
                    <Button
                        id={id}
                        role="combobox"
                        aria-expanded={open}
                        variant="outline"
                        className="w-full justify-between border-input bg-card text-foreground px-3.5 font-normal outline-none hover:bg-accent/40 text-xs h-10 rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                        <span className={cn("truncate font-medium", !selectedPoId && "text-muted-foreground")}>
                            {currentPo
                                ? `${currentPo.name} — ${currentPo.supplierName}`
                                : "Sélectionner un Bon de Commande Odoo..."}
                        </span>
                        <ChevronDownIcon
                            aria-hidden="true"
                            className="shrink-0 text-muted-foreground/60 ml-2"
                            size={14}
                        />
                    </Button>
                </PopoverTrigger>

                <PopoverContent
                    align="start"
                    className="w-full min-w-[var(--radix-popper-anchor-width)] border-border bg-popover text-popover-foreground p-0 rounded-2xl overflow-hidden shadow-2xl z-50"
                >
                    <Command className="bg-popover">
                        <CommandInput
                            placeholder="Rechercher par référence, PO ou fournisseur..."
                            className="text-xs h-9 border-b border-border"
                        />
                        <CommandList className="max-h-60 scrollbar-thin">
                            <CommandEmpty className="text-xs text-muted-foreground p-4 text-center font-light">
                                Aucun bon de commande trouvé.
                            </CommandEmpty>
                            <CommandGroup>
                                {purchaseOrders.map((po) => (
                                    <CommandItem
                                        key={po.id}
                                        value={`${po.name} ${po.supplierName} ${po.supplierRef || ""}`}
                                        onSelect={() => {
                                            const isAlreadySelected = po.id === selectedPoId;
                                            onSelectPo(isAlreadySelected ? null : po);
                                            setOpen(false);
                                        }}
                                        className="text-xs font-medium cursor-pointer py-2.5 px-3 flex items-center justify-between hover:bg-accent transition-colors"
                                    >
                                        <div className="flex flex-col min-w-0 pr-2">
                                            <div className="flex items-center gap-1.5 font-bold text-foreground">
                                                <FileText className="w-3 h-3 text-primary shrink-0" />
                                                <span>{po.name}</span>
                                                <span className="text-muted-foreground font-normal text-[11px] truncate">
                                                    ({po.supplierName})
                                                </span>
                                            </div>
                                            {po.supplierRef && (
                                                <span className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">
                                                    Réf Fournisseur : {po.supplierRef}
                                                </span>
                                            )}
                                        </div>
                                        {selectedPoId === po.id && (
                                            <CheckIcon className="text-primary shrink-0 ml-2" size={14} />
                                        )}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}