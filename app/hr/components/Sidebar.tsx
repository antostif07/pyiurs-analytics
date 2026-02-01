"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  CalendarDays, 
  FileText,
  LogOut, 
  Store
} from "lucide-react";
import clsx from "clsx";

const menuItems = [
  { name: "Tableau de bord", href: "/hr", icon: LayoutDashboard },
  { name: "Présences & Pointage", href: "/hr/attendance", icon: Clock },
  { name: "Employés", href: "/hr/employees", icon: Users },
  { name: "Boutiques", href: "/hr/shops", icon: Store },
  { name: "Fiches de Paie", href: "/hr/payroll", icon: FileText }, // Crucial fin de mois
  { name: "Planning & Congés", href: "/hr/schedule", icon: CalendarDays },
];

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <aside className={clsx(
      "fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-50 transition-transform duration-300",
      isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
    )}>
      <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xl font-bold text-rose-600">RH Module</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              onClick={() => onClose()}
              href={item.href}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              <item.icon className={`w-5 h-5 mr-3 ${isActive ? "text-rose-600" : "text-gray-400"}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <Link
          href="/"
          className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3 text-gray-400" />
          Retour Accueil
        </Link>
      </div>
    </aside>
  );
}