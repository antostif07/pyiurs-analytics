"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarIcon, History, Store } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ShopOption } from "../_lib/types";

interface ClotureFiltersProps {
    date: string;
    shop: string;
    shops: ShopOption[];
    exchangeRate: number;
}

const selectClass =
    "h-7 text-[11.5px] bg-secondary/60 border-border hover:border-ring/60 focus:border-ring text-foreground/80 rounded-lg";

export default function ClotureFilters({
    date,
    shop,
    shops,
    exchangeRate,
}: ClotureFiltersProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [open, setOpen] = useState(false);

    const parsedDate = parseISO(date);

    const updateUrl = (params: URLSearchParams) => {
        const qs = params.toString();
        window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    };

    const handleDateSelect = (d: Date | undefined) => {
        if (!d) return;
        const next = new URLSearchParams(searchParams.toString());
        next.set("date", format(d, "yyyy-MM-dd"));
        updateUrl(next);
        setOpen(false);
    };

    const handleShopChange = (val: string) => {
        const next = new URLSearchParams(searchParams.toString());
        if (val === "all") next.delete("shop");
        else next.set("shop", val);
        updateUrl(next);
    };

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-[11px] gap-1.5 font-normal"
                    >
                        <CalendarIcon className="w-3 h-3 text-muted-foreground" />
                        {format(parsedDate, "dd MMM yyyy", { locale: fr })}
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0 rounded-xl shadow-2xl">
                    <Calendar
                        mode="single"
                        locale={fr}
                        selected={parsedDate}
                        onSelect={handleDateSelect}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>

            {shops.length > 1 ? (
                <Select value={shop} onValueChange={handleShopChange}>
                    <SelectTrigger className={cn(selectClass, "w-[175px]")}>
                        <Store className="w-3 h-3 text-muted-foreground shrink-0" />
                        <SelectValue placeholder="Toutes boutiques" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-xs">
                            Toutes boutiques ({shops.length})
                        </SelectItem>
                        {shops.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                                {s.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : shops.length === 1 ? (
                <Badge variant="outline" className="h-7 px-2.5 text-[11px] font-medium">
                    <Store className="w-3 h-3 mr-1 text-muted-foreground" />
                    {shops[0].name}
                </Badge>
            ) : null}

            <Badge
                variant="outline"
                className="h-7 px-2.5 text-[11px] font-mono bg-sky-50/60 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/60"
            >
                {exchangeRate.toLocaleString("fr-FR")} FC/$
            </Badge>

            <Button asChild variant="outline" size="sm" className="h-7 px-2.5 text-[11px] gap-1.5">
                <Link href="/revenue/cloture-vente/historique">
                    <History className="w-3 h-3" />
                    Historique
                </Link>
            </Button>
        </div>
    );
}