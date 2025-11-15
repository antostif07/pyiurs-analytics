// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { getServerAuth } from "@/lib/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pyiurs Analytics",
  description: "Plateforme d'analyse de données et de gestion business intelligente",
  keywords: ["analytics", "business", "gestion", "données", "rapports"],
  authors: [{ name: "Pyiurs" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Récupérer l'authentification côté serveur une seule fois
  const { user, profile } = await getServerAuth()

  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider serverUser={user} serverProfile={profile}>
          {children}
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}