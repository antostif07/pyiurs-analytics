// app/hr/layout.tsx
"use client";

import { useState } from "react";
import Sidebar from "./components/Sidebar";
import { Menu } from "lucide-react";

export default function HRLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsOpen(false)} />

      {/* Overlay mobile */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      )}

      <main className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Topbar RH */}
        <header className="h-16 border-b border-gray-200 bg-white sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg lg:hidden">
              <Menu size={20} className="text-gray-600" />
            </button>
            <h1 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
              Gestion RH <span className="text-rose-600">| Janvier 2025</span>
            </h1>
          </div>
        </header>

        <div className="p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}