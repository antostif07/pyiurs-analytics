"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  start: string // Format "YYYY-MM-DD"
  end: string   // Format "YYYY-MM-DD"
  className?: string
}

export default function DateRangePicker({ start, end, className }: DateRangePickerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // On initialise l'état interne avec les dates provenant de l'URL (via les props du serveur)
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: parseISO(start),
    to: parseISO(end),
  })

  // Fonction pour mettre à jour l'URL
  const updateUrl = (range: DateRange | undefined) => {
    setDate(range)

    // On ne déclenche la recherche que si les deux dates sont sélectionnées
    if (range?.from && range?.to) {
      const params = new URLSearchParams(searchParams.toString())
      params.set("start", format(range.from, "yyyy-MM-dd"))
      params.set("end", format(range.to, "yyyy-MM-dd"))
      
      // On pousse la nouvelle URL, Next.js rechargera le Server Component
      router.push(`${pathname}?${params.toString()}`)
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[280px] justify-start text-left font-normal bg-white dark:bg-slate-950",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd MMM y", { locale: fr })} -{" "}
                  {format(date.to, "dd MMM y", { locale: fr })}
                </>
              ) : (
                format(date.from, "dd MMM y", { locale: fr })
              )
            ) : (
              <span>Sélectionner une période</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={updateUrl}
            numberOfMonths={2}
            locale={fr}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}