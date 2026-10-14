// app/inventory/layout.tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getServerAuth } from "@/lib/supabase/server";
import { isInventoryRole } from "@/lib/auth/roles";
import InventoryShell from "./inventory-shell";

export const metadata: Metadata = {
  title: {
    default: "Stock | Pyiurs",
    template: "%s | Stock",
  },
  description:
    "Gestion des stocks, inventaires, transferts et valorisation par boutique.",
  robots: { index: false, follow: false },
};

// Session-dépendant → jamais statique.
export const dynamic = "force-dynamic";

async function resolveCurrentPath(): Promise<string> {
  const h = await headers();
  return h.get("x-pathname") ?? "/inventory";
}

export default async function InventoryLayout({
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
  if (!isInventoryRole(role)) {
    redirect("/unauthorized?reason=insufficient_permissions");
  }

  return <InventoryShell role={role}>{children}</InventoryShell>;
}