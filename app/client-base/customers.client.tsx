// app/customers/components/customers.client.tsx
'use client';

import { useMemo, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  useReactTable, 
  getCoreRowModel, 
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Customer, CustomerCategory } from '../types/partner';
import { GroupedCustomer } from '@/lib/customer-grouping';

interface CustomersClientProps {
  initialCustomers: GroupedCustomer[];
  searchParams: {
    boutique?: string;
    page?: string;
    category?: CustomerCategory | 'ALL';
    search?: string;
  };
}

const categoryColors: Record<CustomerCategory, string> = {
  GOLD: 'bg-yellow-500 text-yellow-900',
  SILVER: 'bg-gray-400 text-gray-900',
  PYIURS: 'bg-purple-500 text-purple-900',
  NORMAL: 'bg-blue-500 text-blue-900'
};

const categoryLabels: Record<CustomerCategory, string> = {
  GOLD: '💎 Gold',
  SILVER: '🥈 Silver',
  PYIURS: '🏢 Pyiurs',
  NORMAL: '👤 Normal'
};

// Fonction pour déterminer le statut du client
function getCustomerStatus(lastOrderDate: string): { status: 'ACTIF' | 'INACTIF' | 'TRES_INACTIF'; days: number; color: string; label: string } {
  const lastOrder = new Date(lastOrderDate);
  const now = new Date();
  const daysSinceLastOrder = Math.floor((now.getTime() - lastOrder.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceLastOrder <= 90) {
    return { 
      status: 'ACTIF', 
      days: daysSinceLastOrder, 
      color: 'bg-green-100 text-green-800 border-green-200',
      label: '🟢 Actif'
    };
  } else if (daysSinceLastOrder <= 180) {
    return { 
      status: 'INACTIF', 
      days: daysSinceLastOrder, 
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      label: '🟡 Inactif'
    };
  } else {
    return { 
      status: 'TRES_INACTIF', 
      days: daysSinceLastOrder, 
      color: 'bg-red-100 text-red-800 border-red-200',
      label: '🔴 Très inactif'
    };
  }
}

// Fonction pour calculer le panier moyen
function calculateAverageOrderValue(totalAmount: number, orderCount: number): number {
  return orderCount > 0 ? totalAmount / orderCount : 0;
}

export default function CustomersClient({ initialCustomers, searchParams }: CustomersClientProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  
  // États pour react-table
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'totalAmountSpent', desc: true }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState(searchParams.search || '');
  
  // États pour les filtres combinés
  const [selectedCategories, setSelectedCategories] = useState<CustomerCategory[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<('ACTIF' | 'INACTIF' | 'TRES_INACTIF')[]>([]);

  // Préparer les données avec les statuts calculés
  const preparedCustomers = useMemo(() => {
    return initialCustomers.map(customer => {
      const statusInfo = getCustomerStatus(customer.lastOrderDate);
      const averageOrderValue = calculateAverageOrderValue(customer.totalAmountSpent, customer.totalOrderCount);
      
      return {
        ...customer,
        statusInfo,
        averageOrderValue,
        daysSinceLastOrder: statusInfo.days
      };
    });
  }, [initialCustomers]);

  // Filtrer par catégories et statuts
  const filteredCustomers = useMemo(() => {
    let filtered = preparedCustomers;

    // Filtre par catégories
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(customer => 
        selectedCategories.includes(customer.category)
      );
    }

    // Filtre par statuts
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(customer => 
        selectedStatuses.includes(customer.statusInfo.status)
      );
    }

    return filtered;
  }, [preparedCustomers, selectedCategories, selectedStatuses]);

  // Gestion des sélections de catégories
  const toggleCategory = useCallback((category: CustomerCategory) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  }, []);

  // Gestion des sélections de statuts
  const toggleStatus = useCallback((status: 'ACTIF' | 'INACTIF' | 'TRES_INACTIF') => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  }, []);

  // Réinitialiser tous les filtres
  const resetFilters = useCallback(() => {
    setSelectedCategories([]);
    setSelectedStatuses([]);
    setGlobalFilter('');
  }, []);

  // Statistiques pour les compteurs de filtres
  const filterCounts = useMemo(() => {
    const categoryCounts: Record<CustomerCategory, number> = {
      GOLD: 0, SILVER: 0, PYIURS: 0, NORMAL: 0
    };

    const statusCounts = {
      ACTIF: 0,
      INACTIF: 0,
      TRES_INACTIF: 0
    };

    preparedCustomers.forEach(customer => {
      categoryCounts[customer.category]++;
      statusCounts[customer.statusInfo.status]++;
    });

    return { categoryCounts, statusCounts };
  }, [preparedCustomers]);

  // Définition des colonnes
  const columns = useMemo<ColumnDef<typeof preparedCustomers[0]>[]>(() => [
    {
      accessorKey: 'primaryName',
      header: 'Client',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{row.getValue('primaryName')}</p>
          <p className="text-sm text-gray-500">
            Depuis {new Date(row.original.firstOrderDate).toLocaleDateString('fr-FR')}
            {row.original.mergedProfiles > 1 && (
              <span className="ml-2 text-blue-600">({row.original.mergedProfiles} profils fusionnés)</span>
            )}
          </p>
        </div>
      ),
      size: 250,
    },
    {
      accessorKey: 'contact',
      header: 'Contact',
      cell: ({ row }) => (
        <div>
          <p className="text-sm">{row.original.primaryEmail || 'Aucun email'}</p>
          <p className="text-sm text-gray-500">{row.original.displayPhone}</p>
          {row.original.allEmails.length > 1 && (
            <p className="text-xs text-orange-600 mt-1">
              +{row.original.allEmails.length - 1} email(s) alternatif(s)
            </p>
          )}
        </div>
      ),
      size: 200,
    },
    {
      accessorKey: 'category',
      header: 'Catégorie',
      cell: ({ row }) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[row.getValue('category') as CustomerCategory]}`}>
          {categoryLabels[row.getValue('category') as CustomerCategory]}
        </span>
      ),
      size: 120,
    },
    {
      accessorKey: 'statusInfo',
      header: 'Statut',
      cell: ({ row }) => (
        <div className="flex flex-col items-start space-y-1">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${row.original.statusInfo.color}`}>
            {row.original.statusInfo.label}
          </span>
          <span className="text-xs text-gray-500">
            {row.original.daysSinceLastOrder} jours
          </span>
        </div>
      ),
      size: 120,
    },
    {
      accessorKey: 'totalAmountSpent',
      header: 'CA Total',
      cell: ({ row }) => (
        <p className="font-medium text-gray-900 dark:text-white text-right">
          {Number(row.getValue('totalAmountSpent')).toLocaleString('fr-FR')}$
        </p>
      ),
      size: 120,
    },
    {
      accessorKey: 'totalOrderCount',
      header: 'Commandes',
      cell: ({ row }) => (
        <div className="text-right">
          <p className="text-gray-900 dark:text-white">{row.getValue('totalOrderCount')}</p>
        </div>
      ),
      size: 100,
    },
    {
      accessorKey: 'averageOrderValue',
      header: 'Panier Moyen',
      cell: ({ row }) => (
        <p className="text-gray-900 dark:text-white text-right">
          {Number(row.original.averageOrderValue).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}$
        </p>
      ),
      size: 120,
    },
    {
      accessorKey: 'lastOrderDate',
      header: 'Dernière Commande',
      cell: ({ row }) => (
        <div className="text-right">
          <p className="text-gray-900 dark:text-white">
            {new Date(row.getValue('lastOrderDate')).toLocaleDateString('fr-FR')}
          </p>
          <p className="text-sm text-gray-500">
            Il y a {row.original.daysSinceLastOrder} jours
          </p>
        </div>
      ),
      size: 150,
    },
  ], []);

  // Configuration de la table
  const table = useReactTable({
    data: filteredCustomers,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  // Export Excel
  const exportToExcel = useCallback(() => {
    const headers = [
      'Nom', 'Email', 'Téléphone', 'Catégorie', 'Statut', 
      'Jours inactifs', 'CA Total', 'Nombre de commandes', 
      'Panier moyen', 'Première commande', 'Dernière commande',
      'Profils fusionnés'
    ];
    
    const csvData = preparedCustomers.map(customer => [
      customer.primaryName,
      customer.primaryEmail || '',
      customer.displayPhone,
      customer.category,
      customer.statusInfo.label,
      customer.daysSinceLastOrder.toString(),
      customer.totalAmountSpent.toString(),
      customer.totalOrderCount.toString(),
      customer.averageOrderValue.toFixed(2),
      customer.firstOrderDate,
      customer.lastOrderDate,
      customer.mergedProfiles.toString()
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `clients_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [preparedCustomers]);

  // Statistiques
  const stats = useMemo(() => {
    const customersByCategory: Record<CustomerCategory, number> = {
      GOLD: 0, SILVER: 0, PYIURS: 0, NORMAL: 0
    };

    const customersByStatus = {
      ACTIF: 0,
      INACTIF: 0,
      TRES_INACTIF: 0
    };

    let totalRevenue = 0;
    let totalOrders = 0;

    preparedCustomers.forEach(customer => {
      customersByCategory[customer.category]++;
      customersByStatus[customer.statusInfo.status]++;
      totalRevenue += customer.totalAmountSpent;
      totalOrders += customer.totalOrderCount;
    });

    const activeRate = (customersByStatus.ACTIF / preparedCustomers.length) * 100;

    return {
      totalCustomers: preparedCustomers.length,
      customersByCategory,
      customersByStatus,
      totalRevenue,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      activeRate
    };
  }, [preparedCustomers]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/"
                className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Retour
              </Link>
              
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Gestion des Clients
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-2">
                  {preparedCustomers.length.toLocaleString()} clients • 
                  Taux d&apos;activation: {stats.activeRate.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Bouton d'export */}
            <div className="mt-4 lg:mt-0">
              <button
                onClick={exportToExcel}
                className="inline-flex items-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exporter Excel ({preparedCustomers.length.toLocaleString()})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <p className="text-sm opacity-90">Total Clients</p>
              <p className="text-2xl font-bold">{stats.totalCustomers.toLocaleString()}</p>
              <p className="text-xs opacity-80 mt-1">
                {stats.customersByStatus.ACTIF.toLocaleString()} actifs
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <p className="text-sm opacity-90">Clients Actifs</p>
              <p className="text-2xl font-bold">{stats.customersByStatus.ACTIF.toLocaleString()}</p>
              <p className="text-xs opacity-80 mt-1">
                {stats.activeRate.toFixed(1)}% du total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-4">
              <p className="text-sm opacity-90">Clients Gold</p>
              <p className="text-2xl font-bold">{stats.customersByCategory.GOLD.toLocaleString()}</p>
              <p className="text-xs opacity-80 mt-1">
                {((stats.customersByCategory.GOLD / stats.totalCustomers) * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <p className="text-sm opacity-90">CA Total</p>
              <p className="text-2xl font-bold">{stats.totalRevenue.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}$</p>
              <p className="text-xs opacity-80 mt-1">
                Panier moyen: {stats.averageOrderValue.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}$
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col space-y-4">
              {/* En-tête des filtres */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Rechercher un client..."
                    value={globalFilter ?? ''}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Bouton reset */}
                {(selectedCategories.length > 0 || selectedStatuses.length > 0 || globalFilter) && (
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
                  >
                    Réinitialiser
                  </button>
                )}

                <div className="text-sm text-gray-500">
                  {filteredCustomers.length.toLocaleString()} résultats
                </div>
              </div>

              {/* Filtres par catégorie */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Catégories :</h3>
                <div className="flex gap-2 flex-wrap">
                  {(['GOLD', 'SILVER', 'PYIURS', 'NORMAL'] as CustomerCategory[]).map(category => (
                    <button
                      key={category}
                      onClick={() => toggleCategory(category)}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        selectedCategories.includes(category)
                          ? categoryColors[category] + ' ring-2 ring-offset-2 ring-opacity-50'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {categoryLabels[category]} ({filterCounts.categoryCounts[category]})
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtres par statut */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Statuts :</h3>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => toggleStatus('ACTIF')}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedStatuses.includes('ACTIF')
                        ? 'bg-green-500 text-white ring-2 ring-green-300'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    🟢 Actif ({filterCounts.statusCounts.ACTIF})
                  </button>
                  <button
                    onClick={() => toggleStatus('INACTIF')}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedStatuses.includes('INACTIF')
                        ? 'bg-orange-500 text-white ring-2 ring-orange-300'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    🟡 Inactif ({filterCounts.statusCounts.INACTIF})
                  </button>
                  <button
                    onClick={() => toggleStatus('TRES_INACTIF')}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedStatuses.includes('TRES_INACTIF')
                        ? 'bg-red-500 text-white ring-2 ring-red-300'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    🔴 Très inactif ({filterCounts.statusCounts.TRES_INACTIF})
                  </button>
                </div>
              </div>

              {/* Résumé des filtres actifs */}
              {(selectedCategories.length > 0 || selectedStatuses.length > 0) && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Filtres actifs : 
                    {selectedCategories.length > 0 && (
                      <span className="ml-2">
                        Catégories: {selectedCategories.map(cat => categoryLabels[cat]).join(', ')}
                      </span>
                    )}
                    {selectedStatuses.length > 0 && (
                      <span className="ml-2">
                        Statuts: {selectedStatuses.join(', ')}
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table React Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Liste des Clients</span>
              <span className="text-sm font-normal text-gray-500">
                Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount().toLocaleString()}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id} className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30">
                      {headerGroup.headers.map(header => (
                        <th 
                          key={header.id} 
                          className="text-left py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white"
                          style={{ width: header.getSize() }}
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              {...{
                                className: header.column.getCanSort()
                                  ? 'cursor-pointer select-none flex items-center'
                                  : '',
                                onClick: header.column.getToggleSortingHandler(),
                              }}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {{
                                asc: ' 🔼',
                                desc: ' 🔽',
                              }[header.column.getIsSorted() as string] ?? null}
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      {row.getVisibleCells().map(cell => (
                        <td 
                          key={cell.id} 
                          className="py-4 px-6"
                          style={{ width: cell.column.getSize() }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination React Table */}
            <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Affichage de {table.getRowModel().rows.length} clients sur {table.getFilteredRowModel().rows.length.toLocaleString()}
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Précédent
                  </button>
                  
                  <span className="text-sm text-gray-500">
                    Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount().toLocaleString()}
                  </span>
                  
                  <button
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}