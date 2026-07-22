import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { getServerAuth } from "@/lib/supabase/server";
import NextTopLoader from "nextjs-toploader";
import { QueryProvider } from "./providers/query-provider";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "./providers/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Améliore le rendu du texte pendant le chargement de la police
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Pyiurs Analytics",
    template: "%s | Pyiurs Analytics", // Permet d'avoir des titres dynamiques propres (ex: "Stocks | Pyiurs Analytics")
  },
  description: "Plateforme d'analyse de données et de gestion retail intelligente connectée à Odoo.",
  keywords: ["analytics", "business", "retail", "odoo", "dashboard", "luxe", "fashion", "cosmetics"],
  authors: [{ name: "Pyiurs" }],
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" }, // S'aligne sur l'esthétique premium sombre
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Récupération sécurisée des données de session côté serveur
  let user = null;
  let profile = null;

  try {
    const authData = await getServerAuth();
    user = authData?.user ?? null;
    profile = authData?.profile ?? null;
  } catch (error) {
    if (error && typeof error === 'object' && (error as any).digest === 'DYNAMIC_SERVER_USAGE') {
      throw error;
    }
    console.error("Failed to fetch server auth session:", error);
  }

  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground min-h-screen`}
      >
        <NextTopLoader
          color="#fd6c9e" // Rose premium signature de la marque
          showSpinner={false}
          shadow={false}
          height={3}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider serverUser={user} serverProfile={profile}>
            <QueryProvider>
              <div className="relative flex min-h-screen flex-col">
                {children}
              </div>
              <ReactQueryDevtools initialIsOpen={false} />
            </QueryProvider>
          </AuthProvider>
        </ThemeProvider>
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}