// ✅ Élimination de 'use client' pour optimiser les performances (RSC Statique)

export default function Footer() {
  return (
    <footer className="text-center py-6 text-xs text-muted-foreground border-t border-border mt-12">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 font-light">
        <p>
          Conçu avec ❤️ par <span className="text-primary font-medium">Ushindi</span>
        </p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
          © {new Date().getFullYear()} Pyiurs Analytics. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}