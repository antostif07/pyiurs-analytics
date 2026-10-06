// app/finance/layout.tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getServerAuth } from "@/lib/supabase/server";
import { isFinanceRole } from "@/lib/auth/roles";
import FinanceShell from "./finance-shell";

export const metadata: Metadata = {
  title: {
    default: "Finance | Pyiurs",
    template: "%s | Finance",
  },
  description:
    "Pilotage financier : trésorerie, revenus, dépenses, épargne, comptabilité et rapports.",
  robots: { index: false, follow: false },
};

// Session-dépendant → jamais statique.
export const dynamic = "force-dynamic";

/**
 * Récupère le pathname courant (posé par proxy.ts via `x-pathname`).
 * Fallback sur /finance si le middleware n'est pas encore configuré.
 */
async function resolveCurrentPath(): Promise<string> {
  const h = await headers();
  return h.get("x-pathname") ?? "/finance";
}

export default async function FinanceLayout({
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

  // 3. Rôle autorisé
  const { role } = auth.profile;
  if (!isFinanceRole(role)) {
    redirect("/unauthorized?reason=insufficient_permissions");
  }

  // 4. Rendu — seul le rôle est nécessaire au Shell
  return <FinanceShell role={role}>{children}</FinanceShell>;
}