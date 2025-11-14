// scripts/migrate-config.ts
import { config } from 'dotenv'
import { resolve } from 'path'

// Charger le fichier .env.local
const envPath = resolve(process.cwd(), '.env')
config({ path: envPath })

// Vérifier les variables d'environnement
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes!')
  console.error('Vérifiez votre fichier .env.local:')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗')
  console.error('\nAssurez-vous que votre .env.local contient:')
  console.error('NEXT_PUBLIC_SUPABASE_URL=https://votre-project.supabase.co')
  console.error('SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role')
  process.exit(1)
}

export { supabaseUrl, supabaseKey }