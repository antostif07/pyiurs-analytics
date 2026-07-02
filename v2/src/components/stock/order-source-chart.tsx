import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
} from 'recharts'

const data = [
    {
        name: 'Website',
        value: 40,
    },
    {
        name: 'Mobile',
        value: 35,
    },
    {
        name: 'Store',
        value: 25,
    },
]

const colors = [
    '#4F8EF7',
    '#5AE38F',
    '#A78BFA',
]

export function OrderSourceChart() {
    return (
        <div
            className="
      bg-white
      rounded-2xl
      p-6
      border
    "
        >
            <h3 className="font-semibold">
                Order Sources Overview
            </h3>

            <div className="h-[260px]">

                <ResponsiveContainer>

                    <PieChart>

                        <Pie
                            data={data}
                            innerRadius={65}
                            outerRadius={90}
                            dataKey="value"
                        >
                            {data.map((_, i) => (
                                <Cell
                                    key={i}
                                    fill={colors[i]}
                                />
                            ))}
                        </Pie>

                    </PieChart>

                </ResponsiveContainer>

            </div>

        </div>
    )
}