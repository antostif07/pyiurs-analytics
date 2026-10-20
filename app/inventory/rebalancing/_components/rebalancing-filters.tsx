// app/inventory/rebalancing/_components/rebalancing-filters.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Building2, Loader2 } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { RebalancingCompany } from "../_lib/types";

interface RebalancingFiltersProps {
    companies: RebalancingCompany[];
    currentCompanyId: number | null;
}

const selectClass =
    "h-7 text-[11.5px] bg-secondary/60 border-border hover:border-ring/60 focus:border-ring text-foreground/80 rounded-lg";

export default function RebalancingFilters({
    companies,
    currentCompanyId,
}: RebalancingFiltersProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const handleChange = (value: string) => {
        const next = new URLSearchParams(searchParams.toString());
        if (value === "all") next.delete("company");
        else next.set("company", value);

        const qs = next.toString();
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
            <Select
                value={
                    currentCompanyId !== null
                        ? String(currentCompanyId)
                        : "all"
                }
                onValueChange={handleChange}
            >
                <SelectTrigger
                    className={cn(selectClass, "w-[200px]")}
                >
                    <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Sélectionner une compagnie" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all" className="text-xs">
                        Sélectionner une compagnie
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

            {isPending && (
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground/60 shrink-0" />
            )}
        </div>
    );
}