"use client"

import { formatDateFrench, getMonthDateRange, getYears, months } from "@/app/utils/date-utils";
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const years = getYears();

export default function PageFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [selectedMonth, setSelectedMonth] = useState(searchParams.get('month') || '');
    const [selectedYear, setSelectedYear] = useState(searchParams.get('year') || '');

    // Récupérer les dates du mois sélectionné
    const dateRange = getMonthDateRange(selectedMonth, selectedYear);

    const handleApplyFilters = () => {
        const params = new URLSearchParams(searchParams.toString());
        
        // if (selectedMonth) {
        //     params.set('month', selectedMonth);
        // } else {
        //     params.delete('month');
        // }
        
        // if (selectedYear) {
        //     params.set('year', selectedYear);
        // } else {
        //     params.delete('year');
        // }
        
        // Ajouter les dates de début et fin si les deux filtres sont sélectionnés
        if (selectedMonth && selectedYear) {
            params.set('start_date', dateRange.firstDay);
            params.set('end_date', dateRange.lastDay);
        } else {
            params.delete('start_date');
            params.delete('end_date');
        }
        
        // Mettre à jour l'URL
        const newUrl = `?${params.toString()}`;
        router.push(newUrl, { scroll: false });
    };

    const handleResetFilters = () => {
        setSelectedMonth('');
        setSelectedYear('');
        
        // Réinitialiser l'URL
        const params = new URLSearchParams();
        router.push('?', { scroll: false });
    };

    return (
        <div className="container mx-auto px-6 py-6">
            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Filtre Mois */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Mois
                                </label>
                                <Select 
                                    value={selectedMonth} 
                                    onValueChange={setSelectedMonth}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Sélectionner le mois" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map(month => (
                                            <SelectItem key={month.value} value={month.value}>
                                                {month.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Filtre Année */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Année
                                </label>
                                <Select 
                                    value={selectedYear} 
                                    onValueChange={setSelectedYear}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Sélectionner l'année" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {years.map(year => (
                                            <SelectItem key={year} value={year}>
                                                {year}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Affichage de la période sélectionnée */}
                        {dateRange.firstDay && dateRange.lastDay && (
                            <div className="flex-1">
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    <p className="font-medium">Période sélectionnée :</p>
                                    <p>Du {formatDateFrench(dateRange.firstDay)} au {formatDateFrench(dateRange.lastDay)}</p>
                                </div>
                            </div>
                        )}

                        {/* Boutons d'action */}
                        <div className="flex gap-2 mt-4 lg:mt-6">
                            <button 
                                onClick={handleApplyFilters}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
                            >
                                Appliquer
                            </button>
                            <button 
                                onClick={handleResetFilters}
                                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
                            >
                                Réinitialiser
                            </button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}