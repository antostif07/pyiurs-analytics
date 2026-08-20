'use client'

import React, { useEffect, useMemo, useState } from 'react';
import { format, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { EnrichedGroupedProduct } from './page';
import { BeautyTrendTable, MonthDefinition } from '@/components/revenue/beauty-trend-table';
import { ClientStockFilter } from './client-stock-filter';
import { ExportExcelButton } from '../performance-femme/_components/export-excel-button';

interface BeautySalesContentProps {
  data: EnrichedGroupedProduct[];
  month: string;
  year: string;
}

export default function BeautySalesContent({ data, month, year }: BeautySalesContentProps) {
  // 1. Générer les colonnes des 6 derniers mois (Chronologique : M-5 -> M)
  const months = useMemo<MonthDefinition[]>(() => {
    const referenceDate = new Date(parseInt(year), parseInt(month) - 1, 1);

    const monthCols: MonthDefinition[] = [];

    // On part de 5 mois en arrière jusqu'au mois actuel
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(referenceDate, i);
      monthCols.push({
        key: format(d, 'yyyy-MM'),
        label: format(d, 'MMM', { locale: fr }).toUpperCase()
      });
    }

    return monthCols;
  }, [month, year]);

  const [localData, setLocalData] = useState(data);

  // Sync si les props changent (ex: changement de mois ou filtres serveur)
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
        <ClientStockFilter
          data={data}
          onFilterChange={setLocalData}
        />

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-[10px] font-mono text-slate-400">
            {localData.length} / {data.length} produits affichés
          </span>

          {/* ✅ BOUTON D'EXPORT EXCEL */}
          <ExportExcelButton
            data={localData}
            months={months}
            month={month}
            year={year}
          />
        </div>
      </div>

      <BeautyTrendTable
        data={localData}
        months={months}
      />
    </div>
  );
}