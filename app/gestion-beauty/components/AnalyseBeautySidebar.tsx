// components/AnalyseBeautySidebar.tsx
'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, CalendarDays, Megaphone, Package, 
  FileBarChart, ArrowLeftCircle, Users, Tag, ChartColumnBig,
  ChevronRight,
  X
} from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

const mainPath = '/gestion-beauty';

const menuGroups = [
  {
    label: 'Analyse',
    items: [
      { name: 'Vue Globale', href: mainPath, icon: LayoutDashboard },
      { name: 'Performance', href: `${mainPath}/by-product`, icon: ChartColumnBig },
    ]
  },
  {
    label: 'Inventaire',
    items: [
      { name: 'Stock Beauty', href: `${mainPath}/stock`, icon: Package },
      { name: 'Péremptions', href: `${mainPath}/dates`, icon: CalendarDays, alert: true },
    ]
  },
  {
    label: 'Marketing & CRM',
    items: [
      { name: 'Segments Clients', href: `${mainPath}/clients`, icon: Users },
      { name: 'Promotions', href: `${mainPath}/promos`, icon: Tag },
    ]
  }
];

export default function AnalyseBeautySidenbar({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void 
}) {
  const pathname = usePathname();

  return (
    <aside className={clsx(
      "fixed left-0 top-0 h-screen bg-white border-r border-gray-200 z-50 transition-transform duration-300 w-64 flex flex-col",
      isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
    )}>
      <div className="lg:hidden absolute right-4 top-4">
        <button onClick={onClose} className="p-2 text-gray-400">
          <X size={20} />
        </button>
      </div>
      {/* LOGO / RETOUR */}
      <div className="p-4">
        <Link href="/">
          <button className="flex items-center gap-3 w-full p-2 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium">
            <ArrowLeftCircle size={18} />
            <span>Retour</span>
          </button>
        </Link>
      </div>

      <div className="px-6 py-4">
        <div className="flex items-center gap-2 px-1">
          <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center text-white font-bold">B</div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Beauty Segment</h2>
          </div>
        </div>
      </div>

      {/* NAVIGATION INTERNE PAR GROUPES */}
      <nav className="flex-1 px-4 py-2 overflow-y-auto space-y-6">
        {menuGroups.map((group) => (
          <div key={group.label} onClick={() => { if(window.innerWidth < 1024) onClose() }}>
            <p className="px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link key={item.href} href={item.href}>
                    <div className={clsx(
                      "flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 group relative",
                      isActive 
                        ? "bg-pink-50 text-pink-700 font-semibold" 
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}>
                      <div className="flex items-center gap-3">
                        <Icon size={18} className={isActive ? "text-pink-600" : "text-gray-400 group-hover:text-gray-600"} />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      
                      {item.alert && !isActive && (
                        <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                      )}
                      
                      {isActive && (
                        <motion.div layoutId="active-bg" className="absolute inset-0 bg-pink-50 rounded-lg -z-10" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* USER FOOTER (Optionnel) */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-xs font-bold text-blue-700">
            AD
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold text-gray-900 truncate">Admin Beauty</p>
            <p className="text-[10px] text-gray-500 truncate">Connecté à Odoo v17</p>
          </div>
        </div>
      </div>
    </aside>
  );
}