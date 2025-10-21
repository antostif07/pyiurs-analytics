'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FinancialReport, FundTransaction } from '../types/management';

// Couleurs pour les statuts
const statusColors = {
  COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200'
};

const statusLabels = {
  COMPLETED: '✅ Completé',
  PENDING: '⏳ En attente',
  CANCELLED: '❌ Annulé'
};

const typeColors = {
  DEPOSIT: 'bg-blue-100 text-blue-800 border-blue-200',
  WITHDRAWAL: 'bg-orange-100 text-orange-800 border-orange-200',
  TRANSFER: 'bg-purple-100 text-purple-800 border-purple-200'
};

const typeLabels = {
  DEPOSIT: '💰 Dépôt',
  WITHDRAWAL: '💸 Retrait',
  TRANSFER: '🔄 Transfert'
};

interface FundsClientProps {
  financialData: FinancialReport;
  searchParams: {
    date?: string;
    category?: string;
    type?: string;
  };
}

// Type pour les lignes préparées
interface PreparedTransaction extends FundTransaction {
  rowId: string;
  formattedAmount: string;
  formattedBalance: string;
}

// Fonction utilitaire pour convertir une date en string YYYY-MM-DD sans problème de fuseau horaire
function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Fonction utilitaire pour créer une date à partir d'une string YYYY-MM-DD
function fromLocalDateString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export default function FundsClient({ 
  financialData,
  searchParams 
}: FundsClientProps) {
  const router = useRouter();
  
  // États pour react-table
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'date', desc: true }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  
  // États pour les filtres
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  // État pour la date sélectionnée
  const [selectedDate, setSelectedDate] = useState<Date>();

  // Initialiser avec la date du jour si aucune date n'est fournie
  useEffect(() => {
    if (searchParams.date) {
      // Utiliser notre fonction utilitaire pour éviter les problèmes de fuseau horaire
      setSelectedDate(fromLocalDateString(searchParams.date));
    } else {
      // Définir la date du jour par défaut
      setSelectedDate(new Date());
    }
  }, [searchParams.date]);

  // Mettre à jour l'URL quand la date change
  useEffect(() => {
    if (selectedDate) {
      // Utiliser notre fonction utilitaire pour éviter les problèmes de fuseau horaire
      const dateString = toLocalDateString(selectedDate);
      const todayString = toLocalDateString(new Date());
      
      const params = new URLSearchParams();
      
      // Ne mettre la date dans l'URL que si elle est différente d'aujourd'hui
      if (dateString !== todayString) {
        params.set('date', dateString);
      }
      
      if (searchParams.category) params.set('category', searchParams.category);
      if (searchParams.type) params.set('type', searchParams.type);
      
      const queryString = params.toString();
      const newUrl = queryString ? `/funds?${queryString}` : '/funds';
      
      router.replace(newUrl, { scroll: false });
    }
  }, [selectedDate, searchParams.category, searchParams.type, router]);

  // Préparer les données
  const preparedTransactions = useMemo((): PreparedTransaction[] => {
    return financialData.transactions.map((transaction, index) => ({
      ...transaction,
      rowId: `transaction-${transaction.id}-${index}`,
      formattedAmount: new Intl.NumberFormat('fr-FR').format(transaction.amount),
      formattedBalance: new Intl.NumberFormat('fr-FR').format(transaction.balanceAfter)
    }));
  }, [financialData.transactions]);

  // Extraire les catégories uniques
  const allCategories = useMemo(() => {
    const categories = new Set<string>();
    preparedTransactions.forEach(transaction => {
      categories.add(transaction.category);
    });
    return Array.from(categories).sort();
  }, [preparedTransactions]);

  // Filtrer les transactions
  const filteredTransactions = useMemo(() => {
    let filtered = preparedTransactions;

    // Filtre par date
    if (selectedDate) {
      const selectedDateString = toLocalDateString(selectedDate);
      filtered = filtered.filter(transaction => {
        const transactionDate = toLocalDateString(new Date(transaction.date));
        return transactionDate === selectedDateString;
      });
    }

    // Filtre par types
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(transaction => 
        selectedTypes.includes(transaction.type)
      );
    }

    // Filtre par statuts
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(transaction => 
        selectedStatuses.includes(transaction.status)
      );
    }

    // Filtre par catégories
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(transaction => 
        selectedCategories.includes(transaction.category)
      );
    }

    // Filtre global
    if (globalFilter) {
      const searchLower = globalFilter.toLowerCase();
      filtered = filtered.filter(transaction => 
        transaction.description.toLowerCase().includes(searchLower) ||
        transaction.agent.toLowerCase().includes(searchLower) ||
        transaction.category.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [preparedTransactions, selectedDate, selectedTypes, selectedStatuses, selectedCategories, globalFilter]);

  // Gestion des filtres
  const toggleType = useCallback((type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  }, []);

  const toggleStatus = useCallback((status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  }, []);

  const toggleCategory = useCallback((category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  }, []);

  const handleDateChange = useCallback((date: Date | undefined) => {
    setSelectedDate(date);
  }, []);

  const resetFilters = useCallback(() => {
    setSelectedTypes([]);
    setSelectedStatuses([]);
    setSelectedCategories([]);
    setGlobalFilter('');
    // Réinitialiser à la date du jour
    setSelectedDate(new Date());
  }, []);

  // Statistiques pour la date sélectionnée
  const stats = useMemo(() => {
    const selectedDateString = selectedDate ? toLocalDateString(selectedDate) : '';
    const dateTransactions = preparedTransactions.filter(transaction => {
      const transactionDate = toLocalDateString(new Date(transaction.date));
      return transactionDate === selectedDateString;
    });

    const totalDeposits = dateTransactions
      .filter(t => t.type === 'DEPOSIT')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalWithdrawals = dateTransactions
      .filter(t => t.type === 'WITHDRAWAL')
      .reduce((sum, t) => sum + t.amount, 0);

    const completedTransactions = dateTransactions.filter(t => t.status === 'COMPLETED').length;

    return {
      totalDeposits,
      totalWithdrawals,
      netFlow: totalDeposits - totalWithdrawals,
      completedTransactions,
      totalTransactions: dateTransactions.length,
      dateTransactions
    };
  }, [preparedTransactions, selectedDate]);

  // Définition des colonnes
  const columns = useMemo<ColumnDef<PreparedTransaction>[]>(() => [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => (
        <div className="text-left">
          <p className="font-medium text-gray-900 dark:text-white">
            {new Date(row.getValue('date')).toLocaleDateString('fr-FR')}
          </p>
          <p className="text-sm text-gray-500">
            {new Date(row.getValue('date')).toLocaleTimeString('fr-FR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        </div>
      ),
      size: 120,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => {
        const transaction = row.original;
        return (
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{transaction.description}</p>
            <p className="text-sm text-gray-500">{transaction.category}</p>
            <p className="text-xs text-gray-400">{transaction.agent} • {transaction.location}</p>
          </div>
        );
      },
      size: 250,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.getValue('type') as keyof typeof typeColors;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${typeColors[type]}`}>
            {typeLabels[type]}
          </span>
        );
      },
      size: 120,
    },
    {
      accessorKey: 'status',
      header: 'Statut',
      cell: ({ row }) => {
        const status = row.getValue('status') as keyof typeof statusColors;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[status]}`}>
            {statusLabels[status]}
          </span>
        );
      },
      size: 120,
    },
    {
      accessorKey: 'amount',
      header: 'Montant',
      cell: ({ row }) => {
        const transaction = row.original;
        return (
          <div className={`text-right font-medium ${
            transaction.type === 'DEPOSIT' ? 'text-green-600' : 'text-red-600'
          }`}>
            {transaction.type === 'DEPOSIT' ? '+' : '-'}{transaction.formattedAmount} FC
          </div>
        );
      },
      size: 120,
    },
    {
      accessorKey: 'balanceAfter',
      header: 'Solde Après',
      cell: ({ row }) => {
        const transaction = row.original;
        return (
          <div className="text-right">
            <p className="font-medium text-gray-900 dark:text-white">
              {transaction.formattedBalance} FC
            </p>
          </div>
        );
      },
      size: 140,
    },
  ], []);

  // Configuration de la table
  const table = useReactTable({
    data: filteredTransactions,
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

  // Export Excel pour la date sélectionnée
  const exportToExcel = useCallback(() => {
    const headers = ['Date', 'Description', 'Catégorie', 'Type', 'Statut', 'Montant', 'Solde Après', 'Agent', 'Lieu'];
    
    const csvData = filteredTransactions.map(transaction => [
      transaction.date,
      transaction.description,
      transaction.category,
      transaction.type,
      transaction.status,
      transaction.amount.toString(),
      transaction.balanceAfter.toString(),
      transaction.agent,
      transaction.location
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const dateLabel = selectedDate ? toLocalDateString(selectedDate) : 'all';
    link.setAttribute('href', url);
    link.setAttribute('download', `rapport_fonds_${dateLabel}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredTransactions, selectedDate]);

  const isTodaySelected = useMemo(() => {
    if (!selectedDate) return false;
    const today = new Date();
    return toLocalDateString(selectedDate) === toLocalDateString(today);
  }, [selectedDate]);

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
                  Gestion des Fonds
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Rapport financier et gestion des transactions
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
                Exporter CSV ({filteredTransactions.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques et Filtres */}
      <div className="container mx-auto px-6 py-8">
        {/* Filtre de date */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Filtre de date avec shadcn Calendar */}
                    <div className="flex-1">
                      <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Date spécifique
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal h-11"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? (
                              format(selectedDate, "PPP", { locale: fr })
                            ) : (
                              <span>Sélectionnez une date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleDateChange}
                            initialFocus
                            locale={fr}
                            className="rounded-md border"
                          />
                        </PopoverContent>
                      </Popover>
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedDate ? 
                          `Transactions du ${format(selectedDate, "PPP", { locale: fr })}` : 
                          'Sélectionnez une date'
                        }
                        {isTodaySelected && ' (Aujourd\'hui)'}
                      </p>
                    </div>

                    {/* Recherche globale */}
                    <div className="flex-1">
                      <label htmlFor="global-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Recherche
                      </label>
                      <input
                        id="global-search"
                        type="text"
                        placeholder="Rechercher une transaction, description, agent..."
                        value={globalFilter ?? ''}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Bouton reset */}
                {(selectedTypes.length > 0 || selectedStatuses.length > 0 || selectedCategories.length > 0 || globalFilter || !isTodaySelected) && (
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 self-end"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>

              {/* Statistiques rapides pour la date sélectionnée */}
              {/* {selectedDate && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{stats.totalTransactions}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Transactions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.totalDeposits.toLocaleString('fr-FR')} FC</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Dépôts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{stats.totalWithdrawals.toLocaleString('fr-FR')} FC</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Retraits</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${stats.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.netFlow >= 0 ? '+' : ''}{stats.netFlow.toLocaleString('fr-FR')} FC
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Solde net</p>
                  </div>
                </div>
              )} */}

              {/* Filtres par type, statut, catégorie */}
              {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Types :</h3>
                  <div className="flex gap-2 flex-wrap">
                    {(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => toggleType(type)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          selectedTypes.includes(type)
                            ? `${typeColors[type]} ring-2 ring-offset-2 ring-opacity-50`
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {typeLabels[type]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Statuts :</h3>
                  <div className="flex gap-2 flex-wrap">
                    {(['COMPLETED', 'PENDING', 'CANCELLED'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => toggleStatus(status)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          selectedStatuses.includes(status)
                            ? `${statusColors[status]} ring-2 ring-offset-2 ring-opacity-50`
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {statusLabels[status]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Catégories :</h3>
                  <div className="flex gap-2 flex-wrap">
                    {allCategories.map(category => (
                      <button
                        key={category}
                        onClick={() => toggleCategory(category)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          selectedCategories.includes(category)
                            ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              </div> */}
            </div>
          </CardContent>
        </Card>

        {/* Section Politique et Répartition */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8 mb-8">
          {/* Politique */}
          <Card>
            <CardHeader>
              <CardTitle>Politique Interne des Fonds</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <span className="font-medium">Revenue Beauty</span>
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {financialData.policy.beautyRevenue}$
                  </span>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">Opérations Autorisées:</h4>
                  {financialData.policy.allowedOperations.map((op, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">{op}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <span className="font-medium">Achats Marchandises</span>
                  <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                    {financialData.policy.otherRevenue}$
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Répartition Produits */}
          {/* <Card>
            <CardHeader>
              <CardTitle>Répartition par Produit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="font-medium text-center">Produit</div>
                  <div className="font-medium text-center">Montant (FC)</div>
                  <div className="font-medium text-center">Pourcentage</div>
                </div>
                
                {Object.entries(financialData.productBreakdown).map(([product, amount]) => {
                  const total = Object.values(financialData.productBreakdown).reduce((sum, val) => sum + val, 0);
                  const percentage = total > 0 ? (amount / total) * 100 : 0;
                  
                  return (
                    <div key={product} className="grid grid-cols-3 gap-4 items-center">
                      <div className="text-sm font-medium">{product}</div>
                      <div className="text-center font-semibold">{amount.toLocaleString('fr-FR')}</div>
                      <div className="text-center">
                        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card> */}
        </div>

        {/* Table des transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>
                Repartition
                {selectedDate && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({format(selectedDate, "PPP", { locale: fr })})
                  </span>
                )}
              </span>
              <span className="text-sm font-normal text-gray-500">
                Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount()}
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
                    <tr key={row.original.rowId} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
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
            <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Affichage de {table.getRowModel().rows.length} transactions sur {table.getFilteredRowModel().rows.length}
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
                    Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount()}
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