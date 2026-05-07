'use client'

import React, { useEffect, useMemo, useState } from 'react';
import { format, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { EnrichedGroupedProduct } from './page';
import { BeautyTrendTable, MonthDefinition, ProductTrendData } from '@/components/revenue/beauty-trend-table';
import { useSearchParams } from 'next/navigation';
import { ClientStockFilter } from './client-stock-filter';

interface BeautySalesContentProps {
  data: EnrichedGroupedProduct[];
  month: string;
  year: string;
}

export default function BeautySalesContent({ data, month, year }: BeautySalesContentProps) {
  // 1. Générer les colonnes des 6 derniers mois (Chronologique : M-5 -> M)
  const months = useMemo<MonthDefinition[]>(() => {
    // Date de référence (ex: 1er Mars 2026)
    const referenceDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    
    const monthCols: MonthDefinition[] = [];
    
    // On part de 5 mois en arrière jusqu'au mois actuel
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(referenceDate, i);
      monthCols.push({
        key: format(d, 'yyyy-MM'),     // ex: "2025-10" (doit correspondre aux clés dans monthlySales)
        label: format(d, 'MMM', { locale: fr }).toUpperCase() // ex: "OCT"
      });
    }
    
    return monthCols;
  }, [month, year]);

  const [localData, setLocalData] = useState(data);

  // Sync si les props changent (ex: changement de mois)
  useEffect(() => { setLocalData(data) }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <ClientStockFilter 
           data={data} 
           onFilterChange={setLocalData} 
        />
        <div className="text-[10px] text-slate-400">
            {localData.length} produits affichés
        </div>
      </div>

      <BeautyTrendTable 
        data={localData} 
        months={months} 
      />
    </div>
  );
}