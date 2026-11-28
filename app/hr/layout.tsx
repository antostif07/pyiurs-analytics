import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerAuth } from "@/lib/supabase/server";
import { isHrRole } from "@/lib/auth/hr-roles";
import { HRClientShell } from "./hr-client-shell";

export const metadata: Metadata = {
  title: {
    default: "Ressources Humaines | Pyiurs",
    template: "%s | RH",
  },
  description: "Gestion des employés, présences, primes, dettes et paie.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function resolveCurrentPath(): Promise<string> {
  const h = await headers();
  return h.get("x-pathname") ?? "/hr";
}

export default async function HRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [auth, cookieStore] = await Promise.all([getServerAuth(), cookies()]);

  if (!auth.user) {
    const next = await resolveCurrentPath();
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  if (!auth.profile) {
    redirect("/unauthorized?reason=missing_profile");
  }

  const { role } = auth.profile;
  if (!isHrRole(role)) {
    redirect("/unauthorized?reason=insufficient_permissions");
  }

  const isCollapsed =
    cookieStore.get("hr_sidebar_collapsed")?.value === "true";

  return (
    <HRClientShell initialCollapsed={isCollapsed} userRole={role}>
      {children}
    </HRClientShell>
  );
}