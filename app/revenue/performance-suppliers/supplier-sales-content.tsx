'use client'

import React, { useMemo } from 'react';
import { format, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SupplierTrendTable } from './_components/supplier-trend-table';

export default function SupplierSalesContent({ data, month, year }: { data: any[], month: string, year: string }) {
  const months = useMemo(() => {
    const referenceDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthCols = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(referenceDate, i);
      monthCols.push({
        key: format(d, 'yyyy-MM'),
        label: format(d, 'MMM', { locale: fr }).toUpperCase()
      });
    }
    return monthCols;
  }, [month, year]);

  return (
    <div className="w-full">
      <SupplierTrendTable data={data} months={months} />
    </div>
  );
}