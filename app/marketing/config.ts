import { NavGroup } from "@/components/new-ui/layout/app-sidebar";
import { 
  LayoutDashboard, 
  Megaphone, 
  MessageSquare, 
  BarChart3, 
  Users2, 
  Zap,
  Settings,
  CalendarDays
} from "lucide-react";

export const MARKETING_NAV_GROUPS: NavGroup[] = [
  {
    id: "analytics-group",
    title: "Analyse",
    items: [
      { label: "Vue d'ensemble", path: "/marketing", icon: LayoutDashboard, id: "overview" },
      { label: "Analyses avancées", path: "/marketing/analytics", icon: BarChart3, id: "advanced-analytics" },
    ],
  },
  {
    id: "ops-group",
    title: "Opérations",
    items: [
      { label: "Calendrier Planing", path: "/marketing/calendar", icon: CalendarDays, id: "calendar" },
      { label: "Campagnes Ads", path: "/marketing/campaigns", icon: Megaphone, id: "campaigns" },
      { label: "WeShindi (WhatsApp)", path: "/marketing/whatsapp", icon: MessageSquare, id: "whatsapp" },
    ],
  },
  {
    id: "assets-group",
    title: "Actifs",
    items: [
      { label: "Audiences", path: "/marketing/audiences", icon: Users2, id: "audiences" },
      { label: "Automatisations", path: "/marketing/automation", icon: Zap, id: "automation" },
    ],
  },
  {
    id: "system-group",
    title: "Système",
    items: [
      { label: "Configuration", path: "/marketing/settings", icon: Settings, id: "settings" },
    ],
  },
];