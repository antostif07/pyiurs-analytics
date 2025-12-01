'use client'

import { motion } from 'framer-motion';

interface Product {
  name: string;
  ref: string;
  imageUrl: string; // <-- Nouveau champ
  qty: number;
  total: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
};

export default function TopProductsList({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return <div className="text-gray-400 text-sm text-center py-10">Aucune vente cette semaine</div>;
  }

  const maxTotal = products[0]?.total || 1;

  return (
    <div className="space-y-4">
      {products.map((product, index) => (
        <motion.div
          key={product.ref + index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="group flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100"
        >
          {/* Section Gauche : Image + Infos */}
          <div className="flex items-center gap-4 flex-1">
            
            {/* RANG */}
            <span className={`
              flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold shrink-0
              ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                index === 1 ? 'bg-gray-100 text-gray-700' : 
                index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-white text-gray-400 border border-gray-100'}
            `}>
              #{index + 1}
            </span>

            {/* IMAGE PRODUIT */}
            <div className="relative w-12 h-12 rounded-md overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        // Fallback si l'image n'existe pas
                        (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=No+Img'; 
                    }}
                />
            </div>
            
            {/* TEXTES */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-gray-900 truncate" title={product.name}>
                {product.name}
              </h4>
              <p className="text-xs text-gray-500 font-mono mt-0.5">
                REF: {product.ref}
              </p>
              
              {/* BARRE DE PROGRESSION */}
              <div className="w-full h-1 bg-gray-100 rounded-full mt-2 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(product.total / maxTotal) * 100}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full bg-blue-600 rounded-full"
                />
              </div>
            </div>
          </div>

          {/* Section Droite : Chiffres */}
          <div className="text-right ml-4 shrink-0">
            <p className="text-sm font-bold text-gray-900">{formatCurrency(product.total)}</p>
            <p className="text-xs text-gray-500">{product.qty} pces</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}