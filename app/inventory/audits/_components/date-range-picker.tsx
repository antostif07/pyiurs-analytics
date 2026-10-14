import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

interface DateRangeValue {
    from: string | null;
    to: string | null;
}

export function DateRangePicker({
    value,
    onChange,
}: {
    value: DateRangeValue;
    onChange: (v: DateRangeValue) => void;
}) {
    const range: DateRange | undefined =
        value.from || value.to
            ? {
                from: value.from ? parseISO(value.from) : undefined,
                to: value.to ? parseISO(value.to) : undefined,
            }
            : undefined;

    const handleSelect = (r: DateRange | undefined) => {
        if (!r?.from) {
            onChange({ from: null, to: null });
            return;
        }
        onChange({
            from: format(r.from, "yyyy-MM-dd"),
            to: r.to ? format(r.to, "yyyy-MM-dd") : format(r.from, "yyyy-MM-dd"),
        });
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        "h-8 w-full justify-start px-2.5 text-[11px] font-normal rounded-lg",
                        (value.from || value.to) &&
                        "border-primary/40 bg-primary/5",
                    )}
                >
                    <CalendarIcon className="w-3 h-3 mr-1.5 text-muted-foreground shrink-0" />
                    {range?.from ? (
                        <>
                            {format(range.from, "dd MMM", { locale: fr })}
                            <span className="text-muted-foreground/50 mx-1">
                                →
                            </span>
                            {range.to
                                ? format(range.to, "dd MMM yy", { locale: fr })
                                : "…"}
                        </>
                    ) : (
                        <span className="text-muted-foreground/60">
                            Choisir une plage
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-auto p-0 rounded-xl shadow-2xl"
            >
                <Calendar
                    mode="range"
                    numberOfMonths={2}
                    locale={fr}
                    defaultMonth={range?.from}
                    selected={range}
                    onSelect={handleSelect}
                    className="p-3"
                />
            </PopoverContent>
        </Popover>
    );
}