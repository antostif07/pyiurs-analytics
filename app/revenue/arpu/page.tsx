// app/revenue/arpu/page.tsx
import type { Metadata } from "next";
import ArpuDashboardClient from "./arpu-dashboard-client";

export const metadata: Metadata = {
  title: "ARPU | Revenue",
  description:
    "Analyse de la rentabilité par utilisateur et performance des segments.",
};

export const dynamic = "force-dynamic";

export default function ArpuPage() {
  return <ArpuDashboardClient />;
}