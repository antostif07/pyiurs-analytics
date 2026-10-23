// app/inventory/_components/inventory-filters.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Building2, Layers, Loader2, Search } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
    InventoryFilterState,
    InventorySegment,
} from "../_lib/filters";

interface CompanyOption {
    id: string;
    name: string;
    odooCompanyId: number;
}

interface Props {
    filters: InventoryFilterState;
    companies: CompanyOption[];
}

const SEGMENTS: { value: InventorySegment; label: string }[] = [
    { value: "Tous", label: "Tous segments" },
    { value: "Femme", label: "Femme" },
    { value: "Beauty", label: "Beauty" },
    { value: "Enfant", label: "Enfant" },
];

const selectClass =
    "h-7 text-[11.5px] bg-secondary/60 border-border hover:border-ring/60 focus:border-ring text-foreground/80 rounded-lg";

export default function InventoryFilters({ filters, companies }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const updateUrl = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        for (const [k, v] of Object.entries(updates)) {
            if (v === null || v === "") params.delete(k);
            else params.set(k, v);
        }
        const qs = params.toString();
        startTransition(() => {
            router.replace(qs ? `${pathname}?${qs}` : pathname, {
                scroll: false,
            });
        });
    };

    return (
        <div
            className={cn(
                "flex flex-wrap items-center gap-1.5 transition-opacity",
                isPending && "opacity-60",
            )}
        >
            {/* Company */}
            <Select
                value={
                    filters.companyId !== null
                        ? String(filters.companyId)
                        : "all"
                }
                onValueChange={(v) =>
                    updateUrl({ company: v === "all" ? null : v })
                }
            >
                <SelectTrigger className={cn(selectClass, "w-[180px]")}>
                    <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all" className="text-xs">
                        Toutes les compagnies
                    </SelectItem>
                    {companies.map((c) => (
                        <SelectItem
                            key={c.id}
                            value={String(c.odooCompanyId)}
                            className="text-xs"
                        >
                            {c.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Segment */}
            <Select
                value={filters.segment}
                onValueChange={(v) =>
                    updateUrl({ segment: v === "Tous" ? null : v })
                }
            >
                <SelectTrigger className={cn(selectClass, "w-[140px]")}>
                    <Layers className="w-3 h-3 text-muted-foreground shrink-0" />
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {SEGMENTS.map((s) => (
                        <SelectItem
                            key={s.value}
                            value={s.value}
                            className="text-xs"
                        >
                            {s.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/60 pointer-events-none" />
                <Input
                    type="text"
                    placeholder="Rechercher…"
                    defaultValue={filters.search}
                    onBlur={(e) =>
                        updateUrl({
                            search: e.target.value.trim() || null,
                        })
                    }
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            updateUrl({
                                search:
                                    e.currentTarget.value.trim() || null,
                            });
                        }
                    }}
                    className="h-7 w-48 pl-7 text-[11.5px] bg-secondary/60"
                />
            </div>

            {isPending && (
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground/60 shrink-0" />
            )}
        </div>
    );
}