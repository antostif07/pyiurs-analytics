import {
    Bell,
    Search,
} from 'lucide-react'

export function Topbar() {
    return (
        <header
            className="
      h-[82px]
      border-b
      bg-white
      px-8
      flex
      items-center
      justify-between
    "
        >
            <div
                className="
        w-[360px]
        rounded-xl
        border
        px-4
        h-[48px]
        flex
        items-center
      "
            >
                <Search size={18} />

                <input
                    placeholder="Search..."
                    className="
          ml-3
          flex-1
          outline-none
        "
                />
            </div>

            <div className="flex gap-6 items-center">

                <Bell />

                <img
                    src="https://i.pravatar.cc/80"
                    className="
          w-10
          h-10
          rounded-full
        "
                />

            </div>

        </header>
    )
}