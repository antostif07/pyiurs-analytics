import { createClient } from '@supabase/supabase-js'
import * as bcrypt from 'bcryptjs'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// Fonction pour charger manuellement le .env.local
function loadEnvManual(): { supabaseUrl: string; supabaseKey: string } {
  const envPath = resolve(process.cwd(), '.env')
  console.log('📁 Loading from:', envPath)
  
  if (!existsSync(envPath)) {
    console.error('❌ .env.local not found at:', envPath)
    console.error('💡 Create the file in the root of your project')
    process.exit(1)
  }

  const envContent = readFileSync(envPath, 'utf8')
  const envVars: Record<string, string> = {}

  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim()
        envVars[key.trim()] = value
      }
    }
  })

  const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('\n❌ Missing required environment variables!')
    process.exit(1)
  }

  return { supabaseUrl, supabaseKey }
}

// Fonction pour formater assigned_shop
function formatAssignedShop(assignedShop: any): string[] {
  if (assignedShop === 'all') {
    return ['all']
  }
  if (Array.isArray(assignedShop)) {
    return assignedShop
  }
  return []
}

const { supabaseUrl, supabaseKey } = loadEnvManual()
const supabase = createClient(supabaseUrl, supabaseKey)

// Données des utilisateurs corrigées
const usersToMigrate = [
  {
    username: 'admin',
    password: 'Tigo1515',
    name: 'Administrateur',
    role: 'admin',
    permissions: ['all'],
    assigned_shop: ['all'] // ← Corrigé: tableau au lieu de string
  },
  {
    username: 'manager_beauty',
    password: 'BeautyManager24',
    name: 'Manager Beauty',
    role: 'manager',
    permissions: [
      '/control-revenue-beauty',
      '/control-stock-beauty',
      '/client-base-beauty'
    ],
    assigned_shop: []
  },
  {
    username: 'manager_marketing',
    password: 'martkPyiurs2',
    name: 'Marketing Manager',
    role: 'manager',
    permissions: [
      '/control-stock-beauty',
      '/control-stock-femme',
      '/client-base',
      '/client-base-beauty',
      '/parc-client'
    ],
    assigned_shop: []
  },
  {
    username: 'full_manager',
    password: 'fullManager3',
    name: 'Full Manager',
    role: 'manager',
    permissions: ['/funds'],
    assigned_shop: []
  },
  {
    username: 'manager_24',
    password: 'manager_24',
    name: 'Manager 24',
    role: 'manager',
    permissions: ['/cloture-vente'],
    assigned_shop: ['1']
  },
  {
    username: 'manager_ktm',
    password: 'manager_kmt',
    name: 'Manager KTM',
    role: 'manager',
    permissions: ['/cloture-vente'],
    assigned_shop: ['14']
  },
  {
    username: 'manager_mto',
    password: 'manager_mto',
    name: 'Manager MTO',
    role: 'manager',
    permissions: ['/cloture-vente'],
    assigned_shop: ['15']
  },
  {
    username: 'financier',
    password: 'financier123',
    name: 'Financier',
    role: 'admin',
    permissions: ['/cloture-vente'],
    assigned_shop: ['all'] // ← Corrigé: tableau au lieu de string
  }
];
// Modules à insérer
const modulesToMigrate = [
  {
    name: "KPI Manager",
    icon_name: "BarChart2",
    color: "from-blue-500 to-purple-600",
    href: "/manager-kpis",
    description: "Gestion des indicateurs de performance"
  },
  {
    name: "Suivi des Ventes Beauty",
    icon_name: "TrendingUp",
    color: "from-emerald-500 to-teal-600",
    href: "/control-revenue-beauty",
    description: "Suivi des revenus beauté"
  },
  {
    name: "Suivi du Stock Beauty",
    icon_name: "Package",
    color: "from-orange-500 to-yellow-500",
    href: "/control-stock-beauty",
    description: "Gestion du stock beauté"
  },
  {
    name: "Suivi du Stock Femme",
    icon_name: "Package",
    color: "from-yellow-500 to-teal-500",
    href: "/control-stock-femme",
    description: "Gestion du stock femme"
  },
  {
    name: "Suivi du Epargne Femme",
    icon_name: "Euro",
    color: "from-emerald-500 to-blue-500",
    href: "/suivi-epargne-femme",
    description: "Suivi de l'épargne femme"
  },
  {
    name: "Control Image Produit",
    icon_name: "Package",
    color: "from-emerald-500 to-emerald-700",
    href: "/control-product-image",
    description: "Contrôle des images produits"
  },
  {
    name: "Gestion des Clients",
    icon_name: "Users",
    color: "from-indigo-500 to-blue-700",
    href: "/client-base",
    description: "Base de données clients"
  },
  {
    name: "Gestion des Clients Beauty",
    icon_name: "Users",
    color: "from-blue-500 to-indigo-700",
    href: "/client-base-beauty",
    description: "Clients secteur beauté"
  },
  {
    name: "Parc Client",
    icon_name: "Users",
    color: "from-emerald-500 to-indigo-700",
    href: "/parc-client",
    description: "Parc client global"
  },
  {
    name: "Cloture Vente",
    icon_name: "DollarSign",
    color: "from-orange-500 to-yellow-700",
    href: "/cloture-vente",
    description: "Clôture des ventes"
  },
  {
    name: "Gestion de fonds",
    icon_name: "DollarSign",
    color: "from-emerald-500 to-yellow-700",
    href: "/funds",
    description: "Gestion des fonds"
  },
  {
    name: "Revenu Global",
    icon_name: "DollarSign",
    color: "from-indigo-500 to-yellow-700",
    href: "/revenue",
    description: "Revenu global de l'entreprise"
  },
  {
    name: "Suivi Vente agent",
    icon_name: "DollarSign",
    color: "from-indigo-500 to-yellow-700",
    href: "/suivi-vente-agent",
    description: "Performance des agents commerciaux"
  },
  {
    name: "Suivi Achat",
    icon_name: "DollarSign",
    color: "from-indigo-500 to-yellow-700",
    href: "/suivi-achats",
    description: "Suivi des achats"
  }
];

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

