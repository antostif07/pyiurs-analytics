// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { getServerAuth } from "@/lib/supabase/server";
import NextTopLoader from 'nextjs-toploader';
import { QueryProvider } from "./providers/query-provider";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

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
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextTopLoader 
          color="#fd6c9e" 
          showSpinner={false} 
          shadow={false}
          height={3}
        />
        <AuthProvider serverUser={user} serverProfile={profile}>
          <QueryProvider>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryProvider>
        </AuthProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}