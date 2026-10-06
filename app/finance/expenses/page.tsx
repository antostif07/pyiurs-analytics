// app/finance/expenses/page.tsx
import type { Metadata } from "next";
import ExpensesClient from "./expenses-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Notes de Frais | Finance",
    description: "Consultation, validation et suivi des dépenses Odoo.",
};

export default function ExpensesPage() {
    return <ExpensesClient />;
}