async function migrateModules() {
  console.log('\n📦 Starting modules migration...');
  
  let migratedCount = 0;
  let skippedCount = 0;

  for (const moduleData of modulesToMigrate) {
    try {
      // Vérifier si le module existe déjà
      const { data: existingModule, error: checkError } = await supabase
        .from('modules')
        .select('id')
        .eq('href', moduleData.href)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw checkError;
      }

      if (existingModule) {
        console.log(`   ⏭️  Module "${moduleData.name}" already exists, skipping...`);
        skippedCount++;
        continue;
      }

      // Insérer le module
      const { error } = await supabase
        .from('modules')
        .insert(moduleData);

      if (error) {
        if (error.code === '23505') {
          console.log(`   ⏭️  Module "${moduleData.name}" already exists (unique constraint), skipping...`);
          skippedCount++;
          continue;
        }
        throw error;
      }

      console.log(`   ✅ Module "${moduleData.name}" migrated successfully`);
      migratedCount++;
    } catch (error: any) {
      console.error(`   ❌ Error migrating module "${moduleData.name}":`, error.message);
    }
  }

  console.log(`📦 Modules migration completed: ${migratedCount} migrated, ${skippedCount} skipped`);
  return { migratedCount, skippedCount };
}

async function migrateUsers() {
  console.log('\n👤 Starting users migration...');
  
  let migratedCount = 0;
  let skippedCount = 0;

  for (const userData of usersToMigrate) {
    try {
      // Vérifier si l'utilisateur existe déjà
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('username', userData.username)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingUser) {
        console.log(`   ⏭️  User "${userData.username}" already exists, skipping...`);
        skippedCount++;
        continue;
      }

      // Hasher le mot de passe
      const passwordHash = await hashPassword(userData.password);
      
      // Préparer les données utilisateur (assigned_shop est déjà corrigé dans le tableau)
      const userToInsert = {
        username: userData.username,
        password_hash: passwordHash,
        name: userData.name,
        role: userData.role,
        assigned_shop: userData.assigned_shop
      };

      // Insérer l'utilisateur
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert(userToInsert)
        .select()
        .single();

      if (userError) {
        if (userError.code === '23505') {
          console.log(`   ⏭️  User "${userData.username}" already exists (unique constraint), skipping...`);
          skippedCount++;
          continue;
        }
        throw userError;
      }

      // Insérer les permissions
      if (userData.permissions.length > 0) {
        const permissionsData = userData.permissions.map(permission => ({
          user_id: newUser.id,
          permission_path: permission
        }));

        const { error: permError } = await supabase
          .from('user_permissions')
          .insert(permissionsData);

        if (permError) throw permError;
      }

      console.log(`   ✅ User "${userData.username}" migrated successfully`);
      migratedCount++;
    } catch (error: any) {
      console.error(`   ❌ Error migrating user "${userData.username}":`, error.message);
    }
  }

  console.log(`👤 Users migration completed: ${migratedCount} migrated, ${skippedCount} skipped`);
  return { migratedCount, skippedCount };
}

async function checkSupabaseConnection() {
  console.log('🔌 Testing Supabase connection...');
  try {
    const { data, error } = await supabase.from('modules').select('count', { count: 'exact', head: true });
    
    if (error) {
      if (error.code === '42P01') { // table does not exist
        console.log('   ⚠️  Tables do not exist yet (this is normal for first run)');
        return true;
      }
      throw error;
    }
    
    console.log('   ✅ Connected to Supabase successfully');
    return true;
  } catch (error: any) {
    console.error('   ❌ Failed to connect to Supabase:', error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('🚀 Starting database migration...');

    // Vérifier la connexion
    const isConnected = await checkSupabaseConnection();
    if (!isConnected) {
      console.error('\n❌ Cannot connect to Supabase. Please check your credentials.');
      process.exit(1);
    }

    console.log('\n📋 IMPORTANT: Make sure you have created the tables in Supabase SQL Editor first!');
    console.log('   Run the SQL from the previous instructions in Supabase SQL Editor\n');

    // Migrer les modules
    await migrateModules();

    // Migrer les utilisateurs
    await migrateUsers();

    console.log('\n✅ Migration completed successfully!');
    console.log('\n🎉 Next steps:');
    console.log('   1. Test login with admin account: username="admin", password="Tigo1515"');
    console.log('   2. Verify data in Supabase tables');
    console.log('   3. Check that all modules are accessible based on user permissions');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Exécuter la migration
main();