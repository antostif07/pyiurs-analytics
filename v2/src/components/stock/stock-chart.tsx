import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
} from 'recharts'

const data = [
    { n: 'Milk', s: 80 },
    { n: 'Rice', s: 120 },
    { n: 'Eggs', s: 100 },
    { n: 'Soup', s: 160 },
    { n: 'Pork', s: 90 },
]

export function StockChart() {
    return (
        <div
            className="
      rounded-2xl
      bg-white
      p-6
      border
    "
        >
            <h3 className="font-semibold">

                Stock Level Status

            </h3>

            <div className="h-[260px]">

                <ResponsiveContainer>

                    <BarChart data={data}>

                        <XAxis dataKey="n" />

                        <Bar
                            dataKey="s"
                            radius={[6, 6, 0, 0]}
                            fill="#3976FF"
                        />

                    </BarChart>

                </ResponsiveContainer>

            </div>

        </div>
    )
}