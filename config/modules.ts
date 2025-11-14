// app/config/modules.ts
import { BarChart2, TrendingUp, Package, Users, DollarSign, Euro, User2 } from 'lucide-react'

export interface ModuleConfig {
  name: string
  icon: React.ComponentType<any>
  color: string
  href: string
  roles?: string[]
}

export const modules: ModuleConfig[] = [
  { name: "KPI Manager", icon: BarChart2, color: "from-blue-500 to-purple-600", href: "/manager-kpis", },
  { name: "Suivi des Ventes Beauty", icon: TrendingUp, color: "from-emerald-500 to-teal-600", href: "/control-revenue-beauty", },
  { name: "Suivi du Stock Beauty", icon: Package, color: "from-orange-500 to-yellow-500", href: "/control-stock-beauty", },
  { name: "Suivi du Stock Femme", icon: Package, color: "from-yellow-500 to-teal-500", href: "/control-stock-femme",},
  { name: "Suivi du Epargne Femme", icon: Euro, color: "from-emerald-500 to-blue-500", href: "/suivi-epargne-femme",},
  { name: "Control Image Produit", icon: Package, color: "from-emerald-500 to-emerald-700", href: "/control-product-image",},
  { name: "Gestion des Clients", icon: Users, color: "from-indigo-500 to-blue-700", href: "/client-base",},
  { name: "Gestion des Clients Beauty", icon: Users, color: "from-blue-500 to-indigo-700", href: "/client-base-beauty", roles: ['admin', 'manager'] },
  { name: "Parc Client", icon: Users, color: "from-emerald-500 to-indigo-700", href: "/parc-client", roles: ['admin', 'manager'] },
  { name: "Cloture Vente", icon: DollarSign, color: "from-orange-500 to-yellow-700", href: "/cloture-vente", roles: ['admin', 'manager'] },
  { name: "Gestion de fonds", icon: DollarSign, color: "from-emerald-500 to-yellow-700", href: "/funds", roles: ['admin', 'manager-full'] },
  { name: "Revenu Global", icon: DollarSign, color: "from-indigo-500 to-yellow-700", href: "/revenue", roles: ['admin',] },
  { name: "Suivi Vente agent", icon: DollarSign, color: "from-emerald-300 to-emerald-400", href: "/suivi-vente-agent", roles: ['admin',] },
  { name: "Gestion Drive", icon: DollarSign, color: "from-indigo-300 to-indigo-400", href: "/gestion-drive", roles: ['admin',] },
  { name: "Utilisateurs", icon: User2, color: "from-yellow-300 to-yellow-400", href: "/users", roles: ['admin',] },
];