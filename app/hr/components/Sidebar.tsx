"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  CalendarDays, 
  FileText,
  LogOut 
} from "lucide-react";

const menuItems = [
  { name: "Tableau de bord", href: "/hr", icon: LayoutDashboard },
  { name: "Pointage", href: "/hr/attendance", icon: Clock },
  { name: "Employés", href: "/hr/employees", icon: Users },
  { name: "Planning", href: "/hr/schedule", icon: CalendarDays },
  { name: "Rapports", href: "/hr/reports", icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 fixed h-full flex flex-col z-10">
      <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xl font-bold text-rose-600">RH Module</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
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