import type { LucideIcon } from 'lucide-react'

type Props = {
    title: string
    value: string
    delta: string
    icon: LucideIcon
    color?: string
}

export function StatCard({
    title,
    value,
    delta,
    icon: Icon,
    color,
}: Props) {
    return (
        <div
            className={`
      rounded-2xl
      bg-white
      p-5
      shadow-sm
      border
      ${color ?? ''}
    `}
        >
            <div className="flex justify-between">

                <div>

                    <p className="text-sm text-gray-500">
                        {title}
                    </p>

                    <h2 className="mt-3 text-3xl font-bold">
                        {value}
                    </h2>

                    <p className="mt-2 text-sm text-green-500">
                        {delta}
                    </p>

                </div>

                <div
                    className="
          h-10
          w-10
          rounded-full
          bg-blue-50
          flex
          items-center
          justify-center
        "
                >
                    <Icon size={18} />
                </div>

            </div>
        </div>
    )
}