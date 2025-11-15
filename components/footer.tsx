import { User } from "@supabase/supabase-js";

export default function Footer({user}: {user: User|null}) {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
            <div>© 2025 Ushindi. Tous droits réservés.</div>
            <div>Connecté en tant que {user?.email}</div>
          </div>
        </div>
      </footer>
  );
}