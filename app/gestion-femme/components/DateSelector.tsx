"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Calendar, ChevronDown } from "lucide-react";
import { useState } from "react";

export default function DateSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const defaultYear = searchParams.get("year") || "2025";
  const defaultMonth = searchParams.get("month") || "12";

  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);

  const months = [
    { value: "01", label: "Janvier" },
    { value: "02", label: "Février" },
    { value: "03", label: "Mars" },
    { value: "04", label: "Avril" },
    { value: "05", label: "Mai" },
    { value: "06", label: "Juin" },
    { value: "07", label: "Juillet" },
    { value: "08", label: "Août" },
    { value: "09", label: "Septembre" },
    { value: "10", label: "Octobre" },
    { value: "11", label: "Novembre" },
    { value: "12", label: "Décembre" },
  ];

  const years = ["2023", "2024", "2025", "2026", "2027"];

  const updateUrl = (y: string, m: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", y);
    params.set("month", m);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="mb-8 bg-white border border-gray-100 p-5 rounded-xl shadow-sm">
      <div className="flex flex-col md:flex-row items-center gap-4">

        {/* Titre */}
        <div className="flex items-center gap-2 text-blue-600 font-semibold">
          <Calendar size={20} />
          <span>Période d’analyse</span>
        </div>

        {/* Sélecteurs */}
        <div className="flex items-center gap-4">

          {/* Année */}
          <div className="relative">
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select
              className="appearance-none bg-gray-50 border border-gray-200 rounded-lg py-2 px-4 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                updateUrl(e.target.value, month);
              }}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Mois */}
          <div className="relative">
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select
              className="appearance-none bg-gray-50 border border-gray-200 rounded-lg py-2 px-4 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                updateUrl(year, e.target.value);
              }}
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>
    </div>
  );
}
