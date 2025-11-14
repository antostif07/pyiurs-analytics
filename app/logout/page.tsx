// app/logout/page.tsx
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function LogoutPage() {
  const { signOut } = useAuth();

  useEffect(() => {
    const performLogout = async () => {
      await signOut();
      // La redirection vers /login est gérée par le AuthContext
    };

    performLogout();
  }, [signOut]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Déconnexion en cours...</p>
      </div>
    </div>
  );
}