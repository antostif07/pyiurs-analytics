import { z } from "zod";

/**
 * Schéma Zod strict pour la validation des identifiants de connexion.
 * Les messages sont localisés en français et adaptés à l'usage métier.
 */
export const loginSchema = z.object({
    email: z
        .email("Le format de l'adresse email est invalide.")
        .min(1, "L'adresse email est requise.")
        .trim(),
    password: z
        .string()
        .min(1, "Le mot de passe est requis.")
        .min(6, "Le mot de passe doit contenir au moins 6 caractères."),
});

// Génération du type TypeScript automatique à partir du schéma Zod
export type LoginInput = z.infer<typeof loginSchema>;