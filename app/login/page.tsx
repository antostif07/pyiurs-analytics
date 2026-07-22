import { Metadata } from "next";
import LoginPageClient from "./login-client";

// ✅ Métadonnées de page propres, lues par le navigateur et les moteurs de recherche
export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous de manière sécurisée à votre plateforme Pyiurs Analytics.",
};

export default function LoginPage() {
  return <LoginPageClient />;
}