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
  const [hideRefunded, setHideRefunded] = useState(false);

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

    const filtered = data
      .filter(d =>
        d.posConfig.toLowerCase().includes(search.toLowerCase()) ||
        d.invoiceRef.toLowerCase().includes(search.toLowerCase())
      )
      .filter(d => (hideRefunded ? !d.isRefunded : true)); // ✅ toggle ici

    filtered.forEach(item => {
      if (!tree.has(item.posConfig)) tree.set(item.posConfig, new Map());
      const dateMap = tree.get(item.posConfig)!;
      if (!dateMap.has(item.date)) dateMap.set(item.date, []);
      dateMap.get(item.date)!.push(item);
    });

    return tree;
  }, [data, search, hideRefunded]);

  const toggle = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  const kpis = useMemo(() => {
    let total = 0;
    let refunded = 0;

    const posStats = new Map<string, { total: number; refunded: number }>();

    data.forEach(inv => {
      total += inv.amountSansCode;

      if (inv.isRefunded) {
        refunded += inv.amountSansCode;
      }

      if (!posStats.has(inv.posConfig)) {
        posStats.set(inv.posConfig, { total: 0, refunded: 0 });
      }

      const stat = posStats.get(inv.posConfig)!;
      stat.total += inv.amountSansCode;

      if (inv.isRefunded) {
        stat.refunded += inv.amountSansCode;
      }
    });

    // 🔥 calcul % par POS
    const posRates = Array.from(posStats.entries())
      .map(([pos, stat]) => ({
        pos,
        rate: stat.total > 0 ? (stat.refunded / stat.total) * 100 : 0,
      }))
      .sort((a, b) => b.rate - a.rate) // du plus risqué au moins risqué
      .slice(0, 3); // 👉 top 3

    return {
      total,
      refunded,
      net: total - refunded,
      rate: total > 0 ? (refunded / total) * 100 : 0,
      posRates,
    };
  }, [data]);

  if (loading) return (
    <div className="h-64 flex flex-col items-center justify-center border border-dashed rounded-xl italic text-muted-foreground">
      <Loader2 className="w-6 h-6 animate-spin mb-2" /> Récupération des factures...
    </div>
  );

  return (
    <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 p-4">
        <Input
          placeholder="Rechercher ticket..."
          className="w-64 h-8 text-xs"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <button
          onClick={() => setHideRefunded(!hideRefunded)}
          className={`text-xs px-3 py-1 rounded-md border ${
            hideRefunded
              ? "bg-primary text-white"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {hideRefunded ? "Remboursées masquées" : "Masquer remboursées"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4">

        {/* CA Brut */}
        <div className="p-3 rounded-xl border bg-muted/20">
          <p className="text-[10px] text-muted-foreground">CA Sans Code</p>
          <p className="text-sm font-bold">{kpis.total.toLocaleString()} $</p>
        </div>

        {/* Remboursé */}
        <div className="p-3 rounded-xl border bg-red-50">
          <p className="text-[10px] text-red-500">Remboursé</p>
          <p className="text-sm font-bold text-red-600">
            -{kpis.refunded.toLocaleString()} $
          </p>
        </div>

        {/* Net */}
        <div className="p-3 rounded-xl border bg-emerald-50">
          <p className="text-[10px] text-emerald-600">CA Réel</p>
          <p className="text-sm font-bold text-emerald-700">
            {kpis.net.toLocaleString()} $
          </p>
        </div>

        {/* % remboursement */}
        <div className="p-3 rounded-xl border bg-orange-50">
          <p className="text-[10px] text-orange-500">% Remboursé</p>
          <p className="text-sm font-bold text-orange-600">
            {kpis.rate.toFixed(1)}%
          </p>
        </div>

        {/* POS à risque */}
        <div className="p-3 rounded-xl border bg-yellow-50 col-span-2 md:col-span-1">
          <p className="text-[10px] text-yellow-600 mb-1">% remboursement par POS</p>

          <div className="space-y-1">
            {kpis.posRates.length === 0 && (
              <p className="text-[10px] text-muted-foreground">—</p>
            )}

            {kpis.posRates.map(p => (
              <div key={p.pos} className="flex justify-between text-[10px]">
                <span className="font-semibold truncate max-w-[80px]">{p.pos}</span>
                <span className="font-bold">{p.rate.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div className="w-full overflow-x-auto">
        <table className="min-w-[700px] w-full text-[11px] border-collapse">
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
              const posQty = posInvs
              .filter(i => !i.isRefunded)
              .reduce((a, b) => a + b.qtySansCode, 0);
              const posAmount = posInvs
                .filter(i => !i.isRefunded)
                .reduce((a, b) => a + b.amountSansCode, 0);

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
    </div>
  );
}