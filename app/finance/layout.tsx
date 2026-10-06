// app/finance/layout.tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getServerAuth } from "@/lib/supabase/server";
import {
  isFinanceRole,
  CONTROLLER_ROLE,
  CONTROLLER_ALLOWED_PATHS,
} from "@/lib/auth/roles";
import FinanceShell from "./finance-shell";

export const metadata: Metadata = {
  title: { default: "Finance | Pyiurs", template: "%s | Finance" },
  description: "Pilotage financier : trésorerie, revenus, dépenses, épargne.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

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

  if (!auth.user) {
    const next = await resolveCurrentPath();
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  if (!auth.profile) {
    redirect("/unauthorized?reason=missing_profile");
  }

  const { role } = auth.profile;

  // ─── Cas spécial : controller ──────────────────────────────────
  if (role === CONTROLLER_ROLE) {
    const path = await resolveCurrentPath();

    // ⬇️ Cas racine : /finance ou /finance/ → redirect vers /finance/expenses
    if (path === "/finance" || path === "/finance/") {
      redirect("/finance/expenses");
    }

    const allowed = CONTROLLER_ALLOWED_PATHS.some((p) =>
      path.startsWith(p),
    );
    if (!allowed) {
      redirect("/unauthorized?reason=insufficient_permissions");
    }
    return <FinanceShell role={role}>{children}</FinanceShell>;
  }

  // ─── Rôles finance complets ────────────────────────────────────
  if (!isFinanceRole(role)) {
    redirect("/unauthorized?reason=insufficient_permissions");
  }

  return <FinanceShell role={role}>{children}</FinanceShell>;
}