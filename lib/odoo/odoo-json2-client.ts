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
const ODOO_DEFAULT_LANG = process.env.ODOO_LANG ?? "fr_FR"; // Prise en compte de la langue française

if (!ODOO_API_KEY) {
  throw new Error("ODOO_API_KEY manquant dans les variables d'environnement.");
}

/**
 * Fonction interne d'appel réseau avec gestion de timeout et d'extraction d'erreurs d'Odoo 19
 */
async function odooFetch<T>(
  model: string,
  method: string,
  body: Record<string, unknown>,
  timeoutMs = 15000 // Timeout défensif de 15 secondes pour l'usage en boutique
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

    // Extraction propre des codes erreurs HTTP d'Odoo 19 JSON-2
    if (!response.ok) {
      let errorMessage = "Erreur inconnue";
      try {
        const errorJson = (await response.json()) as OdooErrorResponse;
        errorMessage = errorJson.error_description || errorJson.message || errorJson.error || "Erreur de format de données";
      } catch {
        errorMessage = await response.text();
      }
      throw new Error(`Odoo API Error [HTTP ${response.status}]: ${errorMessage}`);
    }

    // L'API JSON-2 d'Odoo renvoie le résultat brut directement (non encapsulé dans un objet 'result')
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
  /**
   * search_read : Recherche et lecture d'enregistrements
   */
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

  /**
   * search_count : Compte le nombre d'enregistrements correspondant au domaine
   */
  async searchCount(
    model: string,
    domain: OdooDomain = []
  ): Promise<number> {
    return odooFetch<number>(model, "search_count", { domain });
  },

  /**
   * create : Création d'enregistrements via l'argument officiel 'vals_list'
   * @param valsList Tableau d'objets contenant les champs à initialiser
   * @returns Tableau des identifiants créés
   */
  async create(
    model: string,
    valsList: Record<string, unknown>[]
  ): Promise<number[]> {
    return odooFetch<number[]>(model, "create", {
      vals_list: valsList,
    });
  },

  /**
   * write : Modification d'un ou plusieurs enregistrements via l'argument officiel 'vals'
   */
  async write<T extends Record<string, unknown>>(
    model: string,
    ids: number[],
    values: T
  ): Promise<boolean> {
    return odooFetch<boolean>(model, "write", {
      ids,
      vals: values, // ✅ CORRIGÉ : Utilisation de la clé d'argument nommée 'vals' attendue par l'ORM d'Odoo
    });
  },

  /**
   * read_group : Agrégations de données Odoo (très utile pour la BI et les KPIs)
   */
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