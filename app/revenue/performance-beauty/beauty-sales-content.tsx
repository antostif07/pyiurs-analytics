'use client'

import React, { useMemo } from 'react';
import { format, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { EnrichedGroupedProduct } from './page';
import { BeautyTrendTable, MonthDefinition, ProductTrendData } from '@/components/revenue/beauty-trend-table';
import { color } from 'framer-motion';

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

  // 2. Transformer les données pour le tableau
  const tableData = useMemo<ProductTrendData[]>(() => {
    return data.map((group) => ({
      hs_code: group.hs_code,
      name: group.name,
      monthlySales: group.monthlySales, // On passe les ventes calculées
      monthlyStockOpening: group.monthlyStockOpening, 
      currentStock: group.currentStock,
      color: group.color
    }));
  }, [data]);

  return (
    <div className="w-full">
      <BeautyTrendTable 
        data={tableData} 
        months={months} 
      />
    </div>
  );
}