import { createFileRoute } from '@tanstack/react-router'

import { AppShell } from '@/components/layout/app-shell'

import {
    ShoppingCart,
    Package,
    CircleX,
    Clock3,
} from 'lucide-react'
import { StatCard } from '#/components/stock/stat-card'
import { OrderSourceChart } from '#/components/stock/order-source-chart'
import { StockChart } from '#/components/stock/stock-chart'
import { StockTable } from '#/components/stock/stock-table'
import { TrackingCard } from '#/components/stock/tracking-card'

export const Route =
    createFileRoute('/stock/')({
        component: Dashboard,
    })

function Dashboard() {
    return (

        <AppShell>

            <div className="space-y-6">

                <h1 className="text-4xl font-bold">
                    Good Morning !
                </h1>

                <div className="grid grid-cols-4 gap-5">

                    <StatCard
                        title="Total Orders"
                        value="35,500"
                        delta="+2%"
                        icon={ShoppingCart}
                    />

                    <StatCard
                        title="Orders Completed"
                        value="20,000"
                        delta="+10%"
                        icon={Package}
                    />

                    <StatCard
                        title="Orders Cancelled"
                        value="5,000"
                        delta="-8%"
                        icon={CircleX}
                    />

                    <StatCard
                        title="Orders Pending"
                        value="10,500"
                        delta="+10%"
                        icon={Clock3}
                    />

                </div>

                <div className="grid grid-cols-2 gap-5">

                    <OrderSourceChart />

                    <TrackingCard />

                </div>

                <StockChart />

                <StockTable />

            </div>

        </AppShell>

    )
}