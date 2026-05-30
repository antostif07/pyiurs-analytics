import { TrendingUp, Package, Database, PieChart, Heart, PiggyBank, ShieldCheck, Users, Wallet, FileSpreadsheet, MonitorPlay, Clock, PictureInPicture, Banknote, ShoppingBag } from "lucide-react"

export interface Denomination {
  currency: 'USD' | 'CDF'
  value: number
  label: string
  quantity: number
}

export const USD_DENOMINATIONS: Denomination[] = [
  { currency: 'USD', value: 100, label: '100 USD', quantity: 0 },
  { currency: 'USD', value: 50, label: '50 USD', quantity: 0 },
  { currency: 'USD', value: 20, label: '20 USD', quantity: 0 },
  { currency: 'USD', value: 10, label: '10 USD', quantity: 0 },
  { currency: 'USD', value: 5, label: '5 USD', quantity: 0 },
  { currency: 'USD', value: 1, label: '1 USD', quantity: 0 },
]

export const CDF_DENOMINATIONS: Denomination[] = [
  { currency: 'CDF', value: 20000, label: '20,000 CDF', quantity: 0 },
  { currency: 'CDF', value: 10000, label: '10,000 CDF', quantity: 0 },
  { currency: 'CDF', value: 5000, label: '5,000 CDF', quantity: 0 },
  { currency: 'CDF', value: 1000, label: '1,000 CDF', quantity: 0 },
  { currency: 'CDF', value: 500, label: '500 CDF', quantity: 0 },
  { currency: 'CDF', value: 100, label: '100 CDF', quantity: 0 },
]

export type UserRole = "admin" | "manager" | "manager-full" | "financier" | "user";

export interface AppModule {
  id: string
  name: string
  description: string
  href: string
  icon: React.ElementType
  color: string
  category: ModuleCategory

  permissions: UserRole[]

  // 🔥 enterprise features
  isNew?: boolean
  isBeta?: boolean
  badge?: string
  order?: number

  // futur
  enabled?: boolean
}

export type ModuleCategory =
  | "finance"
  | "inventory"
  | "crm"
  | "marketing"
  | "operations"
  | "admin"
  | "hr"
  | "purchasing"


