import {
    LayoutDashboard,
    ShoppingCart,
    Boxes,
    Truck,
    Users,
    BarChart3,
    Settings,
    User,
} from 'lucide-react'

const items = [
    {
        label: 'Dashboard',
        icon: LayoutDashboard,
        active: true,
    },
    {
        label: 'Orders',
        icon: ShoppingCart,
    },
    {
        label: 'Inventory Management',
        icon: Boxes,
    },
    {
        label: 'Deliveries',
        icon: Truck,
    },
    {
        label: 'Customers',
        icon: Users,
    },
    {
        label: 'Reports & Analytics',
        icon: BarChart3,
    },
    {
        label: 'Settings',
        icon: Settings,
    },
    {
        label: 'My Account',
        icon: User,
    },
]

export function Sidebar() {
    return (
        <aside className="w-[260px] border-r bg-white flex flex-col">

            <div className="px-8 py-8">

                <h1 className="font-bold text-xl text-blue-600">
                    GrocerEase
                </h1>

            </div>

            <nav className="space-y-1 px-4">

                {items.map((item) => (
                    <button
                        key={item.label}
                        className={`
              w-full
              rounded-xl
              flex
              items-center
              gap-4
              px-5
              py-3
              transition
              ${item.active
                                ? 'bg-blue-50 text-blue-600'
                                : 'hover:bg-gray-50'
                            }
            `}
                    >
                        <item.icon size={18} />

                        <span>
                            {item.label}
                        </span>

                    </button>
                ))}

            </nav>

            <div className="mt-auto p-5">

                <div
                    className="
          rounded-2xl
          bg-gradient-to-r
          from-cyan-500
          to-blue-600
          p-5
          text-white
        "
                >
                    <p className="font-semibold">
                        Upgrade to Pro
                    </p>

                    <button
                        className="
            mt-4
            bg-white
            text-blue-600
            rounded-lg
            px-4
            py-2
          "
                    >
                        Upgrade
                    </button>

                </div>

                <button className="mt-8 text-gray-400">
                    Log Out
                </button>

            </div>

        </aside>
    )
}