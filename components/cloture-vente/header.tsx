import { format } from "date-fns";
import { Calculator } from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { POSConfig } from "@/app/types/pos";

interface ClotureVenteHeaderProps {
    selectedShop: string;
    handleShopChange: (value: string) => void;
    exchangeRate: number;
    shops: POSConfig[];
}

export default function ClotureVenteHeader({selectedShop, handleShopChange, exchangeRate, shops}: ClotureVenteHeaderProps) {
    return (
        <div className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/"
                className="inline-flex items-center px-4 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
              >
                ← Retour
              </Link>

              <div className="flex items-center space-x-3">
                <Calculator className="w-8 h-8 text-green-500" />
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                    Clôture des Ventes
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">
                    {format(new Date(), 'dd/MM/yyyy')}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Filtres et Stats */}
            <div className="flex flex-col lg:flex-row items-center gap-4 mt-4 lg:mt-0">
              {/* Filtres */}
              <div className="flex items-center gap-3">
                {/* Filtre Shop */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Shop:</span>
                  <Select
                    value={selectedShop}
                    onValueChange={handleShopChange}
                  >
                    <SelectTrigger className="w-32 bg-white dark:bg-slate-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      {
                        shops.map((shop) => (
                          <SelectItem key={shop.id} value={shop.id.toString()}>
                            {shop.name}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>

                {/* Taux du jour */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Taux:</span>
                  <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-lg text-sm font-medium">
                    {exchangeRate?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FC/$
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
}