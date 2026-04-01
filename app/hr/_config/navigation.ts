// app/hr/_config/navigation.ts
import { 
  LayoutDashboard, Users, Clock, Store, 
  CircleDollarSign, FileText, CalendarDays 
} from "lucide-react";

export const HR_NAV_ITEMS = [
  {
    label: "Principal",
    items: [
      { name: "Tableau de bord", href: "/hr", icon: LayoutDashboard },
      { name: "Employés", href: "/hr/employees", icon: Users },
      { name: "Boutiques", href: "/hr/shops", icon: Store },
    ]
  },
  {
    label: "Gestion Opérationnelle",
    items: [
      { name: "Présences & Pointage", href: "/hr/attendance", icon: Clock },
      { name: "Planning & Congés", href: "/hr/schedule", icon: CalendarDays },
    ]
  },
  {
    label: "Finance & Paie",
    items: [
      { name: "Primes & Dettes", href: "/hr/bonuses-debts", icon: CircleDollarSign },
      { name: "Fiches de Paie", href: "/hr/payroll", icon: FileText },
    ]
  }
];