// components/purchases/purchase-order-selector.tsx
"use client";

import { CheckIcon, ChevronDownIcon } from "lucide-react";
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
        <div className="space-y-2">
            <Label htmlFor={id} className="text-xs font-black uppercase text-slate-400 tracking-wider">
                Sélectionner le Bon de Commande (PO)
            </Label>

            <Popover onOpenChange={setOpen} open={open}>
                <PopoverTrigger asChild>
                    <Button
                        aria-expanded={open}
                        className="w-full justify-between border-slate-200 dark:border-slate-800 bg-background px-3 font-normal outline-none outline-offset-0 hover:bg-background/80 focus-visible:outline-[3px] text-xs h-10 rounded-lg shadow-sm"
                        id={id}
                        role="combobox"
                        variant="outline"
                    >
                        <span className={cn("truncate font-medium", !selectedPoId && "text-muted-foreground")}>
                            {currentPo
                                ? `${currentPo.name} — ${currentPo.supplierName}`
                                : "Sélectionner un PO Odoo..."}
                        </span>
                        <ChevronDownIcon
                            aria-hidden="true"
                            className="shrink-0 text-muted-foreground/80 ml-2"
                            size={14}
                        />
                    </Button>
                </PopoverTrigger>

                <PopoverContent
                    align="start"
                    className="w-full min-w-[var(--radix-popper-anchor-width)] border-slate-200 dark:border-slate-800 p-0 rounded-xl overflow-hidden shadow-2xl"
                >
                    <Command>
                        <CommandInput
                            placeholder="Rechercher une référence ou un fournisseur..."
                            className="text-xs"
                        />
                        <CommandList className="max-h-60">
                            <CommandEmpty className="text-xs text-slate-400 p-4 text-center">
                                Aucun bon de commande trouvé.
                            </CommandEmpty>
                            <CommandGroup>
                                {purchaseOrders.map((po) => (
                                    <CommandItem
                                        key={po.id}
                                        onSelect={() => {
                                            // Si l'utilisateur clique sur le PO déjà sélectionné, on désélectionne
                                            const isAlreadySelected = po.id === selectedPoId;
                                            onSelectPo(isAlreadySelected ? null : po);
                                            setOpen(false);
                                        }}
                                        value={`${po.name} ${po.supplierName} ${po.supplierRef}`}
                                        className="text-xs font-medium cursor-pointer py-2 px-3"
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900 dark:text-slate-100">
                                                {po.name} <span className="text-slate-400 font-normal">({po.supplierName})</span>
                                            </span>
                                            {po.supplierRef && (
                                                <span className="text-[10px] text-slate-400 mt-0.5">
                                                    Réf Fournisseur : {po.supplierRef}
                                                </span>
                                            )}
                                        </div>
                                        {selectedPoId === po.id && (
                                            <CheckIcon className="ml-auto text-indigo-600 dark:text-indigo-400 shrink-0" size={14} />
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