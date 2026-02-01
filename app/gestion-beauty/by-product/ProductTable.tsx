'use client'

import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, Package } from 'lucide-react';
import { getProductsByHSCode } from '../data-fetcher';

export default function GroupedProductTable({ initialData }: { initialData: any[] }) {
  const [expandedCodes, setExpandedCodes] = useState<string[]>([]);
  const [details, setDetails] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState<string | null>(null);

  const toggleCode = async (hsCode: string) => {
    // Si déjà ouvert, on ferme
    if (expandedCodes.includes(hsCode)) {
      setExpandedCodes(prev => prev.filter(c => c !== hsCode));
      return;
    }

    // Sinon, on charge les données si pas déjà présentes
    if (!details[hsCode]) {
      setLoading(hsCode);
      const variants = await getProductsByHSCode(hsCode);
      setDetails(prev => ({ ...prev, [hsCode]: variants }));
      setLoading(null);
    }
    
    setExpandedCodes(prev => [...prev, hsCode]);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead className="bg-gray-50/80 border-b border-gray-100">
          <tr>
            <th className="w-12 px-6 py-4 text-[11px] font-bold text-gray-400 uppercase"></th>
            <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Modèle (HS Code)</th>
            <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase text-center">Produits</th>
            <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase text-right">Stock Cumulé</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {initialData.map((group) => {
            const isExpanded = expandedCodes.includes(group.hsCode);
            const items = details[group.hsCode] || [];

            return (
              <Fragment key={group.hsCode}>
                <tr 
                  key={group.hsCode}
                  onClick={() => toggleCode(group.hsCode)}
                  className={`cursor-pointer transition-colors ${isExpanded ? 'bg-pink-50/30' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-6 py-4">
                    {loading === group.hsCode ? (
                      <Loader2 size={18} className="animate-spin text-pink-500" />
                    ) : isExpanded ? (
                      <ChevronDown size={18} className="text-pink-600" />
                    ) : (
                      <ChevronRight size={18} className="text-gray-400" />
                    )}
                  </td>
                  <td className="px-4 py-4 font-bold text-gray-900">{group.hsCode}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[11px] font-bold">
                      {group.variantCount} variantes
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-gray-700">
                    {group.totalStock.toLocaleString()}
                  </td>
                </tr>

                {/* DÉTAIL DES VARIANTES */}
                {isExpanded && (
                  <tr>
                    <td colSpan={4} className="bg-gray-50/50 px-12 py-4">
                      <div className="border-l-2 border-pink-200 pl-6 space-y-2">
                        {items.map((item: any) => (
                          <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                              <p className="text-[10px] text-gray-400 uppercase">{item.default_code || 'Sans Réf'}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-gray-900">{item.qty_available} en stock</p>
                              <p className="text-[10px] text-gray-500">{item.lst_price} $</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}