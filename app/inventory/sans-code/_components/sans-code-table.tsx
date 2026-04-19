"use client";

import React, { useState, useMemo, useEffect } from "react";
import { ChevronDown, ChevronRight, Store, Calendar, FileText, Loader2, RotateCcw, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSearchParams } from "next/navigation";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { getSansCodeSales } from "@/app/actions/sans-code";

export default function SansCodeTable() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const from = searchParams.get("from") || format(startOfMonth(new Date()), "yyyy-MM-dd");
  const to = searchParams.get("to") || format(endOfMonth(new Date()), "yyyy-MM-dd");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getSansCodeSales({ from, to });
      setData(res);
      setLoading(false);
    }
    load();
  }, [from, to]);

  // Groupement hiérarchique : POS > Date
  const groupedData = useMemo(() => {
    const tree = new Map<string, Map<string, any[]>>();
    const filtered = data.filter(d => 
        d.posConfig.toLowerCase().includes(search.toLowerCase()) || 
        d.invoiceRef.toLowerCase().includes(search.toLowerCase())
    );

    filtered.forEach(item => {
      if (!tree.has(item.posConfig)) tree.set(item.posConfig, new Map());
      const dateMap = tree.get(item.posConfig)!;
      if (!dateMap.has(item.date)) dateMap.set(item.date, []);
      dateMap.get(item.date)!.push(item);
    });
    return tree;
  }, [data, search]);

  const toggle = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  if (loading) return (
    <div className="h-64 flex flex-col items-center justify-center border border-dashed rounded-xl italic text-muted-foreground">
      <Loader2 className="w-6 h-6 animate-spin mb-2" /> Récupération des factures...
    </div>
  );

  return (
    <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b bg-muted/5 flex justify-between items-center">
        <h3 className="text-sm font-bold flex items-center gap-2"><Store className="w-4 h-4 text-primary"/> ANALYSE DES SANS CODES</h3>
        <Input placeholder="Rechercher ticket..." className="w-64 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="bg-muted/50 uppercase text-[10px] font-bold border-b text-muted-foreground">
            <th className="p-3 w-10"></th>
            <th className="p-3 text-left">POS / Date / Commande - Client</th>
            <th className="p-3 text-right">Nb. Sans Code</th>
            <th className="p-3 text-right">Montant Sans Code</th>
            <th className="p-3 text-center">Remboursement / Retour</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(groupedData.entries()).map(([pos, dates]) => {
            const posInvs = Array.from(dates.values()).flat();
            const isOpen = expanded.has(pos);
            const posQty = posInvs.reduce((a, b) => a + b.qtySansCode, 0);
            const posAmount = posInvs.reduce((a, b) => a + b.amountSansCode, 0);

            return (
              <React.Fragment key={pos}>
                {/* LIGNE NIVEAU 1 : POS */}
                <tr className="border-b bg-muted/10 cursor-pointer hover:bg-muted/20" onClick={() => toggle(pos)}>
                  <td className="p-3 text-center">{isOpen ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}</td>
                  <td className="p-3 font-bold text-sm text-primary uppercase">{pos}</td>
                  <td className="p-3 text-right font-bold">{posQty}</td>
                  <td className="p-3 text-right font-bold">{posAmount.toLocaleString()} $</td>
                  <td className="p-3"></td>
                </tr>

                {isOpen && Array.from(dates.entries()).map(([date, invs]) => {
                  const dateId = `${pos}-${date}`;
                  const isDateOpen = expanded.has(dateId);
                  const dateQty = invs.reduce((a, b) => a + b.qtySansCode, 0);
                  const dateAmount = invs.reduce((a, b) => a + b.amountSansCode, 0);

                  return (
                    <React.Fragment key={dateId}>
                      {/* LIGNE NIVEAU 2 : DATE */}
                      <tr className="border-b bg-background cursor-pointer hover:bg-muted/5" onClick={() => toggle(dateId)}>
                        <td></td>
                        <td className="p-2 pl-8 flex items-center gap-2 font-semibold text-muted-foreground italic">
                          <Calendar className="w-3.5 h-3.5"/> {date}
                        </td>
                        <td className="p-2 text-right font-medium">{dateQty}</td>
                        <td className="p-2 text-right font-medium">{dateAmount.toLocaleString()} $</td>
                        <td className="p-2"></td>
                      </tr>

                      {/* LIGNE NIVEAU 3 : COMMANDE */}
                      {isDateOpen && invs.map(inv => (
                        <tr key={inv.id} className="border-b border-border/10 hover:bg-accent/5">
                          <td></td>
                          <td className="p-2 pl-16 flex items-center gap-2">
                            <FileText className="w-3 h-3 opacity-50"/> 
                            <span className="font-mono text-primary">{inv.invoiceRef}</span>
                            <span className="text-muted-foreground">— {inv.clientName}</span>
                          </td>
                          <td className="p-2 text-right">{inv.qtySansCode}</td>
                          <td className="p-2 text-right font-medium">{inv.amountSansCode.toLocaleString()} $</td>
                          <td className="p-2 text-center">
                            {inv.isRefunded ? (
                              <Badge className="text-[9px] gap-1 px-1.5 py-0 bg-orange-100 text-orange-700 border border-orange-200">
                                <RotateCcw className="w-2.5 h-2.5" />
                                Facture remboursée
                              </Badge>
                            ) : (
                              <Badge className="text-[9px] gap-1 px-1.5 py-0 bg-emerald-100 text-emerald-700 border border-emerald-200">
                                Facture non remboursée
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}