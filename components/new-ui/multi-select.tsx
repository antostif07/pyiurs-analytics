// components/ui/multi-select.tsx
"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

export interface MultiSelectOption {
    value: string;
    label: string;
    /** Regroupement optionnel (ex: "P.FEM", "P.BTY") */
    group?: string;
    /** Métadonnée affichée à droite (ex: date) */
    hint?: string;
    disabled?: boolean;
}

interface MultiSelectProps {
    options: MultiSelectOption[];
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    /** Nombre de badges affichés avant le "+N" */
    maxBadges?: number;
    className?: string;
    disabled?: boolean;
    /** Autorise la sélection/désélection par groupe */
    groupSelectable?: boolean;
}

export function MultiSelect({
    options,
    value,
    onChange,
    placeholder = "Sélectionner...",
    searchPlaceholder = "Rechercher...",
    emptyText = "Aucun résultat.",
    maxBadges = 2,
    className,
    disabled = false,
    groupSelectable = true,
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false);

    const selectedSet = React.useMemo(() => new Set(value), [value]);
    const selectedOptions = React.useMemo(
        () => options.filter((o) => selectedSet.has(o.value)),
        [options, selectedSet],
    );

    const toggle = (val: string) => {
        if (selectedSet.has(val)) {
            onChange(value.filter((v) => v !== val));
        } else {
            onChange([...value, val]);
        }
    };

    const toggleGroup = (items: MultiSelectOption[]) => {
        const ids = items.map((o) => o.value);
        const allSelected = ids.every((id) => selectedSet.has(id));
        if (allSelected) {
            onChange(value.filter((v) => !ids.includes(v)));
        } else {
            onChange([...new Set([...value, ...ids])]);
        }
    };

    const clearAll = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        onChange([]);
    };

    // Regrouper les options si `group` est défini
    const grouped = React.useMemo(() => {
        const map = new Map<string, MultiSelectOption[]>();
        for (const o of options) {
            const key = o.group ?? "";
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(o);
        }
        return Array.from(map.entries());
    }, [options]);

    const visibleBadges = selectedOptions.slice(0, maxBadges);
    const hiddenCount = selectedOptions.length - visibleBadges.length;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        "h-8 w-full justify-between px-2.5 text-[11.5px] font-normal",
                        "border-border/60 bg-muted/20 hover:bg-accent/30",
                        "focus-visible:ring-1 focus-visible:ring-primary/40",
                        className,
                    )}
                >
                    <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
                        {selectedOptions.length === 0 ? (
                            <span className="text-muted-foreground/60 truncate">
                                {placeholder}
                            </span>
                        ) : (
                            <>
                                {visibleBadges.map((o) => (
                                    <Badge
                                        key={o.value}
                                        variant="secondary"
                                        className="h-5 px-1.5 text-[10px] font-mono font-medium shrink-0 bg-muted/40"
                                    >
                                        {o.label}
                                    </Badge>
                                ))}
                                {hiddenCount > 0 && (
                                    <Badge
                                        variant="secondary"
                                        className="h-5 px-1.5 text-[10px] font-mono font-medium shrink-0 bg-muted/40"
                                    >
                                        +{hiddenCount}
                                    </Badge>
                                )}
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0 ml-1">
                        {selectedOptions.length > 0 && (
                            <span
                                role="button"
                                tabIndex={0}
                                onClick={clearAll}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ")
                                        clearAll();
                                }}
                                className="p-0.5 rounded hover:bg-accent/60 cursor-pointer text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-3 h-3" />
                            </span>
                        )}
                        <ChevronsUpDown className="w-3 h-3 opacity-50" />
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-[--radix-popover-trigger-width] p-0 rounded-lg shadow-2xl"
            >
                <Command>
                    <CommandInput
                        placeholder={searchPlaceholder}
                        className="h-8 text-[11.5px]"
                    />
                    <CommandList className="max-h-64">
                        <CommandEmpty className="py-4 text-[11px] text-muted-foreground/60 text-center">
                            {emptyText}
                        </CommandEmpty>
                        {grouped.map(([groupName, items], gi) => {
                            const allGroupSelected = items.every((o) =>
                                selectedSet.has(o.value),
                            );
                            return (
                                <React.Fragment
                                    key={groupName || "__nogroup"}
                                >
                                    {gi > 0 && <CommandSeparator />}
                                    <CommandGroup
                                        heading={
                                            groupName
                                                ? `${groupName} (${items.length})`
                                                : undefined
                                        }
                                        className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/70 [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:px-2"
                                    >
                                        {groupName && groupSelectable && (
                                            <CommandItem
                                                value={`__group__${groupName}`}
                                                onSelect={() =>
                                                    toggleGroup(items)
                                                }
                                                className="text-[10.5px] text-muted-foreground hover:text-foreground cursor-pointer italic"
                                            >
                                                <span className="flex-1">
                                                    {allGroupSelected
                                                        ? "Désélectionner tout"
                                                        : "Sélectionner tout"}
                                                </span>
                                            </CommandItem>
                                        )}
                                        {items.map((o) => {
                                            const checked = selectedSet.has(
                                                o.value,
                                            );
                                            return (
                                                <CommandItem
                                                    key={o.value}
                                                    value={`${o.label} ${o.hint ?? ""}`}
                                                    onSelect={() =>
                                                        toggle(o.value)
                                                    }
                                                    disabled={o.disabled}
                                                    className="text-[11.5px] cursor-pointer"
                                                >
                                                    <span
                                                        className={cn(
                                                            "mr-2 flex h-3.5 w-3.5 items-center justify-center rounded-sm border",
                                                            checked
                                                                ? "bg-primary border-primary text-primary-foreground"
                                                                : "border-border",
                                                        )}
                                                    >
                                                        {checked && (
                                                            <Check className="h-2.5 w-2.5" />
                                                        )}
                                                    </span>
                                                    <span className="flex-1 truncate">
                                                        {o.label}
                                                    </span>
                                                    {o.hint && (
                                                        <span className="text-[10px] text-muted-foreground/60 font-mono">
                                                            {o.hint}
                                                        </span>
                                                    )}
                                                </CommandItem>
                                            );
                                        })}
                                    </CommandGroup>
                                </React.Fragment>
                            );
                        })}
                    </CommandList>
                    {selectedOptions.length > 0 && (
                        <>
                            <CommandSeparator />
                            <div className="p-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearAll}
                                    className="w-full h-7 justify-center text-[10.5px] text-muted-foreground hover:text-foreground"
                                >
                                    Tout effacer ({selectedOptions.length})
                                </Button>
                            </div>
                        </>
                    )}
                </Command>
            </PopoverContent>
        </Popover>
    );
}