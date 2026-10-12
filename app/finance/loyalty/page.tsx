// app/finance/loyalty/page.tsx
import type { Metadata } from "next";
import LoyaltyClient from "./loyalty-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Points de Fidélité | Finance",
    description:
        "Envoi des points de fidélité aux clients par WhatsApp après chaque visite.",
};

export default function LoyaltyPage() {
    return <LoyaltyClient />;
}