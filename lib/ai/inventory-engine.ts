import {GoogleGenAI} from '@google/genai'

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GEMINI_API_KEY
});

export async function getAIStockAnalysis(data: any) {
    const prompt = `
        Tu es le Responsable des Opérations Logistiques chez Pyiurs. Ton rôle est d'analyser la dynamique des ventes pour éviter les ruptures de stock.

        DONNÉES TECHNIQUES :
        - Produit : ${data.productName}
        - Stock actuel global : ${data.currentStock} unités.
        - Historique chronologique (Ventes PoS) : ${JSON.stringify(data.history.sales)}
        - Historique des réapprovisionnements (Entrées stock) : ${JSON.stringify(data.history.restocks)}

        ANALYSE ATTENDUE (SOIS TRÈS PRÉCIS) :
        1. Analyse de Fluctuation : Ne te contente pas d'une moyenne. Regarde la courbe de vente. Y a-t-il une accélération sur les 14 derniers jours ? Y a-t-il des pics récurrents (ex: week-end) ?
        2. Diagnostic de Rupture : Calcule la date d'épuisement en tenant compte de la TENDANCE actuelle (si les ventes augmentent, le stock s'épuisera plus vite que la moyenne mathématique).
        3. Pour le stock dites 2 pièces tous les 3 jours au lieu de 0.66 piece par jour.
        4. Recommandations de Réassort :
        - Option "Flux Tendu" (Tenir 15 jours selon la tendance actuelle)
        - Option "Croissance" (Tenir 45 jours avec une marge de sécurité)
        - Option "Stockage" (Tenir 90 jours)
        
        CONSIGNES EMAIL :
        - Rédige un email humain, sans mentionner l'IA. Tu t'adresses au chargé de Supply Chain.
        - Sujet : Doit être pro et urgent (ex: "Alerte réapprovisionnement : [Nom Produit] - Rupture prévue le [Date]").
        - Corps du mail : Explique clairement la tendance (ex: "Nous remarquons une hausse de consommation depuis 10 jours..."). Utilise un tableau HTML stylisé.
        - Couleurs : Utilise le Rose (#e11d48) pour les alertes et le Noir (#111827) pour le texte principal. Fond blanc, design épuré.
        - Signature : "Arnold Bopeto - Marketing & Logistic Pyiurs".
        - Return ONLY valid JSON.
        - Do not escape single quotes.
        - Do not include markdown.

        RÉPONDRE UNIQUEMENT EN JSON :
        {
        "stockout_date": "YYYY-MM-DD",
        "burn_rate": "Ex: 2 pièces tous les 3 jours",
        "trend_analysis": "Explication de la fluctuation observée",
        "purchase_options": [
            {"label": "Dépannage", "qty": 0, "duration_days": 15},
            {"label": "Optimale", "qty": 0, "duration_days": 45},
            {"label": "Sécurité", "qty": 0, "duration_days": 90}
        ],
        "email_subject": "...",
        "email_body": "<html>...</html>"
        }
    `;

    const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
    })

    return JSON.parse(result.text!);
}