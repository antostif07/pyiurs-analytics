// components/revenue/client-stock-filter.tsx
'use client'

import React, { useState, useEffect } from 'react';

export function ClientStockFilter({ data, onFilterChange }: { data: any[], onFilterChange: (filtered: any[]) => void }) {
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');

  useEffect(() => {
    const minVal = parseInt(min) || 0;
    const maxVal = parseInt(max) || 999999;

    const filtered = data.filter(item => 
      item.currentStock >= minVal && item.currentStock <= maxVal
    );
    onFilterChange(filtered);
  }, [min, max, data]);

  return (
    <div className="flex gap-2 items-center p-2 bg-slate-50 rounded-xl border border-slate-200">
      <span className="text-[9px] font-bold text-slate-400 uppercase ml-2">Stock local:</span>
      <input 
        type="number" placeholder="Min" className="w-16 h-7 px-2 text-[11px] rounded-lg border"
        onChange={(e) => setMin(e.target.value)}
      />
      <input 
        type="number" placeholder="Max" className="w-16 h-7 px-2 text-[11px] rounded-lg border"
        onChange={(e) => setMax(e.target.value)}
      />
    </div>
  );
}