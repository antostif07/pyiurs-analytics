'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Megaphone, 
  Package, 
  FileBarChart, 
  ArrowLeftCircle, 
  Users,
  Tag,
  ChartColumnBig,
  ChartArea
} from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

const mainPath = '/analyse-femme'

const menuItems = [
  { name: 'Vue Globale', href: mainPath, icon: LayoutDashboard },
  { name: 'Stock', href: `${mainPath}/stocks`, icon: ChartColumnBig },
  { name: 'Clients / CRM', href: `${mainPath}/clients`, icon: Users },
  { name: 'Promos / Offres', href: `${mainPath}/promotions`, icon: Tag },
  { name: 'Tendances', href: `${mainPath}/trends`, icon: ChartArea },
  // { name: 'Stock & Arrivages', href: '/marketing/stock', icon: Package },
  // { name: 'Rapports', href: '/marketing/reports', icon: FileBarChart },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-100 h-screen flex flex-col fixed left-0 top-0 z-50">
      <div className="p-4 border-t border-gray-50">
        <Link href="/">
          <button className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200">
            <ArrowLeftCircle size={18} />
            <span>Retour Accueil</span>
          </button>
        </Link>
      </div>
      {/* 1. HEADER DU MODULE */}
      <div className="p-6 border-b border-gray-50">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">
          Analyse <span className="text-blue-600">Femme</span>
        </h2>
        <p className="text-xs text-gray-400 mt-1">Rapport Femme</p>
      </div>

      {/* 2. NAVIGATION INTERNE */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <div className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-blue-50 text-blue-700 font-medium" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}>
                <Icon size={20} className={isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"} />
                {item.name}
                {isActive && (
                  <motion.div 
                    layoutId="active-pill" 
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600"
                  />
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}