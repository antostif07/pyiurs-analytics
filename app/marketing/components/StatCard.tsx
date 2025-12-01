'use client'

import { motion } from 'framer-motion';
// On importe les icônes ICI (côté client)
import { DollarSign, ShoppingBag, AlertTriangle, Archive, TrendingUp, LucideIcon } from 'lucide-react';
import clsx from 'clsx';

// Mapping des noms d'icônes vers les composants
const iconMap: Record<string, LucideIcon> = {
  money: DollarSign,
  trend: TrendingUp,
  alert: AlertTriangle,
  archive: Archive,
  bag: ShoppingBag,
};

interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  iconName: 'money' | 'trend' | 'alert' | 'archive' | 'bag'; // On passe une string
  color: 'blue' | 'green' | 'orange' | 'red';
  delay?: number;
}

export default function StatCard({ title, value, subValue, iconName, color, delay = 0 }: StatCardProps) {
  
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
  };

  // On récupère la bonne icône
  const Icon = iconMap[iconName] || DollarSign;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
          {subValue && (
            <p className="text-xs font-medium text-gray-400 mt-1">{subValue}</p>
          )}
        </div>
        <div className={clsx("p-3 rounded-xl", colors[color])}>
          <Icon size={24} />
        </div>
      </div>
    </motion.div>
  );
}