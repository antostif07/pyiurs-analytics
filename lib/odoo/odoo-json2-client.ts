export type OdooDomain = Array<[string, string, unknown] | string>;

interface SearchReadParams {
  domain?: OdooDomain;
  fields?: string[];
  limit?: number;
  offset?: number;
  order?: string;
  context?: Record<string, unknown>;
}

interface ReadGroupParams {
  domain?: OdooDomain;
  fields?: string[];
  groupby?: string[];
  offset?: number;
  limit?: number;
  orderby?: string;
  lazy?: boolean;
  context?: Record<string, unknown>;
}

interface OdooErrorResponse {
  error?: string;
  error_description?: string;
  message?: string;
}

const ODOO_URL = process.env.ODOO_URL ?? "https://pyiurs.odoo.com";
const ODOO_DB = process.env.ODOO_DB ?? "pyiurs";
const ODOO_API_KEY = process.env.ODOO_API_KEY ?? "";
const ODOO_DEFAULT_LANG = process.env.ODOO_LANG ?? "fr_FR";

if (!ODOO_API_KEY) {
  throw new Error("ODOO_API_KEY manquant dans les variables d'environnement.");
}

/**
 * Fonction interne d'appel réseau sécurisée avec gestion de timeout et lecture unique de flux
 */
async function odooFetch<T>(
  model: string,
  method: string,
  body: Record<string, unknown>,
  timeoutMs = 15000
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `${ODOO_URL}/json/2/${model}/${method}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "X-Odoo-Database": ODOO_DB,
          Authorization: `Bearer ${ODOO_API_KEY}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    // ✅ EXTRACTION SÉCURISÉE : L'erreur HTTP est lue UNE SEULE FOIS comme texte
    if (!response.ok) {
      const rawText = await response.text(); // Flux consommé une seule fois
      let errorMessage = rawText;

      try {
        // Tentative de parsing du texte brut en JSON
        const errorJson = JSON.parse(rawText) as OdooErrorResponse;
        errorMessage = errorJson.error_description || errorJson.message || errorJson.error || rawText;
      } catch {
        // Si la réponse n'était pas du JSON (ex: HTML 500 Nginx), on conserve le texte brut
        errorMessage = rawText || `Erreur HTTP ${response.status}`;
      }

      throw new Error(`Odoo API Error [HTTP ${response.status}]: ${errorMessage}`);
    }

    // Succès : Lecture du JSON
    const data = await response.json();
    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Odoo API Error: La requête a expiré après ${timeoutMs}ms (Timeout).`);
    }
    throw error;
  }
}

export const odooClient = {
  async searchRead<T>(
    model: string,
    params: SearchReadParams = {}
  ): Promise<T[]> {
    return odooFetch<T[]>(model, "search_read", {
      context: { lang: ODOO_DEFAULT_LANG, ...(params.context ?? {}) },
      domain: params.domain ?? [],
      fields: params.fields ?? [],
      limit: params.limit,
      offset: params.offset,
      order: params.order,
    });
  },

  async searchCount(
    model: string,
    domain: OdooDomain = []
  ): Promise<number> {
    return odooFetch<number>(model, "search_count", { domain });
  },

  async create(
    model: string,
    valsList: Record<string, unknown>[]
  ): Promise<number[]> {
    return odooFetch<number[]>(model, "create", {
      vals_list: valsList,
    });
  },

  async write<T extends Record<string, unknown>>(
    model: string,
    ids: number[],
    values: T
  ): Promise<boolean> {
    return odooFetch<boolean>(model, "write", {
      ids,
      vals: values,
    });
  },

  async readGroup<T>(
    model: string,
    params: ReadGroupParams = {}
  ): Promise<T[]> {
    return odooFetch<T[]>(model, "read_group", {
      context: { lang: ODOO_DEFAULT_LANG, ...(params.context ?? {}) },
      domain: params.domain ?? [],
      fields: params.fields ?? [],
      groupby: params.groupby ?? [],
      offset: params.offset,
      limit: params.limit,
      orderby: params.orderby,
      lazy: params.lazy ?? true,
    });
  },
};