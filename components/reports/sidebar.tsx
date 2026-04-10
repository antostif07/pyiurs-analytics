// components/layout/Sidebar.tsx
const MenuItem = ({ icon, label = "", active = false, badge = "" }: { icon: React.ReactNode; label?: string; active?: boolean; badge?: string }) => (
  <div className={`flex items-center justify-between px-4 py-3 cursor-pointer rounded-xl transition-all ${active ? 'bg-go-purple text-white shadow-lg shadow-indigo-200' : 'text-go-text-light hover:bg-gray-50'}`}>
    <div className="flex items-center gap-3">
      <span className="text-xl">{icon}</span>
      <span className="font-medium text-sm">{label}</span>
    </div>
    {badge && <span className="bg-green-100 text-green-600 text-[10px] px-2 py-1 rounded-md font-bold uppercase">{badge}</span>}
  </div>
);

export const Sidebar = () => (
  <aside className="w-64 h-screen bg-white border-r border-gray-100 p-6 flex flex-col gap-8">
    <div className="flex items-center gap-2 px-2">
       <div className="w-8 h-8 bg-go-purple rounded-lg rotate-12 flex items-center justify-center text-white font-bold">go</div>
    </div>
    
    <nav className="flex flex-col gap-1">
      <p className="text-[10px] uppercase font-bold text-gray-400 px-4 mb-2 tracking-widest">General</p>
      <MenuItem label="Dashboard" icon="⊞" />
      <MenuItem label="Sales" icon="⟲" />
      <p className="text-[10px] uppercase font-bold text-gray-400 px-4 mt-6 mb-2 tracking-widest">Organization</p>
      <MenuItem label="Reports" icon="📊" active />
      <MenuItem label="Payroll" icon="👥" badge="Coming Soon" />
    </nav>
  </aside>
);