'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter } from "next/navigation";
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
  ExpandedState,
  getExpandedRowModel,
  CellContext,
} from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Users, TrendingUp, Target } from 'lucide-react';
import { BeautyBrandsData, BrandData } from '../types/product_template';
import React from 'react';
import { access } from 'fs';

interface BeautyBrandsClientProps {
  initialData: BeautyBrandsData;
  boutiques: { id: string; name: string }[];
  selectedBoutiqueId?: string;
  selectedMonth?: string;
  selectedYear?: string;
}

// Types pour les données de la table
interface TableRowData extends BrandData {
  isBrand: boolean;
  isHsCodeGroup: boolean;
  subRows?: TableRowData[];
}

interface DailySales {
  amount: number;
  quantity: number;
}

// Créer une structure hiérarchique pour React Table
function createHierarchicalData(initialData: BeautyBrandsData): TableRowData[] {
  const data = initialData.brands.map(brand => {
    // Trouver les groupes hs_code pour cette marque
    const brandHsCodeGroups = initialData.hsCodeGroups?.filter(group => 
      group.parentId === brand.id
    ) || [];

    // Pour chaque groupe hs_code, trouver les produits correspondants
    const hsCodeGroupsWithProducts = brandHsCodeGroups.map(hsCodeGroup => {
      const groupProducts = initialData.products.filter(product => 
        product.parentId === hsCodeGroup.id
      );

      return {
        ...hsCodeGroup,
        isBrand: false,
        isHsCodeGroup: true,
        // subRows: groupProducts.map(product => ({
        //   ...product,
        //   isBrand: false,
        //   isHsCodeGroup: false,
        //   subRows: undefined
        // }))
      } as TableRowData;
    });

    return {
      ...brand,
      isBrand: true,
      subRows: hsCodeGroupsWithProducts
    } as TableRowData;
  });
  
  return data;
}

