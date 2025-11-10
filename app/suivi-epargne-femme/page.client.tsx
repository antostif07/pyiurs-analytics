'use client'
import Multiselect from "@/components/MultiSelect";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { BoutiqueSalesData } from "./page";
import { format } from "date-fns";

const months = [
  { value: "1", label: "Janvier" },
  { value: "2", label: "Février" },
  { value: "3", label: "Mars" },
  { value: "4", label: "Avril" },
  { value: "5", label: "Mai" },
  { value: "6", label: "Juin" },
  { value: "7", label: "Juillet" },
  { value: "8", label: "Août" },
  { value: "9", label: "Septembre" },
  { value: "10", label: "Octobre" },
  { value: "11", label: "Novembre" },
  { value: "12", label: "Décembre" }
];

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(amount)
}

interface SuiviEpargneFemmeProps {
    month?: string;
    year?: string;
    boutiques: { id: string; name: string }[];
    selectedBoutiqueId?: string;
    data: BoutiqueSalesData[]
}

export default function SuiviEpargneFemme({month, year, selectedBoutiqueId, boutiques, data}: SuiviEpargneFemmeProps) {
    const router = useRouter()
    const pathname = usePathname()

    // const columns = useMemo<ColumnDef<TableRowData>[]>(() => [])

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* En-tête */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Suivi Epargne Femme/Kids
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-2">
                    Suivi quotidien des ventes et de l&apos;épargne par boutique
                    </p>
                </div>
                </div>

                {/* Filtres */}
                <Card className="mb-8">
                    <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row gap-4 items-center">
                        {/* Sélecteur de mois */}
                        {/* <Multiselect options={months} label="Mois" placeholder="Selectionner le mois" /> */}
                        <select 
                            value={month || new Date().getMonth() + 1}
                            onChange={(e) => {
                            const newParams = new URLSearchParams();
                            if (selectedBoutiqueId) newParams.set('boutique', selectedBoutiqueId);
                            if (e.target.value) newParams.set('month', e.target.value);
                            if (year) newParams.set('year', year);
                            router.push(`${pathname}?${newParams.toString()}`);
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
                            value={year || new Date().getFullYear()}
                            onChange={(e) => {
                            const newParams = new URLSearchParams();
                            if (selectedBoutiqueId) newParams.set('boutique', selectedBoutiqueId);
                            if (month) newParams.set('month', month);
                            if (e.target.value) newParams.set('year', e.target.value);
                            router.push(`${pathname}?${newParams.toString()}`);
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
                            if (month) newParams.set('month', month);
                            if (year) newParams.set('year', year);
                            router.push(`${pathname}?${newParams.toString()}`);
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
                        {/* {table.getFilteredRowModel().rows.length} résultats */}
                        </div>
                    </div>
                    </CardContent>
                </Card>

                {/* Tableau principal */}
                <Card>
                <CardHeader>
                    <CardTitle>Ventes Quotidiennes par Boutique</CardTitle>
                    <CardDescription>
                    {/* {new Date(Number(selectedYear), Number(selectedMonth) - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} */}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-32 sticky left-0 bg-white dark:bg-slate-800 z-10">
                            Boutique
                            </TableHead>
                            <TableHead className="min-w-24 text-right font-bold bg-gray-50 dark:bg-slate-700">
                            Total
                            </TableHead>
                            {data.map(d => (
                            <TableHead key={d.date} className="min-w-20 text-center">
                                {format(d.date, 'dd/MM')}
                            </TableHead>
                            ))}
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {/* Ligne des ventes */}
                        <TableRow className="bg-green-50 dark:bg-green-900/20">
                            <TableCell className="font-medium sticky left-0 bg-green-50 dark:bg-green-900/20">
                            Ventes ($)
                            </TableCell>
                            <TableCell className="text-right font-bold bg-green-100 dark:bg-green-800/30">
                            {formatAmount(data.reduce((acc, val) => (
                                acc + val.total_sales
                            ), 0))}
                            </TableCell>
                            {
                                data.map(d => {
                                    return (
                                        <TableCell key={d.date} className="text-right">
                                        {formatAmount(d.total_sales)}
                                        </TableCell>
                                    )
                                })
                            }
                        </TableRow>

                        {/* Ligne de l'épargne théorique */}
                        <TableRow className="bg-blue-50 dark:bg-blue-900/20">
                            <TableCell className="font-medium sticky left-0 bg-blue-50 dark:bg-blue-900/20">
                            Épargne Théorique ($)
                            </TableCell>
                            <TableCell className="text-right font-bold bg-blue-100 dark:bg-blue-800/30">
                            {formatAmount(data.reduce((acc, val) => (
                                acc + val.total_sales
                            ), 0) / 2)}
                            </TableCell>
                            {
                                data.map(d => {
                                    return (
                                        <TableCell key={d.date} className="text-right">
                                        {formatAmount(d.total_sales/2)}
                                        </TableCell>
                                    )
                                })
                            }
                        </TableRow>

                        {/* Ligne de l'épargne réelle */}
                        <TableRow className="bg-purple-50 dark:bg-purple-900/20">
                            <TableCell className="font-medium sticky left-0 bg-purple-50 dark:bg-purple-900/20">
                            Épargne Réelle ($)
                            </TableCell>
                            <TableCell className="text-right font-bold bg-purple-100 dark:bg-purple-800/30">
                            {/* {formatAmount(globalTotals.savings)} */}
                            </TableCell>
                            {/* {Array.from({ length: daysInMonth }, (_, dayIndex) => {
                            const dailyTotal = data.reduce((sum, boutique) => 
                                sum + (boutique.dailySales[dayIndex]?.savings || 0), 0
                            )
                            return (
                                <TableCell key={dayIndex} className="text-right">
                                {dailyTotal > 0 ? formatAmount(dailyTotal) : "-"}
                                </TableCell>
                            )
                            })} */}
                        </TableRow>

                        {/* Lignes par boutique */}
                        {/* {data.map((boutiqueData) => (
                            <TableRow key={boutiqueData.boutique}>
                            <TableCell className="font-medium sticky left-0 bg-white dark:bg-slate-800">
                                {boutiqueData.boutique}
                            </TableCell>
                            <TableCell className="text-right font-bold bg-gray-50 dark:bg-slate-700">
                                <div className="space-y-1">
                                <div className="text-green-600">{formatAmount(boutiqueData.totalSales)}</div>
                                <div className="text-blue-600 text-sm">{formatAmount(boutiqueData.totalTheoreticalSavings)}</div>
                                <div className="text-purple-600 text-sm">{formatAmount(boutiqueData.totalSavings)}</div>
                                <div className="pt-1">
                                    <PerformanceIndicator 
                                    actual={boutiqueData.totalSavings} 
                                    theoretical={boutiqueData.totalTheoreticalSavings} 
                                    />
                                </div>
                                </div>
                            </TableCell>
                            {boutiqueData.dailySales.map((day, dayIndex) => (
                                <TableCell key={dayIndex} className="text-right">
                                <div className="space-y-1">
                                    <div className="text-green-600 font-medium">
                                    {day.sales > 0 ? formatAmount(day.sales) : "-"}
                                    </div>
                                    <div className="text-blue-600 text-xs">
                                    {day.theoreticalSavings > 0 ? formatAmount(day.theoreticalSavings) : "-"}
                                    </div>
                                    <div className="text-purple-600 text-xs">
                                    {day.savings > 0 ? formatAmount(day.savings) : "-"}
                                    </div>
                                </div>
                                </TableCell>
                            ))}
                            </TableRow>
                        ))} */}
                        </TableBody>
                    </Table>
                    </div>
                </CardContent>
                </Card>
            </div>
        </div>
    )
}