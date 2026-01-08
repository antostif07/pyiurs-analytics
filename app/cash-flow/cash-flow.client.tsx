// app/rapport-journalier/RapportJournalierClient.tsx
'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { CalendarIcon, TrendingUp, DollarSign, PieChart, Download } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import RapportHeader from './Header';

// --- TYPES PARTAGÉS ---
export interface ShopData {
  name: string;
  s_o: number | null;
  entree_ventes: number | null;
  banque_pos: number | null;
  cash_paiement_securite: number | null;
  cash_paiement_sal_agents: number | null;
  epargne_coffre_fort: number | null;
  cash_financement: number | null;
  cash_boost_service: number | null;
  cash_boost_produit: number | null;
  espece_compilee_epargne: number | null;
  espece_mobile_money: number | null;
  excedent_deficit: number | null;
  revenu_beauty: number | null;
  out_beauty: number | null;
  cumul_revenu_beauty: number | null;
  mobile_money_vte_en_cours: number | null;
  mobile_money_cumul_sortie: number | null;
  mobile_money_cumul_entree: number | null;
  versement_associes: number | null;
  transfert_cash: number | null;
  immobilisation: number | null;
  sortie_mobile_money: number | null;
  charge_marketing: number | null;
  charge_fiscale: number | null;
  perte: number | null;
  charge_personnel: number | null;
  charges_diverses: number | null;
  charge_administration: number | null;
  charge_marchandise: number | null;
  charge_operation: number | null;
  support_caisse_externe: number | null;
  exploitant_individuel: number | null;
  banque_pos_final: number | null;
  mobile_money_cumul_final: number | null;
}

export interface ReportData {
  date: string;
  shops: ShopData[];
  totals: Omit<ShopData, 'name'>;
  otherColumns: { [key: string]: number | null };
}

interface RapportJournalierClientProps {
  initialReportData: ReportData;
}

