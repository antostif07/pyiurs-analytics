"use client";

import { useState } from "react";
import { useRetention } from "../_hooks/useRetention";
import RetentionStats from "./_components/retention-stats";
import RetentionFilters from "./_components/retention-filters";
import RetentionTable from "./_components/retention-table";
import ClientDetailsSheet from "./_components/client-details-sheet";

export default function RetentionClient() {
  const [monthOffset, setMonthOffset] = useState(1);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "returned" | "missing">("all");
  const [selectedClient, setSelectedClient] = useState<any | null>(null);

  const { data, isLoading, error } = useRetention(monthOffset);

  if (isLoading) {
    return (
      <div className="p-20 text-center font-black uppercase text-xs animate-pulse opacity-50">
        Analyse en cours...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-20 text-center text-red-500 font-bold">
        Une erreur est survenue.
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <RetentionStats stats={data.stats} periodName={data.periodName} />
      
      <div className="space-y-4">
        <RetentionFilters 
          globalFilter={globalFilter} 
          setGlobalFilter={setGlobalFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          monthOffset={monthOffset}
          setMonthOffset={setMonthOffset}
        />
        
        <RetentionTable 
          clients={data.clients} 
          globalFilter={globalFilter}
          statusFilter={statusFilter}
          onClientClick={(c: any) => setSelectedClient({ ...c })}
        />
      </div>

      <ClientDetailsSheet 
        client={selectedClient} 
        onClose={() => setSelectedClient(null)} 
      />
    </div>
  );
}