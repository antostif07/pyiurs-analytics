"use client";

import {
  Search,
  Filter,
  UserCheck,
  UserMinus,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export type RetentionStatusFilter = "all" | "returned" | "missing";

interface RetentionFiltersProps {
  globalFilter: string;
  setGlobalFilter: (val: string) => void;

  statusFilter: RetentionStatusFilter;
  setStatusFilter: (val: RetentionStatusFilter) => void;

  monthOffset: number;
  setMonthOffset: (val: number) => void;
}

const filters = [
  { id: "all", label: "Tous", icon: Users, color: "text-slate-400" },
  { id: "returned", label: "Revenus", icon: UserCheck, color: "text-emerald-500" },
  { id: "missing", label: "Absents", icon: UserMinus, color: "text-rose-500" },
] as const;

export default function RetentionFilters({
  globalFilter,
  setGlobalFilter,
  statusFilter,
  setStatusFilter,
  monthOffset,
  setMonthOffset,
}: RetentionFiltersProps) {
  const monthLabel =
    monthOffset === 1
      ? "Mois dernier"
      : monthOffset === 0
      ? "Mois actuel"
      : `Il y a ${monthOffset} mois`;

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">

      {/* SEARCH */}
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

        <input
          type="text"
          className="w-full pl-11 pr-4 py-3 text-sm font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
          placeholder="Rechercher un client..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
        />
      </div>

      {/* PERIOD SELECTOR */}
      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-2xl">
        <button
          onClick={() => setMonthOffset(monthOffset + 1)}
          className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-700 transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-xs font-black uppercase tracking-widest px-3 text-slate-700 dark:text-slate-200">
          {monthLabel}
        </span>

        <button
          onClick={() => setMonthOffset(Math.max(0, monthOffset - 1))}
          className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-700 transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* STATUS FILTER */}
      <div className="relative flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full lg:w-auto">

        {/* indicator */}
        <div
          className="absolute top-1 bottom-1 w-1/3 bg-white dark:bg-slate-700 rounded-xl shadow-sm transition-all duration-300"
          style={{
            left:
              statusFilter === "all"
                ? "4px"
                : statusFilter === "returned"
                ? "33%"
                : "66%",
          }}
        />

        {filters.map((f) => {
          const isActive = statusFilter === f.id;
          const Icon = f.icon;

          return (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`
                relative z-10 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                ${isActive ? "text-slate-900 dark:text-white" : "text-slate-400"}
              `}
            >
              <Icon
                className={`w-3.5 h-3.5 ${
                  isActive ? f.color : "opacity-40"
                }`}
              />
              {f.label}
            </button>
          );
        })}
      </div>

      {/* FUTURE FILTER BUTTON */}
      <button
        className="hidden lg:flex p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
        title="Filtres avancés"
      >
        <Filter className="w-4 h-4" />
      </button>
    </div>
  );
}