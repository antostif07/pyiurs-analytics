export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white min-h-screen text-black p-8 print:p-0">
      {children}
    </div>
  );
}