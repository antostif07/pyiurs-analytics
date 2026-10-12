// lib/whatsapp/send.ts

export interface WhatsAppTemplateParam {
    type: "text";
    text: string;
    parameter_name?: string;
}

export interface WhatsAppTemplateComponent {
    type: "header" | "body" | "footer";
    parameters: WhatsAppTemplateParam[];
}

export interface SendTemplateArgs {
    /** Numéro E.164 (+243...) */
    to: string;
    /** Nom du template validé Meta */
    templateName: string;
    /** Code langue */
    languageCode?: string;
    /** Paramètres du body dans l'ordre du template */
    bodyParams: string[];
}

export interface SendMessageResult {
    ok: boolean;
    /** Identifiant Meta (wamid) en cas de succès */
    messageId?: string;
    /** Message d'erreur en cas d'échec */
    error?: string;
}

/** Un numéro RDC valide = 12 chiffres après le `+243` (ex: +243812345678) */
const RDC_DIGIT_COUNT = 12;

/**
 * Normalise un numéro de téléphone au format E.164 (WhatsApp-ready).
 *
 * Règles :
 *  1. Lettres "o"/"O"/"a"/"A" → remplacées par "0" (typos fréquents)
 *  2. Suppression de tout sauf chiffres et `+`
 *  3. `00XX...` → `+XX...` (notation internationale alternative)
 *  4. Si `+` présent :
 *       - Total 8-15 chiffres → accepté tel quel (E.164 valide)
 *       - Sinon → rejeté
 *  5. Si aucun `+` :
 *       - Commence par `0` → assume RDC, `+243` + reste
 *       - Commence par `243` et 12 chiffres → `+243...`
 *       - Sinon → rejeté (on ne devine pas le pays)
 *
 * @returns E.164 (`+...`) ou `null` si invalide
 */
export function formatPhoneNumber(rawPhone: string | null | undefined): string | null {
    if (!rawPhone) return null;

    // 1. Nettoyage : lettres → 0, suppression du bruit
    let phone = String(rawPhone)
        .replace(/[oOaA]/g, "0")
        .replace(/[^0-9+]/g, "")
        .trim();

    if (!phone) return null;

    // 2. Notation 00XX → +XX
    if (phone.startsWith("00")) {
        phone = "+" + phone.slice(2);
    }

    // 3. Cas avec `+` : valider E.164 directement
    if (phone.startsWith("+")) {
        const digits = phone.slice(1).replace(/\D/g, "");
        // E.164 : entre 8 et 15 chiffres après le `+`
        if (digits.length >= 8 && digits.length <= 15) {
            return "+" + digits;
        }
        return null;
    }

    // 4. Sans `+` : détecter le cas RDC
    // 4a. `0XXXXXXXXX` (10 chiffres locaux RDC)
    if (phone.startsWith("0") && phone.length === 10) {
        return "+243" + phone.slice(1);
    }

    // 4b. `243XXXXXXXXX` (12 chiffres, code pays RDC sans `+`)
    if (phone.startsWith("243") && phone.length === RDC_DIGIT_COUNT) {
        return "+" + phone;
    }

    // 4c. Numéro nu 8-15 chiffres sans code pays
    // → On refuse : on ne peut pas deviner le pays
    return null;
}

/**
 * Détecte si un numéro E.164 est un numéro RDC.
 * Utile pour l'affichage ou les statistiques.
 */
export function isRdcPhone(e164: string | null): boolean {
    return !!e164 && e164.startsWith("+243");
}

/**
 * Envoie un template WhatsApp via Meta Graph API.
 * Ne throw pas — retourne un résultat structuré.
 */
export async function sendWhatsAppTemplate({
    to,
    templateName,
    languageCode = "fr",
    bodyParams,
}: SendTemplateArgs): Promise<SendMessageResult> {
    const phoneId = process.env.WHATSAPP_PHONE_ID;
    const token = process.env.WHATSAPP_TOKEN;

    if (!phoneId || !token) {
        return { ok: false, error: "Variables WHATSAPP_PHONE_ID / WHATSAPP_TOKEN manquantes" };
    }

    const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: {
            name: templateName,
            language: { code: languageCode },
            components: [
                {
                    type: "body",
                    parameters: bodyParams.map((text) => ({ type: "text", text })),
                },
            ],
        },
    };

    try {
        const res = await fetch(
            `https://graph.facebook.com/v23.0/${phoneId}/messages`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            },
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            const errMsg =
                data?.error?.message ??
                data?.error?.error_user_msg ??
                `HTTP ${res.status}`;
            return { ok: false, error: errMsg };
        }

        return {
            ok: true,
            messageId: data?.messages?.[0]?.id,
        };
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : "Erreur réseau",
        };
    }
}