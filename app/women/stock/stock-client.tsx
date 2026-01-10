"use client"

import { ColumnDef } from '@tanstack/react-table';
import { ProductLifecycle } from '../services';
import { DataTable } from '@/components/data-table';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

// --- DÉFINITION DES COLONNES (Côté Client maintenant) ---
const columns: ColumnDef<ProductLifecycle>[] = [
  {
    accessorKey: "modelName",
    header: "Modèle",
    cell: ({ row }) => (
      <div>
        <div className="font-bold text-gray-900">{row.original.modelName}</div>
        <div className="text-xs text-gray-400">{row.original.daysOnMarket} jours sur le marché</div>
      </div>
    ),
  },
  {
    accessorKey: "firstDropDate",
    header: "Arrivages",
    cell: ({ row }) => {
        const d1 = new Date(row.original.firstDropDate).toLocaleDateString();
        const d2 = new Date(row.original.lastDropDate).toLocaleDateString();
        return (
            <div className="text-xs">
                <div>In: {d1}</div>
                {d1 !== d2 && <div className="text-blue-600 font-medium">Re: {d2}</div>}
            </div>
        )
    }
  },
  {
    header: "Cycle de Vie (Vol.)",
    accessorKey: "totalOrdered", // Pour le tri
    cell: ({ row }) => (
        <div className="flex flex-col text-right">
            <span className="text-xs text-gray-500">Commandé: <span className="font-bold text-gray-700">{row.original.totalOrdered}</span></span>
            <span className="text-xs text-emerald-600">Vendu: <span className="font-bold">{row.original.totalSold}</span></span>
            <span className="text-xs font-bold text-blue-600 mt-1">{row.original.lifetimeSellThrough.toFixed(0)}% Écoulé</span>
        </div>
    )
  },
  {
    header: "Derniers 30 Jours",
    accessorKey: "sold30d",
    cell: ({ row }) => (
        <div className="text-center">
            {row.original.sold30d > 0 ? (
                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    +{row.original.sold30d} ventes
                 </span>
            ) : (
                <span className="text-gray-300">-</span>
            )}
        </div>
    )
  },
  {
    header: "Stock Restant",
    accessorKey: "stockCurrent",
    cell: ({ row }) => (
        <div className="text-right font-mono font-bold text-lg text-gray-800">
            {row.original.stockCurrent}
        </div>
    )
  },
  {
    header: "Performance Financière",
    accessorKey: "revenueGenerated",
    cell: ({ row }) => (
        <div className="text-right text-xs">
            <div title="CA encaissé">💰 {row.original.revenueGenerated.toLocaleString()}</div>
            <div className="text-gray-400 mt-1" title="Potentiel restant">
                🔜 {row.original.potentialRevenue.toLocaleString()}
            </div>
        </div>
    )
  }
];

interface StockClientWrapperProps {
  data: ProductLifecycle[];
  totalCount: number;
  pageSize: number;
}

export default function StockClientWrapper({ data, totalCount, pageSize }: StockClientWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Récupération de la page actuelle depuis l'URL
  const page = Number(searchParams.get('page')) || 1;
  const pageCount = Math.ceil(totalCount / pageSize);

  // Fonction pour changer de page
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <DataTable columns={columns} data={data} showPagination={false} />
      
      {/* Contrôles de Pagination Manuels (Au cas où DataTable n'a pas les boutons externes) */}
      <div className="flex items-center justify-between border-t pt-4">
        <div className="text-sm text-gray-500">
           Affichage {((page - 1) * pageSize) + 1} à {Math.min(page * pageSize, totalCount)} sur {totalCount} modèles
        </div>
        <div className="flex gap-2">
            <button
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
                className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50 text-sm"
            >
                Précédent
            </button>
            <span className="px-3 py-1 bg-gray-100 rounded text-sm font-medium">
                Page {page}
            </span>
            <button
                disabled={page >= pageCount}
                onClick={() => handlePageChange(page + 1)}
                className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50 text-sm"
            >
                Suivant
            </button>
        </div>
      </div>
    </div>
  );
}