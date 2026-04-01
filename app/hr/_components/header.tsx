// app/hr/_components/header.tsx
"use client";

import { Menu, Bell, UserCircle } from "lucide-react";
import { useHRUI } from "./hr-context";

export function Header() {
  const { toggleSidebar } = useHRUI();

  return (
    <header className="h-16 border-b border-slate-200 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          aria-label="Ouvrir le menu"
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg lg:hidden transition-colors"
        >
          <Menu size={20} className="text-slate-600 dark:text-slate-400" />
        </button>
        
        <nav aria-label="Breadcrumb">
           <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-widest">
            Module <span className="text-blue-600">RH</span>
          </h1>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {/* Bouton notifications entreprise */}
        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative">
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
        </button>
        <div className="h-6 w-[1px] bg-slate-200 mx-2" />
        <button className="flex items-center gap-2 p-1 hover:bg-slate-100 rounded-lg transition-all">
          <UserCircle size={24} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-700 hidden sm:inline">Admin RH</span>
        </button>
      </div>
    </header>
  );
}