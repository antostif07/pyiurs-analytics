'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart3, 
  Wallet, 
  Store, 
  Target, 
  FilePieChart, 
  ArrowLeftCircle,
  TrendingUp,
  CreditCard,
  X
} from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

const mainPath = '/revenue';

const menuGroups = [
  {
    label: 'Analyses',
    items: [
      { name: 'Vue d\'ensemble', href: mainPath, icon: BarChart3 },
      { name: 'Performance Beauty', href: `${mainPath}/performance-beauty`, icon: TrendingUp },
    //   { name: 'Performance Ventes', href: `${mainPath}/sales`, icon: TrendingUp },
    ]
  },
  {
    label: 'Collecte & Caisse',
    items: [
    //   { name: 'Par Boutique', href: `${mainPath}/shops`, icon: Store },
    //   { name: 'Modes de Paiement', href: `${mainPath}/payments`, icon: CreditCard },
    ]
  },
  {
    label: 'Objectifs',
    items: [
    //   { name: 'Objectifs Mensuels', href: `${mainPath}/targets`, icon: Target },
    //   { name: 'Rapports Financiers', href: `${mainPath}/reports`, icon: FilePieChart },
    ]
  }
];

export default function RevenueSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <aside className={clsx(
      "fixed left-0 top-0 h-screen bg-white border-r border-gray-100 z-50 transition-transform duration-300 w-64 flex flex-col",
      isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
    )}>
      {/* Header Module */}
      <div className="p-6 border-b border-gray-50 flex items-center justify-between">
        <div>
            <div className='mb-8'>
                <Link href="/">
                    <div className="flex items-center gap-2">
                        <ArrowLeftCircle size={20} className="text-emerald-500" />
                        <span className="text-sm font-bold text-gray-900">Pyiurs Analytics</span>
                    </div>
                </Link>
            </div>
          <h2 className="text-xl font-black text-gray-900 tracking-tighter italic uppercase">
            Rapport Revenue
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Finance & Insights</p>
        </div>
        <button onClick={onClose} className="lg:hidden p-2 text-gray-400">
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-8 overflow-y-auto">
        {menuGroups.map((group) => (
          <div key={group.label} className="space-y-2">
            <p className="px-4 text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link key={item.href} href={item.href} onClick={() => { if(window.innerWidth < 1024) onClose() }}>
                    <div className={clsx(
                      "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group relative",
                      isActive 
                        ? "bg-emerald-50 text-emerald-700 font-bold" 
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    )}>
                      <Icon size={18} className={isActive ? "text-emerald-600" : "text-gray-400 group-hover:text-gray-600"} />
                      <span className="text-sm">{item.name}</span>
                      {isActive && (
                        <motion.div 
                          layoutId="active-indicator" 
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-600"
                        />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Sidebar */}
      <div className="p-4 border-t border-gray-50">
        <Link href="/">
          <button className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gray-900 text-white rounded-2xl hover:bg-gray-800 transition-all font-bold text-xs uppercase tracking-widest shadow-lg shadow-gray-200">
            <ArrowLeftCircle size={16} />
            <span>Menu Principal</span>
          </button>
        </Link>
      </div>
    </aside>
  );
}