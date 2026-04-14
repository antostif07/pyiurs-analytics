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
} from "lucide-react";
import { SHOP_STOCK_DATA, ShopStock } from "../_lib/mock-data";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SortKey = keyof Pick<
  ShopStock,
  "openingStock" | "incomingStock" | "outgoingStock" | "currentStock" | "stockValue"
>;

function stockAlert(item: ShopStock): "low" | "overstock" | null {
  const ratio = item.currentStock / item.openingStock;
  if (ratio < 0.3) return "low";
  if (ratio > 2.5) return "overstock";
  return null;
}

function variationPct(item: ShopStock) {
  return (((item.currentStock - item.openingStock) / item.openingStock) * 100).toFixed(1);
}

const TOTAL_CURRENT = SHOP_STOCK_DATA.reduce((s, r) => s + r.currentStock, 0);

// Group by shop
function groupByShop(data: ShopStock[]) {
  const map = new Map<string, ShopStock[]>();
  for (const item of data) {
    if (!map.has(item.shop)) map.set(item.shop, []);
    map.get(item.shop)!.push(item);
  }
  return map;
}

export default function StockTable() {
  const [search, setSearch] = useState("");
  const [expandedShops, setExpandedShops] = useState<Set<string>>(
    new Set(["Shop Alpha", "Shop Beta", "Shop Gamma", "Shop Delta"])
  );
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("currentStock");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    return SHOP_STOCK_DATA.filter(
      (r) =>
        r.shop.toLowerCase().includes(search.toLowerCase()) ||
        r.product.toLowerCase().includes(search.toLowerCase()) ||
        r.category.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) =>
      sortDir === "desc" ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]
    );
  }, [search, sortKey, sortDir]);

  const grouped = useMemo(() => groupByShop(filtered), [filtered]);

  function toggleShop(shop: string) {
    setExpandedShops((prev) => {
      const next = new Set(prev);
      next.has(shop) ? next.delete(shop) : next.add(shop);
      return next;
    });
  }

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const SortBtn = ({ col }: { col: SortKey }) => (
    <button
      onClick={() => handleSort(col)}
      className="ml-1 opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
    >
      <ArrowUpDown className="w-3 h-3 inline" />
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden"
    >
      {/* Table header */}
      <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Stock Inventory</h3>
          <p className="text-xs text-muted-foreground">
            {filtered.length} products across {grouped.size} shops
          </p>
        </div>
        <div className="sm:ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search products, shops..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs w-56"
            />
          </div>
        </div>
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted/60 backdrop-blur-sm z-10">
            <tr className="text-left">
              <th className="px-4 py-3 font-semibold text-muted-foreground w-8" />
              <th className="px-4 py-3 font-semibold text-muted-foreground">Product / Category</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground text-right">
                Opening <SortBtn col="openingStock" />
              </th>
              <th className="px-4 py-3 font-semibold text-muted-foreground text-right">
                Incoming <SortBtn col="incomingStock" />
              </th>
              <th className="px-4 py-3 font-semibold text-muted-foreground text-right">
                Outgoing <SortBtn col="outgoingStock" />
              </th>
              <th className="px-4 py-3 font-semibold text-muted-foreground text-right">
                Current <SortBtn col="currentStock" />
              </th>
              <th className="px-4 py-3 font-semibold text-muted-foreground text-right">Variation</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground text-right">Share</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground text-center">Alert</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(grouped.entries()).map(([shop, items]) => {
              const shopTotal = items.reduce((s, r) => s + r.currentStock, 0);
              const shopShare = ((shopTotal / TOTAL_CURRENT) * 100).toFixed(1);
              const isExpanded = expandedShops.has(shop);

              return (
                <>
                  {/* Shop summary row */}
                  <tr
                    key={`shop-${shop}`}
                    onClick={() => toggleShop(shop)}
                    className="bg-muted/30 border-t border-border cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground" colSpan={4}>
                      {shop}
                      <span className="ml-2 text-muted-foreground font-normal">
                        · {items.length} products
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">
                      {shopTotal.toLocaleString()}
                    </td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right">
                      <Badge variant="secondary" className="text-xs">
                        {shopShare}%
                      </Badge>
                    </td>
                    <td className="px-4 py-3" />
                  </tr>

                  {/* Product rows */}
                  <AnimatePresence>
                    {isExpanded &&
                      items.map((item) => {
                        const alert = stockAlert(item);
                        const variation = parseFloat(variationPct(item));
                        const share = ((item.currentStock / TOTAL_CURRENT) * 100).toFixed(1);
                        const rowExpanded = expandedRows.has(item.id);

                        return (
                          <>
                            <motion.tr
                              key={item.id}
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              onClick={() => toggleRow(item.id)}
                              className="border-t border-border/50 hover:bg-accent/30 transition-colors cursor-pointer"
                            >
                              <td className="px-4 py-3 text-muted-foreground pl-8">
                                {rowExpanded ? (
                                  <ChevronDown className="w-3 h-3" />
                                ) : (
                                  <ChevronRight className="w-3 h-3" />
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-foreground">{item.product}</div>
                                <div className="text-muted-foreground">{item.category}</div>
                              </td>
                              <td className="px-4 py-3 text-right text-muted-foreground">
                                {item.openingStock.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                                +{item.incomingStock.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right text-rose-500 font-medium">
                                -{item.outgoingStock.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-foreground">
                                {item.currentStock.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span
                                  className={cn(
                                    "font-medium",
                                    variation >= 0
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-rose-500"
                                  )}
                                >
                                  {variation >= 0 ? "+" : ""}
                                  {variation}%
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-muted-foreground">
                                {share}%
                              </td>
                              <td className="px-4 py-3 text-center">
                                {alert === "low" && (
                                  <span title="Low stock" className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 dark:bg-red-950">
                                    <AlertTriangle className="w-3 h-3 text-red-500" />
                                  </span>
                                )}
                                {alert === "overstock" && (
                                  <span title="Overstock" className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950">
                                    <PackageX className="w-3 h-3 text-amber-500" />
                                  </span>
                                )}
                                {!alert && (
                                  <span title="Healthy" className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950">
                                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                                  </span>
                                )}
                              </td>
                            </motion.tr>

                            {/* Expanded row: movement history */}
                            {rowExpanded && (
                              <motion.tr
                                key={`hist-${item.id}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <td colSpan={9} className="px-8 pb-3 bg-accent/20">
                                  <div className="text-xs text-muted-foreground font-medium mb-2 pt-2">
                                    Movement History (last 10 days)
                                  </div>
                                  <div className="flex gap-1 overflow-x-auto">
                                    {item.history.map((h) => (
                                      <div
                                        key={h.date}
                                        className="min-w-[70px] bg-card border border-border rounded-lg p-2 text-center"
                                      >
                                        <div className="text-[10px] text-muted-foreground">{h.date.slice(5)}</div>
                                        <div className="text-emerald-600 dark:text-emerald-400 font-medium">+{h.incoming}</div>
                                        <div className="text-rose-500 font-medium">-{h.outgoing}</div>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </motion.tr>
                            )}
                          </>
                        );
                      })}
                  </AnimatePresence>
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="p-12 text-center text-muted-foreground text-sm">
          No products found matching your search.
        </div>
      )}
    </motion.div>
  );
}
