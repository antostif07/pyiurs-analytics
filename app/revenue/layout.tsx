// app/revenue/layout.tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getServerAuth } from "@/lib/supabase/server";
import {
  isRevenueRole,
  CONTROLLER_ROLE,
  CONTROLLER_REVENUE_ALLOWED_PATHS,
} from "@/lib/auth/roles";
import RevenueShell from "./revenue-shell";

export const metadata: Metadata = {
  title: {
    default: "Revenue | Pyiurs",
    template: "%s | Revenue",
  },
  description:
    "Pilotage des revenus : synthèse, performance par segment, boutiques et conseillers.",
  robots: { index: false, follow: false },
};

// Session-dépendant → jamais statique.
export const dynamic = "force-dynamic";

async function resolveCurrentPath(): Promise<string> {
  const h = await headers();
  return h.get("x-pathname") ?? "/revenue";
}

export default async function RevenueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getServerAuth();

  // 1. Auth
  if (!auth.user) {
    const next = await resolveCurrentPath();
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  // 2. Profil obligatoire
  if (!auth.profile) {
    redirect("/unauthorized?reason=missing_profile");
  }

  const { role } = auth.profile;

  // 3. Cas spécial : controller (accès restreint à /revenue/invoices-redsup)
  if (role === CONTROLLER_ROLE) {
    const path = await resolveCurrentPath();

    // Redirection racine → page autorisée
    if (path === "/revenue" || path === "/revenue/") {
      redirect("/revenue/invoices-redsup");
    }

    const allowed = CONTROLLER_REVENUE_ALLOWED_PATHS.some((p) =>
      path.startsWith(p),
    );
    if (!allowed) {
      redirect("/unauthorized?reason=insufficient_permissions");
    }

    return <RevenueShell role={role}>{children}</RevenueShell>;
  }

  // 4. Rôles revenue complets
  if (!isRevenueRole(role)) {
    redirect("/unauthorized?reason=insufficient_permissions");
  }

  return <RevenueShell role={role}>{children}</RevenueShell>;
}