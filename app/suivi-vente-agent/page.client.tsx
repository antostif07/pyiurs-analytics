'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { POSOrderLine } from "../types/pos";
import { useAuth } from "@/contexts/AuthContext";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
  Row,
} from '@tanstack/react-table';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface VendeuseSalesDashboardProps {
  month?: string;
  year?: string;
  agentId?: string;
  isAdmin?: boolean;
  agents?: { id: number; name: string }[];
  orderLines: POSOrderLine[]
}

// Types pour les cellules et rows
type OrderLineRow = Row<POSOrderLine>;
type OrderLineCell = {
  id: string;
  column: ColumnDef<POSOrderLine>;
  getValue: () => unknown;
  renderValue: () => unknown;
  row: OrderLineRow;
};

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR');
}

export function VendeuseSalesDashboard({ 
  month, 
  year, 
  agentId,
  isAdmin = false,
  agents = [],
  orderLines = []
}: VendeuseSalesDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useAuth();
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const currentMonth = month || new Date().getMonth() + 1;
  const currentYear = year || new Date().getFullYear();
  const currentAgentId = agentId;

  useEffect(() => {
    if (profile?.role === 'user' && !agentId) {
      const newParams = new URLSearchParams();
      if (month) newParams.set('month', month);
      if (year) newParams.set('year', year);
      newParams.set('agent', profile.id);
      router.push(`${pathname}?${newParams.toString()}`);
    }
  }, [agentId, month, year, pathname, router, profile]);

  const handleFilterChange = (type: 'month' | 'year' | 'agent', value: string): void => {
    const newParams = new URLSearchParams();
    
    if (type === 'month' && value) newParams.set('month', value);
    if (type === 'year' && value) newParams.set('year', value);
    if (type === 'agent' && value) newParams.set('agent', value);
    
    if (type !== 'month' && month) newParams.set('month', month);
    if (type !== 'year' && year) newParams.set('year', year);
    if (type !== 'agent' && agentId) newParams.set('agent', agentId);

    router.push(`${pathname}?${newParams.toString()}`);
  };

  const getMonthName = (monthNumber: string): string => {
    const months = [
      "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
      "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];
    return months[parseInt(monthNumber) - 1] || "";
  };

  const getCurrentAgentName = (): string => {
    if (!currentAgentId) return "Tous les agents";
    
    if (currentAgentId === profile?.id) {
      return profile.full_name || "Utilisateur";
    }
    
    const agent = agents.find(a => a.id === Number(currentAgentId));
    return agent?.name || "Agent inconnu";
  };

  // Types pour les accesseurs
  type PartnerIdAccessor = [number, string];
  type OrderIdAccessor = [number, string];
  type ProductIdAccessor = [number, string];

  // Définition des colonnes avec TanStack Table
  const columns = useMemo<ColumnDef<POSOrderLine>[]>(() => [
    {
      accessorKey: 'create_date',
      header: 'Date',
      cell: ({ row }: { row: OrderLineRow }) => (
        <div className="text-sm text-gray-900 dark:text-gray-100">
          {formatDate(row.original.create_date)}
        </div>
      ),
      size: 120,
    },
    // ...(isAdmin && !currentAgentId ? [{
    //   accessorKey: 'vendeuse',
    //   header: 'Vendeuse',
    //   cell: ({ row }: { row: OrderLineRow }) => (
    //     <div className="flex items-center space-x-2">
    //       <div className="w-2 h-2 bg-green-500 rounded-full"></div>
    //       <span className="font-medium">{row.original. || "Marie Dubois"}</span>
    //     </div>
    //   ),
    //   size: 150,
    // }] : []),
    {
      accessorKey: 'partner_id',
      header: 'Client',
      cell: ({ row }: { row: OrderLineRow }) => {
        const partnerId = row.original.partner_id as PartnerIdAccessor;
        return (
          <div className="font-medium">
            {partnerId && partnerId[1]}
          </div>
        );
      },
      size: 200,
    },
    {
      accessorKey: 'price_subtotal',
      header: 'Total',
      cell: ({ row }: { row: OrderLineRow }) => (
        <div className="text-right font-bold text-green-600">
          {formatAmount(row.original.price_subtotal)}
        </div>
      ),
      size: 120,
    },
    {
      accessorKey: 'order_id',
      header: 'Facture',
      cell: ({ row }: { row: OrderLineRow }) => {
        const orderId = row.original.order_id as OrderIdAccessor;
        return (
          <Badge variant="secondary" className="font-mono">
            {/* {orderId[1]} */}
          </Badge>
        );
      },
      size: 150,
    },
    {
      accessorKey: 'product_id',
      header: 'Produits',
      cell: ({ row }: { row: OrderLineRow }) => {
        const productId = row.original.product_id as ProductIdAccessor;

        return (
          <div className="flex flex-wrap gap-1 max-w-48">
            {/* <Badge variant="outline" className="text-xs">
              {productId[1]}
            </Badge> */}
          </div>
        );
      },
      size: 200,
    },
  ], [isAdmin, currentAgentId]);

  const table = useReactTable({
    data: orderLines,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    state: {
      pagination,
    },
    pageCount: Math.ceil(orderLines.length / pagination.pageSize),
  });

  const totalVentes = orderLines.reduce((acc: number, ol: POSOrderLine) => acc + ol.price_subtotal, 0);
  const totalCout = totalVentes * 0.485;
  const totalCommission = totalCout * 0.12;

  if (!profile) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* En-tête */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href="/"
              className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
            >
              ← Retour
            </Link>

            <div className="flex items-center space-x-3">
              <div className="px-2">
                <h1 className="text-2xl lg:text-3xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate">
                  Tableau de Bord {isAdmin ? 'Administrateur' : 'Vendeuse'}
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm truncate">
                  {isAdmin ? (
                    <>Suivi des ventes et commissions - {getCurrentAgentName()} - {getMonthName(currentMonth.toString())} {currentYear}</>
                  ) : (
                    <>Mes ventes et commissions - {getMonthName(currentMonth.toString())} {currentYear}</>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Filtres */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4 lg:mt-0">
            {isAdmin && (
              <select 
                value={currentAgentId || ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('agent', e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 min-w-48"
              >
                <option value="">Tous les agents</option>
                {agents.map((agent: { id: number; name: string }) => (
                  <option key={agent.id} value={agent.id.toString()}>
                    {agent.name}
                  </option>
                ))}
              </select>
            )}

            <div className="flex gap-2">
              <select 
                value={currentMonth.toString()}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('month', e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700"
              >
                <option value="1">Janvier</option>
                <option value="2">Février</option>
                <option value="3">Mars</option>
                <option value="4">Avril</option>
                <option value="5">Mai</option>
                <option value="6">Juin</option>
                <option value="7">Juillet</option>
                <option value="8">Août</option>
                <option value="9">Septembre</option>
                <option value="10">Octobre</option>
                <option value="11">Novembre</option>
                <option value="12">Décembre</option>
              </select>

              <select 
                value={currentYear.toString()}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('year', e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700"
              >
                <option value="2023">2023</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
          </div>
        </div>

        {/* Indicateur de contexte */}
        {isAdmin && currentAgentId && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Affichage des données pour : <strong>{getCurrentAgentName()}</strong>
                </span>
              </div>
              {currentAgentId && (
                <button
                  onClick={() => handleFilterChange('agent', '')}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline"
                >
                  Voir tous les agents
                </button>
              )}
            </div>
          </div>
        )}

        {/* Cartes de résumé */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Ventes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatAmount(totalVentes)}
              </div>
              {/* <p className="text-xs text-gray-500 mt-1">
                {new Set(orderLines.map(r => r.order_id[0])).size} ventes
              </p> */}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Coût
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatAmount(totalCout)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Coût des marchandises
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Commission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatAmount(totalCommission)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                12%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tableau avec TanStack Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Détail des Ventes
              {isAdmin && currentAgentId && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  - {getCurrentAgentName()}
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Liste complète des transactions pour {getMonthName(currentMonth.toString())} {currentYear}
              {isAdmin && !currentAgentId && " - Tous les agents"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead 
                          key={header.id}
                          style={{ width: header.getSize() }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row: OrderLineRow) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        Aucune vente trouvée.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {table.getState().pagination.pageIndex + 1} sur{' '}
                  {table.getPageCount()}
                </span>
                <select
                  value={table.getState().pagination.pageSize}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    table.setPageSize(Number(e.target.value))
                  }}
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-slate-700"
                >
                  {[10, 20, 30, 40, 50].map((pageSize: number) => (
                    <option key={pageSize} value={pageSize}>
                      {pageSize} lignes
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Résumé du tableau */}
            <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-300">
                  Affichage de {table.getRowModel().rows.length} ventes sur {orderLines.length} total
                  {isAdmin && currentAgentId && ` pour ${getCurrentAgentName()}`}
                </span>
                <div className="flex gap-4">
                  <span className="text-green-600 font-medium">
                    Total: {formatAmount(totalVentes)}
                  </span>
                  <span className="text-purple-600 font-medium">
                    Commission: {formatAmount(totalCommission)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}