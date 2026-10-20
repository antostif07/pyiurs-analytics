// app/settings/shops/[id]/page.tsx
import type { Metadata } from "next";
import ShopDetailClient from "./shop-detail-client";

interface PageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    return { title: `Boutique ${id.slice(0, 8)} | Configuration` };
}

export const dynamic = "force-dynamic";

export default async function ShopDetailPage({ params }: PageProps) {
    const { id } = await params;
    return <ShopDetailClient shopId={id} />;
}