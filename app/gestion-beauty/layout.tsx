"use client";

import { useState } from "react";
import AnalyseBeautySidebar from "./components/AnalyseBeautySidebar";
import { Menu, X } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F8F9FB]">
      {/* SIDEBAR : On lui passe l'état et la fonction pour fermer sur mobile */}
      <AnalyseBeautySidebar isOpen={isSidebarOpen} onClose={() => setIsOpen(false)} />

      {/* OVERLAY : Fond sombre quand le menu est ouvert sur mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ZONE PRINCIPALE : Pas de marge forcée, lg:ml-64 uniquement sur desktop */}
      <main className="flex-1 flex flex-col min-w-0 lg:ml-64 transition-all duration-300">
        
        {/* TOPBAR RESPONSIVE */}
        <header className="h-16 border-b border-gray-200 bg-white sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* BOUTON BURGER : Visible uniquement sur mobile */}
            <button 
              onClick={() => setIsOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg lg:hidden text-gray-600"
            >
              <Menu size={20} />
            </button>
            
            <h1 className="text-xs lg:text-sm font-medium text-gray-500 underline decoration-pink-300 decoration-2 underline-offset-4 truncate">
              Dashboard Beauty
            </h1>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Sélecteur de date simplifié sur mobile */}
            <div className="flex bg-gray-100 p-1 rounded-lg text-[10px] lg:text-[12px] font-medium">
              <button className="px-2 lg:px-3 py-1 bg-white shadow-sm rounded-md">Live</button>
              <button className="hidden sm:block px-3 py-1 text-gray-500">Hebdo</button>
              <button className="hidden sm:block px-3 py-1 text-gray-500">Mensuel</button>
            </div>
          </div>
        </header>

        {/* CONTENU : Padding réduit sur mobile */}
        <div className="p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}