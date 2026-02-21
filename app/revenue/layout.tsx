// app/finance/revenue/layout.tsx
'use client';

import { useState } from "react";
import { Menu, Bell, Search, User } from "lucide-react";
import RevenueSidebar from "@/components/revenue/revenue-sidebar";

export default function RevenueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F8F9FB]">
      {/* SIDEBAR RESPONSIVE */}
      <RevenueSidebar isOpen={isSidebarOpen} onClose={() => setIsOpen(false)} />

      {/* OVERLAY MOBILE */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ZONE DE CONTENU */}
      <main className="flex-1 lg:ml-64 flex flex-col min-w-0 transition-all duration-300">
        
        {/* TOPBAR : Look Enterprise & Dense */}
        <header className="h-16 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-xl lg:hidden text-gray-600"
            >
              <Menu size={20} />
            </button>
            
            <div className="hidden md:flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 group focus-within:border-emerald-200 transition-all">
               <Search size={14} className="text-gray-400 group-focus-within:text-emerald-500" />
               <input 
                 type="text" 
                 placeholder="Chercher une transaction, boutique..." 
                 className="bg-transparent border-none outline-none text-xs font-medium w-64"
               />
            </div>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Notification & Profil Rapide */}
            <button className="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                <Bell size={20} />
            </button>
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs border border-emerald-200">
                AD
            </div>
          </div>
        </header>

        {/* CONTENU DE LA PAGE */}
        <div className="p-4 lg:p-8 flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}