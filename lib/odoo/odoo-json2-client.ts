// odoo-json2-client.ts

export type OdooDomain = Array<[string, string, unknown]>;

interface SearchReadParams {
  domain?: OdooDomain;
  fields?: string[];
  limit?: number;
  offset?: number;
  order?: string;
  context?: Record<string, unknown>;
}

interface OdooResponse<T> {
  result?: T;
  error?: {
    name: string;
    message: string;
    arguments: unknown[];
  };
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

const ODOO_URL = process.env.ODOO_URL ?? "https://pyiurs.odoo.com";
const ODOO_DB = process.env.ODOO_DB ?? "pyiurs";
const ODOO_API_KEY = process.env.ODOO_API_KEY ?? "";

if (!ODOO_API_KEY) {
  throw new Error("ODOO_API_KEY manquant");
}

async function odooFetch<T>(
  model: string,
  method: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await fetch(
    `${ODOO_URL}/json/2/${model}/${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Odoo-Database": ODOO_DB,
        Authorization: `Bearer ${ODOO_API_KEY}`,
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status} - ${text}`);
  }

    const data = (await response.json()) as OdooResponse<T>;

    return data as T;
}

export const odooClient = {
  /**
   * search_read typé générique
   */
  async searchRead<T>(
    model: string,
    params: SearchReadParams = {}
  ): Promise<T[]> {
    return odooFetch<T[]>(model, "search_read", {
      context: { lang: "en_US" },
      domain: params.domain ?? [],
      fields: params.fields ?? [],
      limit: params.limit,
      offset: params.offset,
      order: params.order,
    });
  },

  /**
   * search_count
   */
  async searchCount(
    model: string,
    domain: OdooDomain = []
  ): Promise<number> {
    return odooFetch<number>(model, "search_count", { domain });
  },

  /**
   * create
   */
  async create<T extends Record<string, unknown>>(
    model: string,
    values: T
  ): Promise<number> {
    return odooFetch<number>(model, "create", values);
  },

  /**
   * write
   */
  async write<T extends Record<string, unknown>>(
    model: string,
    ids: number[],
    values: T
  ): Promise<boolean> {
    return odooFetch<boolean>(model, "write", {
      ids,
      values,
    });
  },

  /**
   * read_group (agrégations)
   */
  async readGroup<T>(
    model: string,
    params: ReadGroupParams = {}
  ): Promise<T[]> {
    return odooFetch<T[]>(model, "read_group", {
      context: { lang: "en_US", ...(params.context ?? {}) },
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