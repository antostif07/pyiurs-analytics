"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Search,
  ArrowUpDown,
  AlertTriangle,
  PackageX,
  TrendingUp,
  Boxes,
  Loader2,
  ChevronLeft
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StockDashboardFilters } from "../stock-dashboard-client";
import { useStockTable } from "../_lib/hooks/use-stock-table";
import { StockTableRow } from "../_lib/actions/inventory-stock-table";

interface StockTableProps {
  filters?: StockDashboardFilters;
}

const formatUSD = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function StockTable({ filters }: StockTableProps) {
  // ✅ 1. Connexion au Hook TanStack Query Odoo
  const { data: stockItems = [], isLoading, isError } = useStockTable(filters);

  const [search, setSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<keyof StockTableRow>("currentStock");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Pagination locale
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Filtrage et Tri en mémoire (0 ms)
  const filtered = useMemo(() => {
    return stockItems
      .filter((r) =>
        r.product.toLowerCase().includes(search.toLowerCase()) ||
        r.category.toLowerCase().includes(search.toLowerCase()) ||
        r.barcode.toLowerCase().includes(search.toLowerCase()) ||
        r.hsCode.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (typeof valA === "number" && typeof valB === "number") {
          return sortDir === "desc" ? valB - valA : valA - valB;
        }
        return sortDir === "desc"
          ? String(valB).localeCompare(String(valA))
          : String(valA).localeCompare(String(valB));
      });
  }, [stockItems, search, sortKey, sortDir]);

  // Découpage pagination
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSort = (key: keyof StockTableRow) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const totalCurrentStock = filtered.reduce((s, r) => s + r.currentStock, 0);
  const totalStockValue = filtered.reduce((s, r) => s + r.stockValue, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-card text-card-foreground border border-border rounded-2xl shadow-xs overflow-hidden transition-colors"
    >
      {/* 1. EN-TÊTE DU TABLEAU */}
      <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Inventaire Détaillé des Produits
            </h3>
            <Badge variant="outline" className="text-[9px] font-mono border-primary/30 text-primary">
              {filtered.length} Références
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground font-light mt-0.5">
            Suivi des quantités physiques, valeurs de stock et flux d'entrées/sorties Odoo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground/60" />
            <Input
              placeholder="Filtrer nom, code, HS..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8 h-9 text-xs bg-muted/20 border-input rounded-xl focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* 2. TABLEAU DES STOCKS */}
      <div className="overflow-x-auto scrollbar-thin">
        <Table className="w-full text-left text-[10px] border-collapse">
          <TableHeader className="bg-muted/40 border-b border-border text-muted-foreground">
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className="w-8 px-2 py-2.5" />

              <TableHead className="px-3 py-2.5 uppercase text-[8px] tracking-wider font-bold">
                <button onClick={() => handleSort("product")} className="inline-flex items-center gap-1 hover:text-foreground outline-none">
                  <span>Article / Segment</span>
                  <ArrowUpDown size={9} className={sortKey === "product" ? "text-primary opacity-100" : "opacity-30"} />
                </button>
              </TableHead>

              <TableHead className="px-3 py-2.5 uppercase text-[8px] tracking-wider font-bold text-right">
                <button onClick={() => handleSort("openingStock")} className="inline-flex items-center gap-1 hover:text-foreground outline-none justify-end w-full">
                  <span>Ouverture</span>
                  <ArrowUpDown size={9} className={sortKey === "openingStock" ? "text-primary opacity-100" : "opacity-30"} />
                </button>
              </TableHead>

              <TableHead className="px-3 py-2.5 uppercase text-[8px] tracking-wider font-bold text-right text-emerald-600">
                <button onClick={() => handleSort("incomingStock")} className="inline-flex items-center gap-1 hover:text-foreground outline-none justify-end w-full">
                  <span>Entrées (+)</span>
                  <ArrowUpDown size={9} className={sortKey === "incomingStock" ? "text-primary opacity-100" : "opacity-30"} />
                </button>
              </TableHead>

              <TableHead className="px-3 py-2.5 uppercase text-[8px] tracking-wider font-bold text-right text-rose-600">
                <button onClick={() => handleSort("outgoingStock")} className="inline-flex items-center gap-1 hover:text-foreground outline-none justify-end w-full">
                  <span>Sorties (-)</span>
                  <ArrowUpDown size={9} className={sortKey === "outgoingStock" ? "text-primary opacity-100" : "opacity-30"} />
                </button>
              </TableHead>

              <TableHead className="px-3 py-2.5 uppercase text-[8px] tracking-wider font-bold text-right">
                <button onClick={() => handleSort("currentStock")} className="inline-flex items-center gap-1 hover:text-foreground outline-none justify-end w-full">
                  <span>Stock Actuel</span>
                  <ArrowUpDown size={9} className={sortKey === "currentStock" ? "text-primary opacity-100" : "opacity-30"} />
                </button>
              </TableHead>

              <TableHead className="px-3 py-2.5 uppercase text-[8px] tracking-wider font-bold text-right">
                <button onClick={() => handleSort("stockValue")} className="inline-flex items-center gap-1 hover:text-foreground outline-none justify-end w-full">
                  <span>Valeur ($)</span>
                  <ArrowUpDown size={9} className={sortKey === "stockValue" ? "text-primary opacity-100" : "opacity-30"} />
                </button>
              </TableHead>

              <TableHead className="px-3 py-2.5 uppercase text-[8px] tracking-wider font-bold text-center w-20">
                Statut
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-border/40 font-mono">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-muted-foreground font-sans">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
                  <span>Chargement des stocks Odoo en temps réel...</span>
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-muted-foreground font-sans text-xs">
                  Aucun article trouvé.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => {
                const isExpanded = expandedRows.has(item.id);

                return (
                  <>
                    <TableRow
                      key={item.id}
                      onClick={() => toggleRow(item.id)}
                      className={cn(
                        "hover:bg-muted/30 transition-colors cursor-pointer",
                        isExpanded && "bg-muted/20"
                      )}
                    >
                      {/* Chevron déroulant */}
                      <TableCell className="px-2 py-2 text-muted-foreground">
                        {isExpanded ? (
                          <ChevronDown size={12} className="text-primary font-bold" />
                        ) : (
                          <ChevronRight size={12} className="text-muted-foreground/60" />
                        )}
                      </TableCell>

                      {/* Article, Code-barres & Segment */}
                      <TableCell className="px-3 py-2 font-sans">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground text-[11px] truncate max-w-[320px]" title={item.product}>
                            {item.product}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-mono mt-0.5">
                            {item.barcode} • HS: {item.hsCode} • {item.segment}
                          </span>
                        </div>
                      </TableCell>

                      {/* Stock d'Ouverture */}
                      <TableCell className="px-3 py-2 text-right text-muted-foreground">
                        {item.openingStock.toLocaleString("fr-FR")}
                      </TableCell>

                      {/* Entrées / Réceptions */}
                      <TableCell className="px-3 py-2 text-right font-medium text-emerald-600">
                        {item.incomingStock > 0 ? `+${item.incomingStock.toLocaleString("fr-FR")}` : "—"}
                      </TableCell>

                      {/* Sorties / Ventes */}
                      <TableCell className="px-3 py-2 text-right font-medium text-rose-600">
                        {item.outgoingStock > 0 ? `-${item.outgoingStock.toLocaleString("fr-FR")}` : "—"}
                      </TableCell>

                      {/* Stock Actuel */}
                      <TableCell className="px-3 py-2 text-right font-bold text-foreground text-[11px]">
                        {item.currentStock.toLocaleString("fr-FR")}
                      </TableCell>

                      {/* Valeur Monétaire ($ USD) */}
                      <TableCell className="px-3 py-2 text-right font-bold text-primary">
                        {formatUSD(item.stockValue)}
                      </TableCell>

                      {/* Badge d'Alerte de Stock */}
                      <TableCell className="px-3 py-2 text-center font-sans">
                        {item.alert === "out_of_stock" && (
                          <Badge className="bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[8px] font-bold px-1.5 py-0">
                            Rupture
                          </Badge>
                        )}
                        {item.alert === "low" && (
                          <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[8px] font-bold px-1.5 py-0">
                            Faible
                          </Badge>
                        )}
                        {item.alert === "overstock" && (
                          <Badge className="bg-sky-500/10 text-sky-600 border border-sky-500/20 text-[8px] font-bold px-1.5 py-0">
                            Surstock
                          </Badge>
                        )}
                        {item.alert === "healthy" && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[8px] font-bold px-1.5 py-0">
                            Sain
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>

                    {/* Tiroir Déroulant : Historique des Flux Quotidiens */}
                    {isExpanded && (
                      <TableRow key={`hist-${item.id}`} className="bg-muted/10">
                        <TableCell colSpan={8} className="p-3 pl-8">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 font-sans">
                            Historique des 10 Derniers Jours de Mouvements
                          </div>

                          {item.history.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground italic font-light">
                              Aucun mouvement de stock enregistré sur les 10 derniers jours.
                            </p>
                          ) : (
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                              {item.history.map((h) => (
                                <div
                                  key={h.date}
                                  className="min-w-[80px] bg-card border border-border rounded-xl p-2 text-center shadow-2xs"
                                >
                                  <div className="text-[9px] text-muted-foreground font-mono mb-1">{h.date}</div>
                                  <div className="text-[10px] text-emerald-600 font-bold">+{h.incoming}</div>
                                  <div className="text-[10px] text-rose-600 font-bold">-{h.outgoing}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>

          {/* PIED DE TABLEAU (TOTAUX) */}
          <TableFooter className="bg-muted/60 border-t-2 border-border font-bold text-foreground">
            <TableRow className="hover:bg-transparent border-none h-8">
              <TableCell className="px-2" />
              <TableCell className="px-3 py-2 uppercase text-[9px] font-extrabold">
                Total Inventaire ({filtered.length} Réf.)
              </TableCell>
              <TableCell className="px-3 py-2 text-right text-muted-foreground font-mono">
                {filtered.reduce((s, r) => s + r.openingStock, 0).toLocaleString("fr-FR")}
              </TableCell>
              <TableCell className="px-3 py-2 text-right text-emerald-600 font-mono">
                +{filtered.reduce((s, r) => s + r.incomingStock, 0).toLocaleString("fr-FR")}
              </TableCell>
              <TableCell className="px-3 py-2 text-right text-rose-600 font-mono">
                -{filtered.reduce((s, r) => s + r.outgoingStock, 0).toLocaleString("fr-FR")}
              </TableCell>
              <TableCell className="px-3 py-2 text-right text-foreground font-bold font-mono text-[11px]">
                {totalCurrentStock.toLocaleString("fr-FR")}
              </TableCell>
              <TableCell className="px-3 py-2 text-right text-primary font-black font-mono text-[11px]">
                {formatUSD(totalStockValue)}
              </TableCell>
              <TableCell className="px-3 py-2" />
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* 3. PAGINATION SHADCN UI */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3.5 bg-muted/20 border-t border-border">
        <div className="text-[10px] text-muted-foreground font-light">
          Affichage de{" "}
          <strong className="text-foreground font-medium">
            {(page - 1) * pageSize + 1}
          </strong>{" "}
          à{" "}
          <strong className="text-foreground font-medium">
            {Math.min(page * pageSize, filtered.length)}
          </strong>{" "}
          sur <strong className="text-foreground font-medium">{filtered.length}</strong> articles
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="h-7 w-7 p-0 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>

          <span className="text-[10px] font-mono font-medium px-2">
            Page {page} / {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="h-7 w-7 p-0 cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}