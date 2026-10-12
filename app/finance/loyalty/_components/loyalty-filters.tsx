// app/finance/loyalty/_components/loyalty-filters.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { CalendarIcon, Loader2, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface LoyaltyFiltersProps {
    /** ISO yyyy-MM-dd */
    date: string;
    /** ISO yyyy-MM-dd (aujourd'hui selon Kinshasa) */
    today: string;
}

export default function LoyaltyFilters({
    date,
    today,
}: LoyaltyFiltersProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const updateUrl = (params: URLSearchParams) => {
        const qs = params.toString();
        startTransition(() => {
            router.replace(qs ? `${pathname}?${qs}` : pathname, {
                scroll: false,
            });
        });
    };

    const handleSelect = (next: Date | undefined) => {
        if (!next) return;
        const url = new URLSearchParams(searchParams.toString());
        const iso = format(next, "yyyy-MM-dd");
        // Si on revient à aujourd'hui, on nettoie l'URL
        if (iso === today) url.delete("date");
        else url.set("date", iso);
        updateUrl(url);
    };

    const handleReset = () => {
        const url = new URLSearchParams(searchParams.toString());
        url.delete("date");
        updateUrl(url);
    };

    const isToday = date === today;

    return (
        <div
            className={cn(
                "flex flex-wrap items-center gap-1.5 transition-opacity",
                isPending && "opacity-60",
            )}
        >
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[11px] gap-1.5 font-normal"
                    >
                        <CalendarIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                        {format(parseISO(date), "dd MMM yyyy", { locale: fr })}
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    align="start"
                    className="w-auto p-0 rounded-xl shadow-2xl"
                >
                    <Calendar
                        mode="single"
                        locale={fr}
                        defaultMonth={parseISO(date)}
                        selected={parseISO(date)}
                        onSelect={handleSelect}
                        className="p-3"
                    />
                </PopoverContent>
            </Popover>

            {!isToday && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="h-7 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                >
                    <X className="w-3 h-3" />
                    Aujourd&apos;hui
                </Button>
            )}

            {isPending && (
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground/60 shrink-0" />
            )}
        </div>
    );
}