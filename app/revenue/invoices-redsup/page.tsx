// app/revenue/invoices-redsup/page.tsx
import type { Metadata } from "next";
import InvoicesRedsupClient from "./invoices-redsup-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Factures RedSup | Revenue",
    description:
        "Factures POS contenant des produits RedSup avec validation de réduction.",
};

export default function InvoicesRedsupPage() {
    return <InvoicesRedsupClient />;
}