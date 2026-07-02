// src/utils/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import { Database } from './database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: async (url, options) => {
          console.group("SUPABASE REQUEST");
          console.log("URL :", url);
          console.log("METHOD :", options?.method);
          console.log("BODY :", options?.body);

          const response = await fetch(url, options);

          console.log("STATUS :", response.status);

          console.groupEnd();

          return response;
        },
      },
    })
}