export const MODULES_CONFIG: AppModule[] =[
  {
    id: "revenue",
    name: "Revenu",
    description: "Analysez les performances de vos ventes, suivez les objectifs et optimisez votre stratégie financière.", 
    href: "/revenue", 
    icon: TrendingUp, 
    color: "bg-purple-500", 
    category: "finance", 
    permissions: ["admin", "manager"] 
  },
  { 
    id: "stock", 
    name: "Stock", 
    description: "Analysez  du stock.", 
    href: "/inventory",
    icon: TrendingUp, 
    color: "bg-gray-500", 
    category: "inventory", 
    permissions: ["admin", "manager"] 
  },
  {
    id: "finance",
    name: "Finance",
    description: "Suivez et analysez vos flux financiers, gérez les budgets et optimisez la rentabilité de votre entreprise.",
    href: "/finance",
    icon: Banknote, // Assurez-vous d'importer Banknote de lucide-react
    color: "bg-emerald-600",
    category: "finance",
    permissions: ["admin", "manager", "financier"],
    isNew: true, // Pour marquer le nouveau module
    order: 0
  },
  {
    id: "purchases",
    name: "Achats",
    description: "Suivez et gérez vos bons de commande, vos relations fournisseurs et optimisez vos dépenses d'approvisionnement.",
    href: "/purchases",
    icon: ShoppingBag, // À importer de lucide-react (ou ShoppingCart, Receipt)
    color: "bg-blue-600", // Couleur distincte des autres modules (violet, gris, émeraude)
    category: "purchasing", // Nouvelle catégorie ou à adapter selon vos filtres existants
    permissions: ["admin", "manager", "financier"], // Rôles autorisés, à adapter à vos besoins
    isNew: true,
    order: 1
  },
  {
    id: "catalog", 
    name: "Catalogue", 
    description: "Catalogue des produits.", 
    icon: Package, 
    color: "bg-yellow-500", 
    href: "/catalog", 
    category: "inventory", 
    permissions: ["admin", "manager", "user"] 
  },
  { 
    id: "medias", 
    name: "Medias", 
    description: "Image des produits.", 
    icon: PictureInPicture, 
    color: "bg-yellow-500", 
    href: "/medias", 
    category: "marketing", 
    permissions: ["admin", "manager", "user"] 
  },
  {
    id: "base-test-odoo", 
    name: "Base Test Odoo", 
    description: "Base Test Odoo", 
    icon: Database, 
    color: "bg-purple-600", 
    href: "/base-test-odoo", 
    permissions: ["admin"],
    category: "admin"
  },
  { 
    id: "kpi-manager", 
    name: "KPI Manager", 
    description: "KPI Manager", 
    icon: PieChart, 
    color: "bg-purple-600", 
    href: "/manager-kpis", 
    permissions: ["admin", "manager"],
    category: "operations"
  },
  { 
    id: "suivi-ventes-beauty", 
    name: "Suivi des Ventes Beauty", 
    description: "Suivi des Ventes Beauty", 
    icon: Heart, 
    color: "bg-teal-600", 
    href: "/control-revenue-beauty", 
    permissions: ["admin", "manager", "user"],
    category: "finance"
  },
  { 
    id: "suivi-stock-beauty", 
    name: "Suivi du Stock Beauty", 
    description: "Suivi du Stock Beauty", 
    icon: Package, 
    color: "bg-orange-500", 
    href: "/control-stock-beauty", 
    permissions:["admin", "manager", "user"],
    category: "inventory"
  },
  { 
    id: "suivi-stock-femme", 
    name: "Suivi du Stock Femme", 
    description: "Suivi du Stock Femme", 
    icon: Package, 
    color: "bg-yellow-500", 
    href: "/control-stock-femme", 
    permissions: ["admin", "manager", "user"],
    category: "inventory"
  },
  { 
    id: "suivi-epargne-femme", 
    name: "Suivi Epargne Femme", 
    description: "Suivi de l'Épargne Femme", 
    icon: PiggyBank, 
    color: "bg-blue-500", 
    href: "/suivi-epargne-femme", 
    permissions: ["admin", "manager", "user"],
    category: "finance"
  },
  {
    id: "suivi-epargne-beauty", 
    name: "Suivi Epargne Beauty", 
    description: "KPI Manager", 
    icon: PiggyBank, 
    color: "bg-purple-600", 
    href: "/suivi-epargne-beauty", 
    permissions: ["admin", "manager"],
    category: "finance"
  },
  {
    id: "control-quality", 
    name: "Control Qualité", 
    description: "Contrôle des Images Produits", 
    icon: ShieldCheck, 
    color: "bg-emerald-700", 
    href: "/quality-control", 
    permissions:["admin", "manager", "user"],
    category: "operations"
  },
  { 
    id: "client-management", 
    name: "Gestion des Clients", 
    description: "Gestion des Clients", 
    icon: Users, 
    color: "bg-indigo-600", 
    href: "/crm", 
    permissions:["admin", "manager", "user"],
    category: "crm" 
  },
  { 
    id: "client-pool", 
    name: "Parc Client", 
    description: "Parc Client", 
    icon: Users, 
    color: "bg-green-600", 
    href: "/parc-client", 
    permissions: ["admin", "manager"],
    category: "crm"
  },
  { 
    id: "funds-management", 
    name: "Gestion de fonds", 
    description: "Gestion des Fonds", 
    icon: Wallet, 
    color: "bg-green-700", 
    href: "/funds", 
    permissions: ["admin", "manager-full"],
    category: "finance"
  },
  { 
    id: "sales-tracking-agent", 
    name: "Suivi Vente agent", 
    description: "Suivi des ventes par agent", 
    icon: TrendingUp, 
    color: "bg-emerald-400", 
    href: "/suivi-vente-agent", 
    permissions: ["admin"],
    category: "operations"
  },
  { 
    id: "drive-management", 
    name: "Gestion Drive", 
    description: "Créez et gérez vos documents dynamiques type Excel", 
    href: "/gestion-drive", 
    icon: FileSpreadsheet, 
    color: "bg-blue-500", 
    permissions:["admin", "user", "manager", "financier"],
    category: "admin"
  }, 
  {
    id: "cash-closures",
    name: "Clôtures de Caisse",
    description: "Gérez les clôtures quotidiennes de caisse",
    href: "/cloture-vente",
    icon: MonitorPlay, 
    color:"bg-green-500",
    permissions: ["admin", "manager", "financier"],
    category: "operations"
  },
  {
    id: "reports",
    name: "Rapports",
    description: "Analyse complète : ventes, coûts, bénéfices et performances",
    href: "/reports",
    icon: PieChart,
    color: "bg-indigo-600",
    category: "finance",
    permissions: ["admin", "manager", "financier"],
    isNew: true,
    order: 1
  },
  { 
    id: "beauty-management",
    name: "Gestion Beauty",
    description: "Analyse et Gestion Beauty",
    icon: Heart, color: "bg-teal-600", href: "/gestion-beauty", permissions: ["admin", "manager"],
    category: "operations",
  },
  { 
    id: "femme-management", 
    name: "Gestion Femme", 
    description: "Analyse et Gestion du Segment Femme", 
    icon: Users, 
    color: "bg-orange-600", 
    href: "/gestion-femme", 
    permissions: ["admin", "manager"],
    category: "operations"
  },
  { 
    id: "marketing", 
    name: "Marketing", 
    description: "Suivi et Rapports Marketing", 
    href: "/marketing", 
    icon: TrendingUp, 
    color: "bg-purple-500", 
    permissions: ["admin", "manager"],
    category: "marketing"
  },
  { 
    id: "users", 
    name: "Utilisateurs", 
    description: "Gérez les utilisateurs et permissions", 
    href: "/users", 
    icon: Users, 
    color: "bg-orange-500", 
    permissions: ["admin"],
    category: "admin"
  },
  { 
    id: "hr", 
    name: "Ressources Humaines", 
    description: "Pointage, Absences, Planning et Paie", 
    href: "/hr", 
    icon: Clock, 
    color: "bg-rose-600", 
    permissions: ["admin", "manager", "user", "financier"],
    category: "hr"
  },
];

export function groupModules(modules: AppModule[]) {
  return modules.reduce((acc, module) => {
    if (!acc[module.category]) acc[module.category] = []
    acc[module.category].push(module)
    return acc
  }, {} as Record<string, AppModule[]>)
}