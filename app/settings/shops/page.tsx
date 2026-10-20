// app/settings/shops/page.tsx
import type { Metadata } from "next";
import ShopsClient from "./shops-client";

export const metadata: Metadata = {
    title: "Boutiques | Configuration",
    description: "Gestion des boutiques et de leurs emplacements Odoo.",
};

export const dynamic = "force-dynamic";

export default function ShopsPage() {
    return <ShopsClient />;
}