export default function BeautyBrandsClient({
  initialData,
  boutiques,
  selectedBoutiqueId,
  selectedMonth,
  selectedYear
}: BeautyBrandsClientProps) {
  const router = useRouter();
  const pathName = usePathname()
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [expanded, setExpanded] = useState<ExpandedState>({});

    // Créer les données hiérarchiques
    const tableData = useMemo(() => {
        return createHierarchicalData(initialData);
    }, [initialData]);

  // Calculer les totaux journaliers pour le footer
  const dailyTotals = useMemo(() => {
    const totals: { [date: string]: { amount: number; quantity: number } } = {};
    
    initialData.dateRange.forEach(date => {
      totals[date] = { amount: 0, quantity: 0 };
    });

    // Additionner toutes les marques et produits
    initialData.brands.forEach(brand => {
      initialData.dateRange.forEach(date => {
        if (brand.dailySales[date]) {
          totals[date].amount += brand.dailySales[date].amount;
          totals[date].quantity += brand.dailySales[date].quantity;
        }
      });
    });

    return totals;
  }, [initialData]);

  // Définition des colonnes avec types appropriés
  const columns = useMemo<ColumnDef<TableRowData>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Marque / Produit',
      cell: ({ row, getValue }: CellContext<TableRowData, unknown>) => {
        const isBrand = row.original.isBrand;
        const isHsCodeGroup = row.original.isHsCodeGroup;
        const paddingLeft = row.depth * 20 + 'px';
        
        return (
          <div 
            className="flex items-center space-x-2 sticky left-0 bg-inherit min-w-[300px]"
            style={{ paddingLeft }}
          >
            {(isBrand || isHsCodeGroup) && row.getCanExpand() && (
              <button
                onClick={row.getToggleExpandedHandler()}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {row.getIsExpanded() ? '▼' : '►'}
              </button>
            )}
            {isBrand && (
              <>
                <span className={`
                  font-medium 
                  ${isBrand ? 'text-blue-600 dark:text-blue-400' : ''}
                  ${isHsCodeGroup ? 'text-green-600 dark:text-green-400 font-semibold' : ''}
                  ${!isBrand && !isHsCodeGroup ? 'text-gray-700 dark:text-gray-300' : ''}
                `}>
                  {getValue() as string}
                </span>
                <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {row.original.subRows?.length || 0} gamme(s)
                </span>
              </>
            )}
            {isHsCodeGroup && (
              <span className="text-xs text-gray-500 bg-green-100 dark:bg-green-900 px-2 py-1 rounded mr-3">
                {row.original.name}
              </span>
            )}
            {!isHsCodeGroup && !isBrand && (
              <span className="text-xs text-gray-500 bg-green-100 dark:bg-green-900 px-2 py-1 rounded mr-3">
                {row.original.name}
              </span>
            )}
          </div>
        );
      },
      size: 350,
    },
    {
      accessorKey: 'totalAmount',
      header: 'Total',
      cell: ({ row, getValue }: CellContext<TableRowData, unknown>) => {
        const amount = getValue() as number;
        const quantity = row.original.totalQuantity;
        const isHsCodeGroup = row.original.isHsCodeGroup;
        const isBrand = row.original.isBrand;
        
        return (
          <div className={`
            text-right font-medium flex space-x-2
            ${isHsCodeGroup ? 'bg-green-50 dark:bg-green-900/20 py-2' : ''}
          `}>
            {
              isBrand ? (
                <>
                  <span className={isHsCodeGroup ? 'font-bold' : ''}>
                    {amount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}$
                  </span>
                  <span className="text-sm text-gray-500">({quantity})</span>
                </>
              ) : isHsCodeGroup ? (
                <>
                  <span className={isHsCodeGroup ? 'font-bold' : ''}>
                    {row.original.totalAmount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}$
                  </span>
                  <span className="text-sm text-gray-500">({row.original.totalQuantity})</span>
                </>
              ) : !isBrand && !isHsCodeGroup ? (
                <>
                  <span>
                    {row.original.totalAmount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}$
                  </span>
                  <span className="text-sm text-gray-500">({row.original.totalQuantity})</span>
                </>
              ) : null
            }
          </div>
        );
      },
      footer: () => {
        const totalAmount = Object.values(dailyTotals).reduce((sum, day) => sum + day.amount, 0);
        const totalQuantity = Object.values(dailyTotals).reduce((sum, day) => sum + day.quantity, 0);
        return (
          <div className="text-right font-bold flex space-x-2">
            <span className="text-sm">
              {totalAmount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}$
            </span>
            <span className="text-xs text-gray-600">
              ({totalQuantity})
            </span>
          </div>
        );
      },
      size: 120,
    },
    // Colonnes dynamiques pour chaque jour
    ...initialData.dateRange.map(date => ({
    id: `daily-${date}`,
    // Pas d'accessorKey ni accessorFn - tout se passe dans la cellule
    header: () => {
      const dateObj = new Date(date);
      return (
        <div className="text-center">
          <div className="text-xs font-medium">
            {dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </div>
          <div className="text-xs text-gray-500">
            {dateObj.toLocaleDateString('fr-FR', { weekday: 'short' })}
          </div>
        </div>
      );
    },
    cell: ({ row }: CellContext<TableRowData, unknown>) => {
      // ACCÈS DIRECT aux données de la ligne actuelle (marque, groupe HS ou produit)
      const dailyData = row.original.dailySales?.[date] as DailySales | undefined;
      const isHsCodeGroup = row.original.isHsCodeGroup;

      console.log(`${row.original.name} (${row.original.type}) - ${date}:`, dailyData);
      
      if (!dailyData || (dailyData.amount === 0 && dailyData.quantity === 0)) {
        return <div className="text-center text-gray-300">-</div>;
      }
      
      return (
        <div className={`
          text-center flex space-x-2 justify-center
          ${isHsCodeGroup ? 'bg-green-50 dark:bg-green-900/20 py-2' : ''}
        `}>
          <div className={`font-medium text-sm ${isHsCodeGroup ? 'font-bold' : ''}`}>
            {dailyData.amount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}$
          </div>
          <div className="text-xs text-gray-500">
            ({dailyData.quantity})
          </div>
        </div>
      );
    },
    footer: () => {
      const total = dailyTotals[date];
      return (
        <div className="text-center font-bold flex space-x-2 justify-center">
          <div className="text-sm">
            {total.amount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}$
          </div>
          <div className="text-xs text-gray-600">
            ({total.quantity})
          </div>
        </div>
      );
    },
    size: 100,
  })),
  ], [initialData.dateRange, dailyTotals]);

  // Configuration de la table
  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      expanded,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onExpandedChange: setExpanded,
    getRowCanExpand: (row) => row.original.isBrand || row.original.isHsCodeGroup,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  // Statistiques
  const stats = useMemo(() => {
    const totalAmount = initialData.brands.reduce((sum, brand) => sum + brand.totalAmount, 0);
    const totalQuantity = initialData.brands.reduce((sum, brand) => sum + brand.totalQuantity, 0);
    const brandCount = initialData.brands.length;
    const productCount = initialData.products.length;

    return {
      totalAmount,
      totalQuantity,
      brandCount,
      productCount,
      averagePerBrand: brandCount > 0 ? totalAmount / brandCount : 0,
    };
  }, [initialData]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/"
                className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
              >
                ← Retour
              </Link>
              
              <div className="flex items-center space-x-3">
                <Sparkles className="w-8 h-8 text-purple-500" />
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Ventes Beauty
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">
                    Analyse par marque et produit
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <Sparkles className="w-8 h-8 mb-2 opacity-90" />
              <p className="text-sm opacity-90">CA Total Beauty</p>
              <p className="text-2xl font-bold">{stats.totalAmount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}$</p>
              <p className="text-xs opacity-80 mt-1">{stats.totalQuantity} unités vendues</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <Users className="w-8 h-8 mb-2 opacity-90" />
              <p className="text-sm opacity-90">Marques</p>
              <p className="text-2xl font-bold">{stats.brandCount}</p>
              <p className="text-xs opacity-80 mt-1">{stats.productCount} produits</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <TrendingUp className="w-8 h-8 mb-2 opacity-90" />
              <p className="text-sm opacity-90">Moyenne par Marque</p>
              <p className="text-2xl font-bold">{stats.averagePerBrand.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}$</p>
              <p className="text-xs opacity-80 mt-1">CA moyen</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-4">
              <Target className="w-8 h-8 mb-2 opacity-90" />
              <p className="text-sm opacity-90">Période</p>
              <p className="text-2xl font-bold">{initialData.dateRange.length} jours</p>
              <p className="text-xs opacity-80 mt-1">d&apos;activité</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Rechercher une marque ou un produit..."
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Sélecteur de mois */}
                <select 
                    value={selectedMonth || new Date().getMonth() + 1}
                    onChange={(e) => {
                    const newParams = new URLSearchParams();
                    if (selectedBoutiqueId) newParams.set('boutique', selectedBoutiqueId);
                    if (e.target.value) newParams.set('month', e.target.value);
                    if (selectedYear) newParams.set('year', selectedYear);
                    router.push(`${pathName}?${newParams.toString()}`);
                    }}
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

                {/* Sélecteur d'année */}
                <select 
                    value={selectedYear || new Date().getFullYear()}
                    onChange={(e) => {
                    const newParams = new URLSearchParams();
                    if (selectedBoutiqueId) newParams.set('boutique', selectedBoutiqueId);
                    if (selectedMonth) newParams.set('month', selectedMonth);
                    if (e.target.value) newParams.set('year', e.target.value);
                    router.push(`${pathName}?${newParams.toString()}`);
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700"
                >
                    <option value="2023">2023</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                </select>
              
              <select 
                value={selectedBoutiqueId || ''}
                onChange={(e) => {
                  const newParams = new URLSearchParams();
                  if (e.target.value) newParams.set('boutique', e.target.value);
                  if (selectedMonth) newParams.set('month', selectedMonth);
                  if (selectedYear) newParams.set('year', selectedYear);
                  router.push(`${pathName}?${newParams.toString()}`);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700"
              >
                <option value="">Toutes les boutiques</option>
                {boutiques.map(boutique => (
                  <option key={boutique.id} value={boutique.id}>
                    {boutique.name}
                  </option>
                ))}
              </select>

              <div className="text-sm text-gray-500">
                {table.getFilteredRowModel().rows.length} résultats
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Détail des Ventes par Marque</span>
              <span className="text-sm font-normal text-gray-500">
                {initialData.dateRange.length} jours affichés
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
                          className={`
                            text-left py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white
                            ${header.index === 0 ? 'sticky left-0 bg-gray-50 dark:bg-slate-700/30 z-10' : ''}
                          `}
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
                  {table.getRowModel().rows.map((row) => {
                    return (
                      <React.Fragment key={row.id}>
                        {/* Ligne principale */}
                        <tr 
                          className={`
                            ${row.getIsExpanded() ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                            hover:bg-gray-50 dark:hover:bg-slate-700/50 
                          `}
                        >
                          {row.getVisibleCells().map((cell, index) => (
                            <td 
                              key={cell.id} 
                              className={`
                                py-4 px-6
                                ${index === 0 ? 'sticky left-0 bg-white z-5' : ''}
                                ${row.original.isHsCodeGroup ? 'bg-green-50 dark:bg-green-900/20' : ''}
                              `}
                              style={{ width: cell.column.getSize() }}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                        
                        {/* Sous-lignes quand la ligne est développée */}
                        {row.getIsExpanded() && row.original.subRows && row.original.subRows.length > 0 && (
                          row.original.subRows.map((subRow, subIndex) => (
                            <React.Fragment key={`${row.id}-sub-${subIndex}`}>
                              {/* Ligne du groupe HS Code ou produit */}
                              <tr 
                                className={`
                                  ${subRow.isHsCodeGroup ? 'bg-gray-50 dark:bg-slate-800/30' : 'bg-gray-25 dark:bg-slate-800/10'}
                                  hover:bg-gray-100 dark:hover:bg-slate-700/50
                                `}
                              >
                                {row.getVisibleCells().map((cell, index) => (
                                  <td 
                                    key={`${row.id}-${subRow.id}-${cell.id}`}
                                    className={`
                                      ${index === 0 ? 'sticky left-0 bg-white z-5' : ''}
                                      ${subRow.isHsCodeGroup ? 'bg-green-50 dark:bg-green-900/20 py-3' : 'py-2'}
                                    `}
                                    style={{ 
                                      width: cell.column.getSize(),
                                      paddingLeft: index === 0 
                                        ? (subRow.isHsCodeGroup ? '40px' : '60px')
                                        : 'inherit'
                                    }}
                                  >
                                    {flexRender(cell.column.columnDef.cell, {
                                      ...cell.getContext(),
                                      row: {
                                        ...cell.row,
                                        original: subRow,
                                        id: `${row.id}-${subRow.id}`,
                                        depth: row.depth + 1
                                      }
                                    })}
                                  </td>
                                ))}
                              </tr>
                              
                              {/* Produits sous le groupe HS Code (si le sous-row est un groupe hs_code) */}
                              {subRow.isHsCodeGroup && subRow.subRows && subRow.subRows.map((productRow, productIndex) => (
                                <tr 
                                  key={`${row.id}-product-${productIndex}`}
                                  className="bg-gray-25 dark:bg-slate-800/10 hover:bg-gray-50 dark:hover:bg-slate-700/30"
                                >
                                  {row.getVisibleCells().map((cell, index) => (
                                    <td 
                                      key={`${row.id}-${productRow.id}-${cell.id}`}
                                      className={`
                                        py-2 px-6
                                        ${index === 0 ? 'sticky left-0 bg-white z-5' : ''}
                                      `}
                                      style={{ 
                                        width: cell.column.getSize(),
                                        paddingLeft: index === 0 ? '80px' : 'inherit'
                                      }}
                                    >
                                      {flexRender(cell.column.columnDef.cell, {
                                        ...cell.getContext(),
                                        row: {
                                          ...cell.row,
                                          original: productRow,
                                          id: `${row.id}-${productRow.id}`,
                                          depth: row.depth + 2
                                        }
                                      })}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </React.Fragment>
                          ))
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                {/* Footer avec les totaux */}
                <tfoot>
                  {table.getFooterGroups().map(footerGroup => (
                    <tr 
                      key={footerGroup.id} 
                      className="border-t-2 border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-700/50 font-bold"
                    >
                      {footerGroup.headers.map(header => (
                        <td 
                          key={header.id} 
                          className="py-4 px-6"
                          style={{ width: header.getSize() }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.footer,
                                header.getContext()
                              )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tfoot>
              </table>
            </div>

            {/* Pagination */}
            <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Affichage de {table.getRowModel().rows.length} lignes
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
                  >
                    Précédent
                  </button>
                  
                  <span className="text-sm text-gray-500">
                    Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount()}
                  </span>
                  
                  <button
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
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