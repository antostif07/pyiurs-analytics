"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { Moon, Sun, User, TrendingUp, Package, BarChart2, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const [search, setSearch] = useState("");

  const modules = [
    { name: "KPI Manager", icon: BarChart2, color: "from-blue-500 to-purple-600", href: "/manager-kpis" },
    { name: "Suivi des Ventes", icon: TrendingUp, color: "from-emerald-500 to-teal-600", href: "/control-revenue-beauty" },
    { name: "Suivi du Stock Beauty", icon: Package, color: "from-orange-500 to-yellow-500", href: "/control-stock-beauty" },
    { name: "Suivi du Stock Femme", icon: Package, color: "from-yellow-500 to-teal-500", href: "/control-stock-femme" },
    // { name: "Points de Vente", icon: Store, color: "from-pink-500 to-rose-600", href: "/shops" },
    { name: "Gestion des Clients", icon: Users, color: "from-indigo-500 to-blue-700", href: "/client-base" },
    { name: "Gestion des Clients Beauty", icon: Users, color: "from-blue-500 to-indigo-700", href: "/client-base-beauty" },
    { name: "Parc Client", icon: Users, color: "from-emerald-500 to-indigo-700", href: "/parc-client" },
    // { name: "Rapports & Export", icon: FileText, color: "from-sky-500 to-cyan-600", href: "/reports" },
  ];

  const filteredModules = modules.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`${darkMode ? "dark" : ""} min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 dark:from-slate-900 dark:to-slate-950 transition-all`}>
      
      {/* ✅ Header */}
      <header className="flex justify-between items-center px-6 py-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg shadow-sm sticky top-0 z-50">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Pyiurs Analytics
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
          >
            {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
          </button>
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition">
            <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </header>

      {/* ✅ Main content */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">Tableau de bord</h2>

        {/* Barre de recherche */}
        <input
          type="text"
          placeholder="🔍 Rechercher un module..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-10 w-full max-w-md block px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200"
        />

        {/* Section */}
        {/* <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Modules disponibles</h3> */}

        {/* ✅ Cartes animées */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModules.map((mod, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
            >
              <Link href={mod.href}>
                <Card className="group relative p-6 h-44 bg-white dark:bg-slate-800 rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer">
                  <div className={`absolute inset-0 bg-gradient-to-r ${mod.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-all duration-300`} />
                  <CardContent className="flex flex-col justify-center items-center h-full space-y-4">
                    <div className={`p-4 rounded-full bg-gradient-to-r ${mod.color} text-white shadow-lg group-hover:scale-110 transition-transform`}>
                      <mod.icon className="w-6 h-6" />
                    </div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-center">
                      {mod.name}
                    </h4>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Si aucun résultat */}
        {filteredModules.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 mt-10">Aucun module trouvé.</p>
        )}
      </main>

      {/* ✅ Footer */}
      <footer className="text-center py-6 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-slate-800">
        <p>Conçu avec ❤️ par <span className="text-blue-500 font-medium">Ushindi</span></p>
        <p className="mt-1">© {new Date().getFullYear()} Tous droits réservés</p>
      </footer>
    </div>
  );
}
