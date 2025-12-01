import MarketingSidebar from "./components/MartketingSidebar";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar Fixe */}
      <MarketingSidebar />

      {/* Zone de contenu principale (décalée de la largeur de la sidebar) */}
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}