// --- DÉFINITION DES LIGNES ---
const reportRows = [
    { key: 's_o', label: 'S/O', isHeader: false, className: "bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-l-emerald-500" },
    { key: 'entree_ventes', label: 'Entrée : Ventes', isHeader: false, isMainSection: true, icon: '💰' },
    { key: 'banque_pos', label: 'Banque (POS)', isHeader: false, icon: '💳' },
    { key: 'cash_paiement_securite', label: 'Cash pour paiement de sécurité', isHeader: false, icon: '🛡️' },
    { key: 'cash_paiement_sal_agents', label: 'Cash pour paiement sal agents', isHeader: false, icon: '👥' },
    { key: 'epargne_coffre_fort', label: 'Epargne coffre fort', isHeader: false, icon: '🏦' },
    { key: 'cash_financement', label: 'Cash financement', isHeader: false, icon: '📈' },
    { key: 'cash_boost_service', label: 'Cash pour boost service', isHeader: false, icon: '🚀' },
    { key: 'cash_boost_produit', label: 'Cash pour boost produit', isHeader: false, icon: '📦' },
    { key: 'espece_compilee_epargne', label: 'Espèce compilée/épargne des boutiques', isHeader: false, icon: '🏪' },
    { key: 'espece_mobile_money', label: 'Espèce mobile money', isHeader: false, icon: '📱' },
    { key: 'excedent_deficit', label: 'Excédent/déficit/ Paiement onl/credit client', isHeader: false, icon: '⚖️' },
    { key: 'revenu_beauty', label: 'Revenu beauty', isHeader: false, className: 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' },
    { key: 'out_beauty', label: 'OUT beauty', isHeader: false, className: 'bg-red-50 dark:bg-red-900/20 border-l-4 border-l-red-500' },
    { key: 'cumul_revenu_beauty', label: 'Cumul revenu beauty(épargne bty)', isHeader: false, className: 'bg-green-50 dark:bg-green-900/20 border-l-4 border-l-green-500' },
    { key: 'mobile_money_vte_en_cours', label: 'Mobile Money/Vte en cours', isHeader: false, icon: '⏳' },
    { key: 'mobile_money_cumul_sortie', label: 'Mobile Money cumul sortie', isHeader: false, icon: '📤' },
    { key: 'mobile_money_cumul_entree', label: 'Mobile Money cumul entrée', isHeader: false, icon: '📥' },
    { key: 'total_cash', label: 'I. Sous-Total : CASH', isHeader: true, className: 'bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 font-bold border-t-2 border-b-2 border-purple-200 dark:border-purple-700' },
    { key: 'versement_associes', label: 'a. Bilan : Versement Associés, Sté Holding', isHeader: false, isSubSection: true, icon: '🤝' },
    { key: 'transfert_cash', label: 'a. Bilan : Transfert Cash / Depot Agc / Cartes', isHeader: false, isSubSection: true, icon: '💸' },
    { key: 'immobilisation', label: 'a. Bilan : Immobilisation', isHeader: false, isSubSection: true, icon: '🏢' },
    { key: 'sortie_mobile_money', label: 'a. Sortie mobile money', isHeader: false, isSubSection: true, icon: '📲' },
    { key: 'charge_marketing', label: 'b. Charge : Marketing', isHeader: false, isSubSection: true, icon: '📢' },
    { key: 'charge_fiscale', label: 'b. Charge : Fiscale', isHeader: false, isSubSection: true, icon: '🏛️' },
    { key: 'perte', label: 'b. Perte', isHeader: false, isSubSection: true, icon: '📉' },
    { key: 'charge_personnel', label: 'b. Charge : Personnel', isHeader: false, isSubSection: true, icon: '👨‍💼' },
    { key: 'charges_diverses', label: 'b. Charges: Diverses', isHeader: false, isSubSection: true, icon: '📋' },
    { key: 'charge_administration', label: 'b. Charge : Administration', isHeader: false, isSubSection: true, icon: '🏢' },
    { key: 'charge_marchandise', label: 'b. Charge : Marchandise', isHeader: false, isSubSection: true, icon: '📦' },
    { key: 'charge_operation', label: 'b. Charge : Operation', isHeader: false, isSubSection: true, icon: '⚙️' },
    { key: 'support_caisse_externe', label: 'Support caisse externe', isHeader: false, isSubSection: true, icon: '🏧' },
    { key: 'charges_non_declarees', label: 'Charges non déclarées', isHeader: true, className: 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30 font-bold border-t-2 border-b-2 border-red-200 dark:border-red-700' },
    { key: 'exploitant_individuel', label: 'c. Exploitant individuel', isHeader: false, isSubSection: true, icon: '👤' },
    { key: 'total_sorties', label: 'I.1. Sorties', isHeader: true, className: 'bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 font-bold border-t-2 border-b-2 border-purple-200 dark:border-purple-700' },
    { key: 'solde', label: 'I.2. Solde', isHeader: true, className: 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 font-bold border-t-2 border-b-2 border-green-200 dark:border-green-700' },
    { key: 'banque_pos_final', label: 'Banque (POS)', isHeader: false, icon: '💳' },
    { key: 'mobile_money_cumul_final', label: 'Mobile Money cumul', isHeader: false, icon: '📱' },
];

const formatValue = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getValueColor = (value: number | null | undefined, isPositiveGood = true) => {
    if (value === null || value === undefined) return '';
    if (value === 0) return 'text-gray-500';
    if (value > 0) return isPositiveGood ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    return isPositiveGood ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
};

export default function RapportJournalierClient({ initialReportData }: RapportJournalierClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [date, setDate] = useState<Date | undefined>(new Date(initialReportData.date));

    const handleDateChange = (newDate: Date | undefined) => {
        setDate(newDate);
        if (newDate) {
            const current = new URLSearchParams(Array.from(searchParams.entries()));
            current.set('date', format(newDate, 'yyyy-MM-dd'));
            const search = current.toString();
            const query = search ? `?${search}` : "";
            router.push(`${pathname}${query}`);
        }
    };

    const handleExport = () => {
        // Fonction d'export à implémenter
        console.log('Exporting report...');
    };
    
    const totalCash = (initialReportData.totals as any)['total_cash'] || 0;
    const totalSorties = (initialReportData.totals as any)['total_sorties'] || 0;
    const soldeFinal = (initialReportData.totals as any)['solde'] || 0;

    return (
        <div className="bg-linear-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/20 min-h-screen">
            <RapportHeader
                selectedDate={date || new Date()}
                handleDateChange={handleDateChange}
            />

            <main className="p-4 md:p-6 lg:p-8 space-y-6">
                {/* Cartes de résumé */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-l-4 border-l-blue-500 shadow-lg">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Cash</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {formatValue(totalCash)}
                                    </p>
                                </div>
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                    <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-l-4 border-l-purple-500 shadow-lg">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sorties</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {formatValue(totalSorties)}
                                    </p>
                                </div>
                                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                                    <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-l-4 border-l-green-500 shadow-lg">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Solde Final</p>
                                    <p className={cn("text-2xl font-bold", getValueColor(soldeFinal))}>
                                        {formatValue(soldeFinal)}
                                    </p>
                                </div>
                                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                                    <PieChart className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-l-4 border-l-orange-500 shadow-lg">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Boutiques</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {initialReportData.shops.length}
                                    </p>
                                    <Badge variant="secondary" className="mt-1">
                                        Actives
                                    </Badge>
                                </div>
                                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                                    <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tableau principal */}
                <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-xl border-0">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table className="min-w-full">
                                <TableHeader>
                                    <TableRow className="bg-linear-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 border-b-2 border-gray-300 dark:border-gray-600">
                                        <TableHead className="w-[320px] font-bold text-gray-900 dark:text-white sticky left-0 bg-gray-100 dark:bg-gray-800 z-20 shadow-lg border-r border-gray-200 dark:border-gray-700">
                                            <div className="flex items-center gap-2">
                                                <span>Description</span>
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-right font-bold text-gray-900 dark:text-white min-w-30 bg-gray-50 dark:bg-gray-700/50">
                                            Total Général
                                        </TableHead>
                                        {initialReportData.shops.map((shop, index) => (
                                            <TableHead 
                                                key={shop.name} 
                                                className="text-right font-bold text-gray-900 dark:text-white min-w-30 bg-gray-50 dark:bg-gray-700/50"
                                            >
                                                <div className="flex flex-col">
                                                    <span>{shop.name}</span>
                                                    <Badge variant="secondary" className="text-xs mt-1">
                                                        #{index + 1}
                                                    </Badge>
                                                </div>
                                            </TableHead>
                                        ))}
                                        <TableHead className="text-right font-bold text-gray-900 dark:text-white min-w-25 bg-blue-50 dark:bg-blue-900/30">MM</TableHead>
                                        <TableHead className="text-right font-bold text-gray-900 dark:text-white min-w-25 bg-green-50 dark:bg-green-900/30">BNK</TableHead>
                                        <TableHead className="text-right font-bold text-gray-900 dark:text-white min-w-25 bg-yellow-50 dark:bg-yellow-900/30">CASH</TableHead>
                                        <TableHead className="text-right font-bold text-gray-900 dark:text-white min-w-25 bg-purple-50 dark:bg-purple-900/30">ZMTEO</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reportRows.map((row, index) => (
                                        <TableRow 
                                            key={row.key} 
                                            className={cn(
                                                "border-b dark:border-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30",
                                                row.className,
                                                index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-800/50'
                                            )}
                                        >
                                            <TableCell className={cn(
                                                "font-medium sticky left-0 z-10 shadow-lg border-r border-gray-200 dark:border-gray-700 transition-colors group",
                                                row.className,
                                                row.isHeader && "font-bold text-lg",
                                                row.isSubSection && "pl-8 text-sm",
                                                row.isMainSection && "text-blue-700 dark:text-blue-300 font-semibold"
                                            )}>
                                                <div className="flex items-center gap-3">
                                                    {row.icon && <span className="text-lg">{row.icon}</span>}
                                                    <span className={cn(
                                                        row.isHeader ? "text-base" : "text-sm",
                                                        row.isSubSection && "text-gray-600 dark:text-gray-400"
                                                    )}>
                                                        {row.label}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className={cn(
                                                "text-right font-semibold transition-colors",
                                                row.isHeader && "text-lg",
                                                getValueColor(
                                                    row.key === 'total_cash' ? totalCash :
                                                    row.key === 'total_sorties' ? totalSorties :
                                                    row.key === 'solde' ? soldeFinal :
                                                    initialReportData.totals[row.key as keyof typeof initialReportData.totals],
                                                    !row.key.includes('charge') && !row.key.includes('sortie') && !row.key.includes('out')
                                                )
                                            )}>
                                                {row.key === 'total_cash' ? formatValue(totalCash) :
                                                 row.key === 'total_sorties' ? formatValue(totalSorties) :
                                                 row.key === 'solde' ? formatValue(soldeFinal) :
                                                 formatValue(initialReportData.totals[row.key as keyof typeof initialReportData.totals])}
                                            </TableCell>
                                            {initialReportData.shops.map(shop => (
                                                <TableCell 
                                                    key={shop.name} 
                                                    className={cn(
                                                        "text-right text-sm transition-colors",
                                                        getValueColor(
                                                            shop[row.key as keyof typeof shop],
                                                            !row.key.includes('charge') && !row.key.includes('sortie') && !row.key.includes('out')
                                                        )
                                                    )}
                                                >
                                                    {formatValue(shop[row.key as keyof typeof shop])}
                                                </TableCell>
                                            ))}
                                            {/* Colonnes Supplémentaires */}
                                            <TableCell className="text-right text-sm bg-blue-50/50 dark:bg-blue-900/20">-</TableCell>
                                            <TableCell className="text-right text-sm bg-green-50/50 dark:bg-green-900/20">-</TableCell>
                                            <TableCell className="text-right text-sm bg-yellow-50/50 dark:bg-yellow-900/20">-</TableCell>
                                            <TableCell className="text-right text-sm bg-purple-50/50 dark:bg-purple-900/20">
                                                {formatValue(initialReportData.otherColumns[row.key as keyof typeof initialReportData.otherColumns])}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Légende */}
                <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                    <CardContent className="p-4">
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                                <span>Revenus</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-500 rounded"></div>
                                <span>Charges</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-500 rounded"></div>
                                <span>Soldes positifs</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                                <span>Totaux section</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}