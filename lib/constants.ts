import { TrendingUp, Package, Database, PieChart, Heart, PiggyBank, ShieldCheck, Users, Wallet, FileSpreadsheet, MonitorPlay, Clock } from "lucide-react"

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
  name: string;
  description: string;
  href: string;
  icon: React.ElementType;
  color: string;
  permissions: UserRole[];
}

export const MODULES_CONFIG: AppModule[] =[
  { name: "Revenu", description: "Analysez les performances de vos ventes, suivez les objectifs et optimisez votre stratégie financière.", href: "/revenue", icon: TrendingUp, color: "bg-purple-500", permissions: ["admin", "manager"] },
  { name: "Stock", description: "Suivi du Stock en temps réel, alertes de réapprovisionnement.", icon: Package, color: "bg-yellow-500", href: "/stock", permissions: ["admin", "manager", "user"] },
  { name: "Base Test Odoo", description: "Base Test Odoo", icon: Database, color: "bg-purple-600", href: "/base-test-odoo", permissions: ["admin"] },
  { name: "KPI Manager", description: "KPI Manager", icon: PieChart, color: "bg-purple-600", href: "/manager-kpis", permissions: ["admin", "manager"] },
  { name: "Suivi des Ventes Beauty", description: "Suivi des Ventes Beauty", icon: Heart, color: "bg-teal-600", href: "/control-revenue-beauty", permissions: ["admin", "manager", "user"] },
  { name: "Suivi du Stock Beauty", description: "Suivi du Stock Beauty", icon: Package, color: "bg-orange-500", href: "/control-stock-beauty", permissions:["admin", "manager", "user"] },
  { name: "Suivi du Stock Femme", description: "Suivi du Stock Femme", icon: Package, color: "bg-yellow-500", href: "/control-stock-femme", permissions: ["admin", "manager", "user"] },
  { name: "Suivi Epargne Femme", description: "Suivi de l'Épargne Femme", icon: PiggyBank, color: "bg-blue-500", href: "/suivi-epargne-femme", permissions: ["admin", "manager", "user"] },
  { name: "Suivi Epargne Beauty", description: "KPI Manager", icon: PiggyBank, color: "bg-purple-600", href: "/suivi-epargne-beauty", permissions: ["admin", "manager"] },
  { name: "Control Qualité", description: "Contrôle des Images Produits", icon: ShieldCheck, color: "bg-emerald-700", href: "/quality-control", permissions:["admin", "manager", "user"] },
  { name: "Gestion des Clients", description: "Gestion des Clients", icon: Users, color: "bg-indigo-600", href: "/client-base", permissions:["admin", "manager", "user"] },
  { name: "Parc Client", description: "Parc Client", icon: Users, color: "bg-green-600", href: "/parc-client", permissions: ["admin", "manager"] },
  { name: "Gestion de fonds", description: "Gestion des Fonds", icon: Wallet, color: "bg-green-700", href: "/funds", permissions: ["admin", "manager-full"] },
  { name: "Suivi Vente agent", description: "Suivi des ventes par agent", icon: TrendingUp, color: "bg-emerald-400", href: "/suivi-vente-agent", permissions: ["admin"] },
  { name: "Gestion Drive", description: "Créez et gérez vos documents dynamiques type Excel", href: "/gestion-drive", icon: FileSpreadsheet, color: "bg-blue-500", permissions:["admin", "user", "manager", "financier"] },
  { name: "Clôtures de Caisse", description: "Gérez les clôtures quotidiennes de caisse", href: "/cloture-vente", icon: MonitorPlay, color: "bg-green-500", permissions: ["admin", "manager", "financier"] },
  { name: "Gestion Beauty", description: "Analyse et Gestion Beauty", icon: Heart, color: "bg-teal-600", href: "/gestion-beauty", permissions:["admin", "manager"] },
  { name: "Femme", description: "Analyse et Gestion du Segment Femme", icon: Users, color: "bg-orange-600", href: "/women", permissions:["admin", "manager"] },
  { name: "Marketing", description: "Suivi et Rapports Marketing", href: "/marketing", icon: TrendingUp, color: "bg-purple-500", permissions:["admin", "manager"] },
  { name: "Utilisateurs", description: "Gérez les utilisateurs et permissions", href: "/users", icon: Users, color: "bg-orange-500", permissions: ["admin"] },
  { name: "Ressources Humaines", description: "Pointage, Absences, Planning et Paie", href: "/hr", icon: Clock, color: "bg-rose-600", permissions: ["admin", "manager", "user", "financier"] },
];