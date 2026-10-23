// app/ceo-report/hr/page.tsx
import type { Metadata } from "next";
import HrClient from "./hr-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Ressources Humaines & Baux Commerciaux | Rapport DG",
    description:
        "Suivi de la masse salariale, effectifs, compteurs de congés et échéancier des loyers.",
};

export default function HrPage() {
    return <HrClient />;
}