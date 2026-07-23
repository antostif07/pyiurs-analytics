import { z } from "zod";

export const budgetSchema = z.object({
    id: z.string().optional(),
    month: z.number().min(1, "Mois invalide").max(12, "Mois invalide"),
    year: z.number().min(2020, "Année invalide").max(2035, "Année invalide"),
    shopId: z.string().min(1, "Veuillez sélectionner une boutique"),
    segment: z.enum(["Femme", "Enfant", "Beauty", "Autres"], {
        error: () => ({ message: "Veuillez sélectionner un segment valide" }),
    }),
    targetAmount: z.number().min(0, "Le montant doit être supérieur ou égal à 0"),
});

export type BudgetInput = z.infer<typeof budgetSchema>;