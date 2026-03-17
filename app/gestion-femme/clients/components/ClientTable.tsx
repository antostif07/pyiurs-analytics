'use client'

import { useState, useMemo, Fragment } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'

import { 
  ChevronDown, ChevronRight, Mail, Phone, Package, 
  FileDown, ArrowUpDown, Search, ChevronLeft, ChevronRight as ChevronRightIcon,
  CalendarDays
} from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { Button } from '@/components/ui/button'
import MultipleSelector, { Option } from "@/components/ui/multiselect"
import * as XLSX from 'xlsx'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'

const columnHelper = createColumnHelper<any>()

export default function ClientTable({ initialData, productOptions }: { initialData: any[], productOptions: Option[] }) {
  const [sorting, setSorting] = useState<any[]>([{ id: 'totalSpent', desc: true }])
  const [globalFilter, setGlobalFilter] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<Option[]>([])
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  const columns = useMemo(() => [
    columnHelper.accessor('name', {
      header: 'CLIENT',
      cell: info => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center font-black text-[9px]">
            {info.getValue().substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-[13px] leading-tight">{info.getValue()}</p>
            <p className="text-[10px] text-gray-400 font-medium flex items-center gap-2 mt-0.5">
               <Mail size={10}/> {info.row.original.email} <span className="text-gray-200">|</span> <Phone size={10}/> {info.row.original.phone}
            </p>
          </div>
        </div>
      )
    }),
    columnHelper.accessor('totalSpent', {
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting()} className="h-8 text-[10px] font-black w-full justify-end hover:bg-transparent">
          CA TOTAL <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: info => <div className="text-right font-black text-gray-900 text-sm">{info.getValue().toLocaleString()} $</div>
    }),
    columnHelper.accessor('averageBasket', {
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting()} className="h-8 text-[10px] font-black w-full justify-end hover:bg-transparent">
          PANIER MOYEN <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: info => (
        <div className="text-right">
            <span className="font-bold text-rose-600 text-sm">{info.getValue().toLocaleString()} $</span>
            <p className="text-[9px] text-gray-400 font-bold uppercase">{info.row.original.orderCount} Achats</p>
        </div>
      )
    }),
    columnHelper.accessor('status', {
      header: () => <div className="text-center text-[10px] font-black">STATUT</div>,
      cell: info => <div className="flex justify-center"><StatusBadge status={info.getValue()} /></div>
    }),
    columnHelper.accessor('lastPurchase', {
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting()} className="h-8 text-[10px] font-black w-full justify-end hover:bg-transparent">
          DERNIÈRE ACTIVITÉ <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: info => (
        <div className="text-right">
          <p className="text-xs font-bold text-gray-500">{info.getValue()}</p>
        </div>
      )
    })
  ], [])

    // LOGIQUE DE FILTRE PAR PRODUIT (Calculée avant React Table)
    const filteredData = useMemo(() => {
        let data = initialData;
        if (globalFilter) {
            data = data.filter(c => 
                c.name.toLowerCase().includes(globalFilter.toLowerCase()) || 
                c.phone.includes(globalFilter)
            )
        }
        if (selectedProducts.length > 0) {
            const selectedCleanNames = selectedProducts.map(p => p.value);
            data = data.filter(client => 
                // On vérifie si le client a acheté AU MOINS UN des produits propres sélectionnés
                selectedCleanNames.some(name => 
                client.products.some((p: any) => p.name === name)
                )
            );
        }
        return data;
    }, [initialData, globalFilter, selectedProducts]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 10 } }
  })

  const handleExportExcel = () => {
    const dataToExport = table.getFilteredRowModel().rows.map(r => ({
      Nom: r.original.name,
      Email: r.original.email,
      Telephone: r.original.phone,
      CA_Total: r.original.totalSpent,
      Panier_Moyen: r.original.averageBasket,
      Statut: r.original.status,
      Dernier_Achat: r.original.lastPurchase
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clients Beauty");
    XLSX.writeFile(wb, `Export_Clients_Beauty_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* FILTRES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
        <div className="lg:col-span-4 space-y-2">
            <Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Rechercher</Label>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                <input 
                    placeholder="Nom ou téléphone..." 
                    className="w-full pl-10 pr-4 h-11 rounded-2xl bg-gray-50 border-none text-sm outline-none focus:ring-2 focus:ring-rose-500/10 transition-all"
                    value={globalFilter}
                    onChange={e => setGlobalFilter(e.target.value)}
                />
            </div>
        </div>

        <div className="lg:col-span-6 space-y-2">
            <Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Filtrer par produits achetés</Label>
            <MultipleSelector
                value={selectedProducts}
                onChange={setSelectedProducts}
                defaultOptions={productOptions}
                placeholder="Sélectionner des articles..."
                emptyIndicator={<p className="text-center text-sm">Aucun produit trouvé</p>}
                className="bg-gray-50 border-none rounded-2xl min-h-[44px]"
            />
        </div>

        <div className="lg:col-span-2">
            <Button onClick={handleExportExcel} className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-50">
                <FileDown size={16} className="mr-2" /> EXCEL
            </Button>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  <th className="w-10 px-6"></th>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="px-4 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-50">
              {table.getRowModel().rows.map(row => (
                <Fragment key={row.id}>
                  <tr 
                    className={`hover:bg-rose-50/5 cursor-pointer transition-all ${expandedIds[row.id] ? 'bg-rose-50/10' : ''}`}
                    onClick={() => setExpandedIds(p => ({...p, [row.id]: !p[row.id]}))}
                  >
                    <td className="px-6 py-4">
                      {expandedIds[row.id] ? <ChevronDown size={18} className="text-rose-600" /> : <ChevronRight size={18} className="text-gray-300" />}
                    </td>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  
                  {/* LIGNE EXPANSIBLE (Mise à jour du colSpan) */}
                  {expandedIds[row.id] && (
                    <tr className="bg-gray-50/30">
                      <td colSpan={6} className="px-20 py-8">
                          <div className="flex flex-col gap-4 border-l-2 border-rose-200 pl-8">
                              <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2 italic">
                                  <Package size={14} className="text-rose-500" /> Historique détaillé des achats
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {row.original.products.map((p: any, idx: number) => (
                                      <div key={idx} className="bg-white p-3 rounded-2xl border border-gray-100 flex justify-between shadow-sm items-center hover:border-rose-200 transition-colors">
                                          <span className="text-[11px] font-bold text-gray-700">{p.name}</span>
                                          <Badge className="bg-rose-50 text-rose-600 border-none font-black text-[10px]">x{p.qty}</Badge>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* --- PAGINATION (RESTOUREE) --- */}
        <div className="p-5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
              <div className="flex gap-1">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => table.previousPage()} 
                    disabled={!table.getCanPreviousPage()} 
                    className="rounded-xl h-9 w-9 p-0 border-gray-200"
                >
                    <ChevronLeft size={16}/>
                </Button>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => table.nextPage()} 
                    disabled={!table.getCanNextPage()} 
                    className="rounded-xl h-9 w-9 p-0 border-gray-200"
                >
                    <ChevronRightIcon size={16}/>
                </Button>
              </div>
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
              </span>
          </div>

          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Total sélectionné : <span className="text-rose-600">{table.getFilteredRowModel().rows.length} clients</span>
          </p>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
    const styles: any = {
      'Actif': 'bg-emerald-500',
      'Inactif': 'bg-amber-400',
      'Très inactif': 'bg-rose-500',
    }
    return (
      <div className="flex items-center gap-2">
         <div className={`w-1.5 h-1.5 rounded-full ${styles[status]}`} />
         <span className="text-[11px] font-bold text-gray-600">{status}</span>
      </div>
    )
}