// app/components/Portal.tsx
'use client';

import { useState, useEffect, ReactNode, useRef } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: ReactNode;
}

const Portal = ({ children }: PortalProps) => {
  const portalNodeRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Cette référence garantit que nous avons toujours le même élément DOM
    // sur lequel monter le portail, même si le composant se met à jour.
    portalNodeRef.current = document.body;
    setMounted(true);

    // Fonction de nettoyage pour le démontage du composant
    return () => {
      // On ne fait rien au démontage car le document.body persiste.
      // Sauf si on voulait créer/supprimer un div spécifique.
    };
  }, []);

  // Le rendu côté serveur (SSR) de Next.js n'a pas accès à `document`.
  // On ne rend donc le portail que côté client, une fois que `document.body`
  // est disponible et que le composant est "monté".
  // `createPortal` prend deux arguments : 
  // 1. Les enfants React à rendre (votre modale).
  // 2. L'élément DOM où les "téléporter".
  return mounted && portalNodeRef.current
    ? createPortal(children, portalNodeRef.current)
    : null;
};

export default Portal;