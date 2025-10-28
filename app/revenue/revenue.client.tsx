'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RevenueData } from '../types/revenue';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { getMonthName, months } from '../utils/date-utils';

interface RevenueClientProps {
  revenueData: RevenueData;
  searchParams: {
    month?: string;
    year?: string;
    boutique?: string;
  };
}

// Fonction pour formater les nombres en dollars
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Fonction pour formater les pourcentages
function formatPercentage(value: number): string {
  return `${value}%`;
}

// Fonction pour formater les variations (nombres avec signe)
function formatVariation(value: number): string {
  return value > 0 ? `+${value}%` : `${value}%`;
}

function getCurrentMonth(): string {
  return (new Date().getMonth() + 1).toString();
}

export default function RevenueClient({ 
  revenueData,
  searchParams 
}: RevenueClientProps) {
    const router = useRouter();
    // États pour les filtres
    const [selectedMonth, setSelectedMonth] = useState(
        searchParams.month || getCurrentMonth()
    );

    const [selectedYear, setSelectedYear] = useState(
        searchParams.year || new Date().getFullYear().toString()
    );

    // const years = useMemo(() => {
    //     const currentYear = new Date().getFullYear();
    //     return Array.from({ length: currentYear - 2018 + 1 }, (_, i) => currentYear - i);
    // }, []);

    const updateURL = useCallback((month: string, year: string) => {
        const params = new URLSearchParams();
        
        // Ne pas ajouter le mois s'il s'agit du mois actuel
        const currentMonth = getCurrentMonth();
        if (month !== currentMonth) {
        params.set('month', month);
        }
        
        // Ne pas ajouter l'année s'il s'agit de l'année actuelle
        const currentYear = new Date().getFullYear().toString();
        if (year !== currentYear) {
        params.set('year', year);
        }
        
        // Conserver les autres paramètres existants
        if (searchParams.boutique) {
        params.set('boutique', searchParams.boutique);
        }
        
        const queryString = params.toString();
        const newUrl = queryString ? `/revenue?${queryString}` : '/revenue';
        
        router.replace(newUrl, { scroll: false });
    }, [router, searchParams.boutique]);

    // Gestion des changements de filtres
    const handleMonthChange = useCallback((month: string) => {
        setSelectedMonth(month);
        updateURL(month, selectedYear);
    }, [selectedYear, updateURL]);

    const handleYearChange = useCallback((year: string) => {
        setSelectedYear(year);
        updateURL(selectedMonth, year);
    }, [selectedMonth, updateURL]);

    // Mettre à jour l'URL au chargement initial si nécessaire
    useEffect(() => {
        const currentMonth = getCurrentMonth();
        const currentYear = new Date().getFullYear().toString();
        
        // Si les valeurs par défaut sont différentes des valeurs actuelles, mettre à jour l'URL
        if (selectedMonth !== currentMonth || selectedYear !== currentYear) {
        updateURL(selectedMonth, selectedYear);
        }
    }, [selectedMonth, selectedYear, updateURL]);

    // Statistiques principales formatées
    const mainStats = useMemo(() => [
        {
        title: "Vente du jour",
        amount: revenueData.dailySales.amount,
        budget: revenueData.dailySales.budget,
        percentage: revenueData.dailySales.percentage,
        color: "blue"
        },
        {
        title: "Vente J-1",
        amount: revenueData.previousDaySales.amount,
        budget: revenueData.previousDaySales.budget,
        percentage: revenueData.previousDaySales.percentage,
        color: "green"
        },
        {
        title: "Vente de la semaine",
        amount: revenueData.weeklySales.amount,
        budget: revenueData.weeklySales.budget,
        percentage: revenueData.weeklySales.percentage,
        color: "purple"
        },
        {
        title: "Vente du Mois",
        amount: revenueData.monthlySales.amount,
        budget: revenueData.monthlySales.budget,
        percentage: revenueData.monthlySales.percentage,
        color: "orange"
        }
    ], [revenueData]);

  // Couleurs pour les cartes de statistiques
  const statColors = {
    blue: { gradient: 'from-blue-500 to-blue-600', text: 'text-blue-100' },
    green: { gradient: 'from-green-500 to-green-600', text: 'text-green-100' },
    purple: { gradient: 'from-purple-500 to-purple-600', text: 'text-purple-100' },
    orange: { gradient: 'from-orange-500 to-orange-600', text: 'text-orange-100' }
  };

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
                    Rapport Revenue
                </h1>
                <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Mois :</span>
                        <Select
                        value={selectedMonth}
                        onValueChange={handleMonthChange}
                        >
                        <SelectTrigger className="w-32 bg-white dark:bg-slate-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                            <SelectValue placeholder="Sélectionner un mois">
                            {getMonthName(selectedMonth)}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {months.map((month) => (
                            <SelectItem key={month.value} value={month.value}>
                                {month.name}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Année :</span>
                    <Select
                        value={selectedYear}
                        onValueChange={handleYearChange}
                    >
                        <SelectTrigger className="w-24 bg-transparent border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                        <SelectValue placeholder="Sélectionner une année" />
                        </SelectTrigger>
                        <SelectContent>
                        {Array.from({ length: new Date().getFullYear() - 2018 + 1 }, (_, i) => {
                            const year = new Date().getFullYear() - i;
                            return (
                            <SelectItem key={year} value={year.toString()}>
                                {year}
                            </SelectItem>
                            );
                        })}
                        </SelectContent>
                    </Select>
                    </div>
                </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="container mx-auto px-6 py-8">
        {/* Statistiques principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {mainStats.map((stat, index) => (
            <Card key={index} className={`bg-gradient-to-br ${statColors[stat.color as keyof typeof statColors].gradient} text-white`}>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">{stat.title}</h3>
                <div className="space-y-2">
                  <p className="text-3xl font-bold">{formatCurrency(stat.amount)}</p>
                  <div className="flex justify-between items-center text-sm">
                    <span className={statColors[stat.color as keyof typeof statColors].text}>
                      Budget: {formatCurrency(stat.budget)}
                    </span>
                    <span className={`px-2 py-1 rounded-full ${
                      stat.percentage >= 80 ? 'bg-green-200 text-green-800' :
                      stat.percentage >= 50 ? 'bg-yellow-200 text-yellow-800' :
                      'bg-red-200 text-red-800'
                    }`}>
                      % Réalisé: {formatPercentage(stat.percentage)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Section Revenu par Boutique (Hebdomadaire) */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Revenu / Boutique (Hebdomadaire)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30">
                    {revenueData.boutiqueRevenue.headers.map((header, index) => (
                      <th 
                        key={index}
                        className="text-left py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {revenueData.boutiqueRevenue.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="py-4 px-6 font-medium text-gray-900 dark:text-white">
                        {row.boutique}
                      </td>
                      {row.values.map((value, colIndex) => (
                        <td key={colIndex} className="py-4 px-6 text-gray-600 dark:text-gray-300">
                          {value > 0 ? formatCurrency(value) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* Ligne Total */}
                  <tr className="bg-gray-50 dark:bg-slate-700/50 font-semibold border-t border-gray-200 dark:border-slate-600">
                    <td className="py-4 px-6 text-gray-900 dark:text-white">Total</td>
                    {revenueData.boutiqueRevenue.total.map((total, index) => (
                      <td key={index} className="py-4 px-6 text-gray-900 dark:text-white">
                        {formatCurrency(total)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Section Performance des Boutiques */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Performance des Boutiques</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30">
                    {revenueData.boutiquePerformance.headers.map((header, index) => (
                      <th 
                        key={index}
                        className="text-left py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {revenueData.boutiquePerformance.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="py-4 px-6 font-medium text-gray-900 dark:text-white">
                        {row.boutique}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          row.wow >= 100 ? 'bg-green-100 text-green-800' :
                          row.wow >= 50 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {formatPercentage(row.wow)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                        {formatCurrency(row.mtd)}
                      </td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                        {formatCurrency(row.mtd1)}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          row.aMon > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {formatVariation(row.aMon)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                        {formatCurrency(row.pvMtd)}
                      </td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                        {formatCurrency(row.forecast)}
                      </td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                        {row.buM === Infinity ? 'Infini' : formatCurrency(row.buM)}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          row.percentageBU >= 80 ? 'bg-green-100 text-green-800' :
                          row.percentageBU >= 50 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {formatPercentage(row.percentageBU)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                        {formatCurrency(row.ytd1)}
                      </td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                        {formatCurrency(row.aYoy)}
                      </td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                        {row.buAnnuel === Infinity ? 'Infini' : formatCurrency(row.buAnnuel)}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          row.percentageBUA >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {formatVariation(row.percentageBUA)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Section Revenu par Segment (Hebdomadaire) */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Revenu / Segment (Hebdomadaire)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30">
                    {revenueData.segmentRevenue.headers.map((header, index) => (
                      <th 
                        key={index}
                        className="text-left py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {revenueData.segmentRevenue.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="py-4 px-6 font-medium text-gray-900 dark:text-white">
                        {row.segment}
                      </td>
                      {row.values.map((value, colIndex) => (
                        <td key={colIndex} className="py-4 px-6 text-gray-600 dark:text-gray-300">
                          {value > 0 ? formatCurrency(value) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* Ligne Total */}
                  <tr className="bg-gray-50 dark:bg-slate-700/50 font-semibold border-t border-gray-200 dark:border-slate-600">
                    <td className="py-4 px-6 text-gray-900 dark:text-white">Total</td>
                    {revenueData.segmentRevenue.total.map((total, index) => (
                      <td key={index} className="py-4 px-6 text-gray-900 dark:text-white">
                        {formatCurrency(total)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Section Performance des Segments */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Performance des Segments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30">
                    {revenueData.segmentPerformance.headers.map((header, index) => (
                      <th 
                        key={index}
                        className="text-left py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {revenueData.segmentPerformance.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="py-4 px-6 font-medium text-gray-900 dark:text-white">
                        {row.segment}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          row.wow >= 100 ? 'bg-green-100 text-green-800' :
                          row.wow >= 50 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {formatPercentage(row.wow)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                        {formatCurrency(row.mtd)}
                      </td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                        {formatCurrency(row.mtd1)}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          row.aMon > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {formatVariation(row.aMon)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                        {formatCurrency(row.pvMtd)}
                      </td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                        {formatCurrency(row.forecast)}
                      </td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                        {formatCurrency(row.buM)}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          row.percentageBU >= 20 ? 'bg-green-100 text-green-800' :
                          row.percentageBU >= 10 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {formatPercentage(row.percentageBU)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                        {formatCurrency(row.ytd1)}
                      </td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                        {formatCurrency(row.aYoy)}
                      </td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                        {formatCurrency(row.buAnnuel)}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          row.percentageBUA >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {formatVariation(row.percentageBUA)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}