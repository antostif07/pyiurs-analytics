// app/hr/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils"; // Utilitaire standard (clsx + tailwind-merge)
import { useHRUI } from "./hr-context";
import { HR_NAV_ITEMS } from "../_config/navigation";

export default function Sidebar() {
  const pathname = usePathname();
  const { isSidebarOpen, closeSidebar } = useHRUI();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Logo Section */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">RH</span>
          </div>
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            R<span className="text-rose-600">H</span>
          </span>
        </div>
      </div>

      {/* Navigation - Scrollable */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-8 custom-scrollbar">
        {HR_NAV_ITEMS.map((section) => (
          <div key={section.label} className="space-y-2">
            <h3 className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {section.label}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeSidebar}
                    className={cn(
                      "group flex items-center justify-between px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-rose-50 text-rose-700 shadow-sm shadow-rose-100/50"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <div className="flex items-center">
                      <item.icon 
                        className={cn(
                          "w-5 h-5 mr-3 transition-colors",
                          isActive ? "text-rose-600" : "text-slate-400 group-hover:text-slate-600"
                        )} 
                      />
                      {item.name}
                    </div>
                    {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Section / Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all group"
        >
          <div className="p-1.5 rounded-lg bg-white border border-slate-200 group-hover:border-rose-200">
            <LogOut className="w-4 h-4" />
          </div>
          <span>Quitter le module</span>
        </Link>
      </div>
    </aside>
  );
}