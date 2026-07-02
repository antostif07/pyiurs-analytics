import { Sidebar } from './sidebar'
import { Topbar } from './topbar'

export function AppShell({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div
            className="
      h-screen
      bg-[#F5F7FA]
      flex
    "
        >
            <Sidebar />

            <div className="flex-1">

                <Topbar />

                <main className="p-8">
                    {children}
                </main>

            </div>

        </div>
    )
}