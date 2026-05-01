// app/hr/payroll/payroll-filter.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";

const MONTHS = [
  { val: "01", label: "Janvier" }, { val: "02", label: "Février" },
  { val: "03", label: "Mars" }, { val: "04", label: "Avril" },
  { val: "05", label: "Mai" }, { val: "06", label: "Juin" },
  { val: "07", label: "Juillet" }, { val: "08", label: "Août" },
  { val: "09", label: "Septembre" }, { val: "10", label: "Octobre" },
  { val: "11", label: "Novembre" }, { val: "12", label: "Décembre" }
];

export function PayrollFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentMonth = searchParams.get("month") || String(new Date().getMonth() + 1).padStart(2, '0');
  const currentYear = searchParams.get("year") || String(new Date().getFullYear());

  const updateFilters = (month: string, year: string) => {
    const params = new URLSearchParams();
    params.set("month", month);
    params.set("year", year);
    router.push(`/hr/payroll?${params.toString()}`);
  };

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border shadow-sm">
      <div className="flex items-center gap-2 px-3 text-muted-foreground border-r">
        <Calendar size={16} />
        <span className="text-xs font-bold uppercase tracking-wider">Période</span>
      </div>
      <Select value={currentMonth} onValueChange={(val) => updateFilters(val, currentYear)}>
        <SelectTrigger className="w-[130px] border-none shadow-none font-bold text-xs focus:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map(m => <SelectItem key={m.val} value={m.val}>{m.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="w-px h-4 bg-gray-200" />
      <Select value={currentYear} onValueChange={(val) => updateFilters(currentMonth, val)}>
        <SelectTrigger className="w-[100px] border-none shadow-none font-bold text-rose-600 text-xs focus:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}