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
import { OdooOption } from "../import-actions";

interface NormalSelectorProps {
    data: OdooOption[];
    selected: string | null;
    onSelect: (value: OdooOption) => void;
    label?: string;
    placeholder?: string;
    emptyText?: string;
    className?: string;
}

export default function NormalSelector({
    data,
    selected,
    onSelect,
    label,
    placeholder = "Sélectionner une option...",
    emptyText = "Aucun résultat trouvé.",
    className
}: NormalSelectorProps) {
    const id = useId();
    const [open, setOpen] = useState<boolean>(false);

    // Recherche de l'option actuellement sélectionnée
    const currentOption = data.find((item) => item.name === selected);

    return (
        <div className="space-y-1.5 w-full">
            {label && (
                <Label htmlFor={id} className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                    {label}
                </Label>
            )}

            <Popover onOpenChange={setOpen} open={open}>
                <PopoverTrigger asChild>
                    <Button
                        id={id}
                        role="combobox"
                        aria-expanded={open}
                        variant="outline"
                        className={cn(
                            "w-full justify-between border-input bg-card text-foreground px-3 font-normal outline-none hover:bg-accent/40 text-xs h-9 rounded-xl shadow-xs transition-colors cursor-pointer",
                            className
                        )}
                    >
                        <span className={cn("truncate font-medium", !selected && "text-muted-foreground")}>
                            {currentOption ? currentOption.name : placeholder}
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
                            placeholder="Rechercher..."
                            className="text-xs h-9 border-b border-border"
                        />
                        <CommandList className="max-h-60 scrollbar-thin">
                            <CommandEmpty className="text-xs text-muted-foreground p-4 text-center font-light">
                                {emptyText}
                            </CommandEmpty>
                            <CommandGroup>
                                {data.map((item) => (
                                    <CommandItem
                                        key={item.id || item.name}
                                        value={item.name}
                                        onSelect={() => {
                                            onSelect(item);
                                            setOpen(false);
                                        }}
                                        className="text-xs font-medium cursor-pointer py-2 px-3 flex items-center justify-between hover:bg-accent transition-colors"
                                    >
                                        <span className="font-medium text-foreground truncate pr-2">
                                            {item.name}
                                        </span>
                                        {selected === item.name && (
                                            <CheckIcon className="text-primary shrink-0 ml-auto" size={14} />
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